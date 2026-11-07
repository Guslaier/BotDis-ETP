const https = require('https');
const dbManager = require('../database/dbManager');

class TrueMoneyGateway {
    constructor() {
        this.cooldowns = new Map(); // key -> lastTimestamp
        this.queue = Promise.resolve();
    }

    _extractVoucherCode(input) {
        if (!input || typeof input !== 'string') return '';
        const trimmed = input.trim();
        const match = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        return trimmed;
    }

    checkCooldown(ip, guildId) {
        const now = Date.now();
        const ipKey = `ip:${ip || 'unknown'}`;
        const guildKey = `guild:${guildId || 'unknown'}`;

        const lastIp = this.cooldowns.get(ipKey) || 0;
        const lastGuild = this.cooldowns.get(guildKey) || 0;

        if (now - lastIp < 10000) {
            return { limited: true, retryAfter: Math.ceil((10000 - (now - lastIp)) / 1000) };
        }
        if (now - lastGuild < 10000) {
            return { limited: true, retryAfter: Math.ceil((10000 - (now - lastGuild)) / 1000) };
        }

        this.cooldowns.set(ipKey, now);
        this.cooldowns.set(guildKey, now);
        return { limited: false };
    }

    async redeemVoucher(voucherInput, options = {}) {
        let ip = null;
        let guildId = null;
        let isSandbox = false;
        if (typeof options === 'string') {
            ip = options;
            guildId = arguments[2];
        } else if (options && typeof options === 'object') {
            ip = options.ip;
            guildId = options.guildId;
            isSandbox = options.isSandbox;
        }

        const cd = this.checkCooldown(ip, guildId);
        if (cd.limited) {
            return { success: false, code: 'COOLDOWN', error: `กรุณารอสักครู่ (${cd.retryAfter} วินาที) ก่อนทำรายการใหม่อีกครั้งครับ` };
        }

        const voucherCode = this._extractVoucherCode(voucherInput);
        if (!voucherCode || !/^[a-zA-Z0-9_-]{6,64}$/.test(voucherCode)) {
            return { success: false, code: 'INVALID_FORMAT', error: 'รูปแบบรหัสซองของขวัญไม่ถูกต้อง กรุณาตรวจสอบลิงก์ซองอีกครั้งครับ' };
        }

        // Check duplicate voucher in database
        const transactions = dbManager.get('transactions') || {};
        const isDuplicate = Object.values(transactions).some(t => t.voucherCode === voucherCode);
        if (isDuplicate) {
            return { success: false, code: 'DUPLICATE_VOUCHER', error: 'ซองของขวัญนี้ถูกใช้งานในระบบไปแล้วครับ' };
        }

        // Sandbox check
        if (isSandbox || voucherCode.startsWith('TEST') || voucherCode.includes('sandbox')) {
            return this._handleSandbox(voucherCode);
        }

        // Production redeem via TrueMoney Official Voucher API
        return new Promise((resolve) => {
            this.queue = this.queue.then(() => {
                return this._executeProductionRedeem(voucherCode).then(resolve);
            }).catch((err) => {
                resolve({ success: false, code: 'SYSTEM_ERROR', error: err.message });
            });
        });
    }

    _handleSandbox(voucherCode) {
        let amount = 29;
        const testMatch = voucherCode.match(/^TEST(\d+)$/i);
        if (testMatch) {
            amount = parseInt(testMatch[1], 10) || 29;
        } else if (voucherCode.includes('10')) {
            amount = 10;
        } else if (voucherCode.includes('50')) {
            amount = 50;
        }

        return {
            success: true,
            isSandbox: true,
            amount,
            voucherCode,
            senderName: 'Sandbox Donor',
            timestamp: Date.now()
        };
    }

    _executeProductionRedeem(voucherCode) {
        return new Promise((resolve) => {
            const config = dbManager.get('billingConfig') || {};
            const phoneNumber = config.phoneNumber || process.env.TMW_PHONE_NUMBER || '';

            if (!phoneNumber || phoneNumber.length < 9) {
                return resolve({
                    success: false,
                    code: 'WALLET_CONFIG_ERROR',
                    error: 'ระบบยังไม่ได้ตั้งค่าเบอร์ TrueMoney รับเงิน กรุณาแจ้งแอดมินครับ'
                });
            }

            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
            const postData = JSON.stringify({
                mobile: cleanPhone,
                voucher_hash: voucherCode
            });

            const reqOptions = {
                hostname: 'gift.truemoney.com',
                port: 443,
                path: `/campaign/vouchers/${voucherCode}/redeem`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            };

            const req = https.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.status && parsed.status.code === 'SUCCESS') {
                            const voucher = parsed.data?.voucher || {};
                            const myTicket = (parsed.data?.tickets || []).find(t => t.mobile === cleanPhone);
                            const amountStr = myTicket ? myTicket.amount_baht : voucher.amount_baht;
                            const amount = parseFloat(amountStr) || 0;

                            return resolve({
                                success: true,
                                isSandbox: false,
                                amount,
                                voucherCode,
                                senderName: voucher.member?.name || 'Supporter',
                                timestamp: Date.now()
                            });
                        }

                        const code = parsed.status?.code || 'UNKNOWN';
                        let message = 'ไม่สามารถรับซองของขวัญได้';

                        switch (code) {
                            case 'VOUCHER_OUT_OF_STOCK':
                                message = 'ซองของขวัญนี้ถูกรับไปหมดแล้วครับ';
                                break;
                            case 'VOUCHER_EXPIRED':
                                message = 'ซองของขวัญนี้หมดอายุแล้วครับ';
                                break;
                            case 'VOUCHER_NOT_FOUND':
                                message = 'ไม่พบซองของขวัญนี้ หรือลิงก์ไม่ถูกต้อง';
                                break;
                            case 'CANNOT_GET_OWN_VOUCHER':
                                message = 'ไม่สามารถรับซองของขวัญที่สร้างจากเบอร์ของระบบได้ครับ';
                                break;
                            case 'TARGET_USER_REDEEMED':
                                message = 'เบอร์นี้ได้รับเงินจากซองนี้ไปแล้วครับ';
                                break;
                            default:
                                message = parsed.status?.message || 'ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
                        }

                        return resolve({ success: false, code, error: message });
                    } catch (parseErr) {
                        return resolve({ success: false, code: 'PARSE_ERROR', error: 'ไม่สามารถประมวลผลคำตอบจาก TrueMoney ได้' });
                    }
                });
            });

            req.on('error', (err) => {
                resolve({ success: false, code: 'NETWORK_ERROR', error: `เชื่อมต่อ TrueMoney ไม่สำเร็จ: ${err.message}` });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, code: 'TIMEOUT', error: 'การเชื่อมต่อไปยัง TrueMoney หมดเวลา กรุณาลองใหม่' });
            });

            req.write(postData);
            req.end();
        });
    }
}

module.exports = new TrueMoneyGateway();
