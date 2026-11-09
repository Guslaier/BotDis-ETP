const https = require('https');
const QRCode = require('qrcode');
const dbManager = require('../database/dbManager');

class SlipOKGateway {
    constructor() {
        this.cooldowns = new Map();
    }

    getConfig() {
        const billingConfig = dbManager.get('billingConfig') || {};
        const target = process.env.PROMPTPAY_TARGET || billingConfig.promptpayTarget || '';
        let masked = '140-********* -xxx';
        if (target && target.length >= 10) {
            masked = target.slice(0, 3) + '-********* -' + target.slice(-3);
        }
        return {
            branchId: process.env.SLIPOK_BRANCH_ID || billingConfig.slipokBranchId || '',
            apiKey: process.env.SLIPOK_API_KEY || billingConfig.slipokApiKey || '',
            promptpayTarget: target,
            accountName: process.env.PROMPTPAY_ACCOUNT_NAME || billingConfig.promptpayAccountName || 'PromptPay Supporter',
            accountMasked: masked,
            expectedAmount: billingConfig.price30Days || 29
        };
    }

    _crc16(data) {
        let crc = 0xFFFF;
        for (let i = 0; i < data.length; i++) {
            let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xFF;
            x ^= x >> 4;
            crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    generatePromptPayPayload(target, amount) {
        const clean = (target || '').replace(/[^0-9]/g, '');
        let tag29 = '';
        if (clean.length === 15) {
            tag29 = '0016A000000677010111' + '0315' + clean;
        } else if (clean.length === 10) {
            const mobile = '0066' + clean.slice(1);
            tag29 = '0016A000000677010111' + '0113' + mobile;
        } else {
            tag29 = '0016A000000677010111' + '0213' + clean;
        }

        const amtStr = Number(amount || 29).toFixed(2);
        const tag54 = '54' + String(amtStr.length).padStart(2, '0') + amtStr;
        const raw = '000201' + '010212' + '29' + String(tag29.length).padStart(2, '0') + tag29 + '5303764' + tag54 + '5802TH' + '6304';
        return raw + this._crc16(raw);
    }

    async getPromptPayQR(amount) {
        const config = this.getConfig();
        const amt = amount || config.expectedAmount || 29;
        const payload = this.generatePromptPayPayload(config.promptpayTarget, amt);
        const qrDataUrl = await QRCode.toDataURL(payload, {
            margin: 2,
            width: 320,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return {
            success: true,
            payload,
            qrDataUrl,
            amount: amt,
            accountName: config.accountName,
            accountMasked: config.accountMasked
        };
    }

    checkCooldown(ip, guildId) {
        const now = Date.now();
        const ipKey = `ip:${ip || 'unknown'}`;
        const guildKey = `guild:${guildId || 'unknown'}`;

        const lastIp = this.cooldowns.get(ipKey) || 0;
        const lastGuild = this.cooldowns.get(guildKey) || 0;

        if (now - lastIp < 5000) {
            return { limited: true, retryAfter: Math.ceil((5000 - (now - lastIp)) / 1000) };
        }
        if (now - lastGuild < 5000) {
            return { limited: true, retryAfter: Math.ceil((5000 - (now - lastGuild)) / 1000) };
        }

        this.cooldowns.set(ipKey, now);
        this.cooldowns.set(guildKey, now);
        return { limited: false };
    }

    async verifySlip(slipInput, options = {}) {
        const config = this.getConfig();
        const expectedAmount = options.amount || config.expectedAmount || 29;

        if (!slipInput || typeof slipInput !== 'string') {
            return { success: false, code: 'INVALID_INPUT', error: 'ไม่พบข้อมูลสลิป กรุณาแนบไฟล์รูปสลิปให้ถูกต้องครับ' };
        }

        // Check if slipInput is raw QR string or image (base64 / url)
        const postBody = {
            log: true,
            amount: expectedAmount
        };

        if (slipInput.startsWith('data:image') || slipInput.length > 500) {
            postBody.files = slipInput;
        } else if (slipInput.startsWith('http')) {
            postBody.url = slipInput;
        } else {
            postBody.data = slipInput;
        }

        const postData = JSON.stringify(postBody);

        return new Promise((resolve) => {
            const req = https.request({
                hostname: 'api.slipok.com',
                port: 443,
                path: `/api/line/apikey/${config.branchId}`,
                method: 'POST',
                headers: {
                    'x-authorization': config.apiKey,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 15000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.success && parsed.data) {
                            const d = parsed.data;
                            return resolve({
                                success: true,
                                amount: d.amount || expectedAmount,
                                transRef: d.transRef,
                                senderName: d.sender?.displayName || d.sender?.name || 'Supporter',
                                receivingBank: d.receivingBank,
                                sendingBank: d.sendingBank,
                                transTimestamp: d.transTimestamp || Date.now(),
                                raw: d
                            });
                        }

                        // Map SlipOK error codes to friendly Thai messages
                        const code = parsed.code || 'UNKNOWN';
                        let message = parsed.message || 'การตรวจสอบสลิปไม่สำเร็จ';

                        switch (code) {
                            case 1007:
                                message = 'รูปภาพที่แนบไม่มี QR Code สลิปธนาคาร กรุณาใช้สลิปที่มี QR ชัดเจนครับ';
                                break;
                            case 1008:
                                message = 'QR Code ในภาพไม่ใช่ QR ตรวจสลิปการโอนเงินของธนาคารครับ';
                                break;
                            case 1009:
                                message = 'สลิปนี้ไม่สามารถอ่านข้อมูลได้ หรือภาพไม่ชัดเจน กรุณาลองใหม่อีกครั้ง';
                                break;
                            case 1010:
                            case 1012:
                                message = 'สลิปนี้ถูกใช้งานในระบบไปแล้ว ไม่สามารถใช้ซ้ำได้ครับ';
                                break;
                            case 1013:
                                message = `ยอดเงินในสลิปไม่ตรงกับยอดที่กำหนด (ต้องการ ${expectedAmount} บาท)`;
                                break;
                            case 1014:
                                message = 'ข้อมูลบัญชีผู้รับเงินในสลิปไม่ตรงกับบัญชีของระบบ';
                                break;
                            default:
                                if (parsed.message) message = parsed.message;
                        }

                        return resolve({ success: false, code, error: message });
                    } catch (err) {
                        return resolve({ success: false, code: 'PARSE_ERROR', error: 'ไม่สามารถประมวลผลคำตอบจากระบบตรวจสลิปได้' });
                    }
                });
            });

            req.on('error', (err) => {
                resolve({ success: false, code: 'NETWORK_ERROR', error: `เชื่อมต่อ SlipOK ไม่สำเร็จ: ${err.message}` });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, code: 'TIMEOUT', error: 'การตรวจสอบสลิปใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง' });
            });

            req.write(postData);
            req.end();
        });
    }
}

module.exports = new SlipOKGateway();
