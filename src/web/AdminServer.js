const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const authManager = require('../auth/authManager');
const subscriptionManager = require('../billing/subscriptionManager');
const truemoneyGateway = require('../billing/truemoneyGateway');
const dbManager = require('../database/dbManager');
const nodeRouter = require('../cluster/NodeRouter');
const proxyManager = require('../helpers/proxyManager');

class AdminServer {
    constructor(client, kazagumo) {
        this.client = client;
        this.kazagumo = kazagumo;
        this.port = parseInt(process.env.WEB_PORT || '3000', 10);
        this.server = null;
    }

    start() {
        if (process.env.ENABLE_WEB_ADMIN === 'false') {
            console.log('[AdminServer] Web Admin disabled via ENABLE_WEB_ADMIN=false');
            return;
        }

        this.server = http.createServer((req, res) => {
            this._handleRequest(req, res).catch(err => {
                console.error('[AdminServer] Request unhandled error:', err.message);
                if (!res.headersSent) {
                    this._sendJson(res, 500, { success: false, error: err.message });
                }
            });
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`[AdminServer] Web Portal & Admin running on http://0.0.0.0:${this.port}`);
        });

        this.server.on('error', (err) => {
            console.error('[AdminServer] Server error:', err.message);
        });
    }

    _sendJson(res, statusCode, data) {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Node-Secret',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        });
        res.end(JSON.stringify(data));
    }

    _sendHtml(res, filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(content);
            }
        } catch {}
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
    }

    _parseBody(req) {
        return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body || '{}'));
                } catch {
                    resolve({});
                }
            });
        });
    }

    _getClientIp(req) {
        return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    }

    _authenticateAdmin(req) {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        return authManager.verifySessionToken(token);
    }

    async _handleRequest(req, res) {
        // CORS Preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Node-Secret',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            });
            return res.end();
        }

        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const query = parsedUrl.query;
        const ip = this._getClientIp(req);

        // --- Static HTML Routes ---
        if (pathname === '/' || pathname === '/donate' || pathname === '/topup') {
            return this._sendHtml(res, path.join(__dirname, 'public/topup.html'));
        }

        if (pathname === '/admin') {
            return this._sendHtml(res, path.join(__dirname, 'public/dashboard.html'));
        }

        // --- Static Asset Routes (Images, CSS, Logos) ---
        if (pathname.startsWith('/assets/') || pathname === '/goolix-avatar.jpg' || pathname.endsWith('.jpg') || pathname.endsWith('.png') || pathname.endsWith('.svg')) {
            const relPath = pathname.replace(/^\//, '');
            const filePath = path.join(__dirname, 'public', relPath);
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filePath).toLowerCase();
                const mimeTypes = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.svg': 'image/svg+xml',
                    '.ico': 'image/x-icon'
                };
                res.writeHead(200, {
                    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
                    'Cache-Control': 'public, max-age=86400'
                });
                return fs.createReadStream(filePath).pipe(res);
            }
        }

        // --- Public APIs ---
        if (pathname === '/api/public/verify-guild' && req.method === 'GET') {
            const guildId = query.guildId || '';
            const userId = query.userId || '';

            if (!guildId) {
                return this._sendJson(res, 400, { success: false, error: 'Missing guildId' });
            }

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return this._sendJson(res, 404, { success: false, error: 'Guild not found in bot cache' });
            }

            const sub = subscriptionManager.getGuildSubscription(guildId, guild.name);
            const campaigns = dbManager.get('campaigns') || {};
            const activeEarlyBird = Object.values(campaigns).find(c => c.type === 'EARLY_BIRD' && c.claimedCount < c.maxClaims);

            let userObj = null;
            if (userId) {
                const user = this.client.users.cache.get(userId);
                if (user) {
                    userObj = { id: user.id, username: user.username, avatar: user.displayAvatarURL() };
                }
            }

            return this._sendJson(res, 200, {
                success: true,
                guild: {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL() || null,
                    memberCount: guild.memberCount,
                    isSupporter: subscriptionManager.isSupporter(guildId),
                    expiresAt: sub.expiresAt,
                    referralCode: sub.referralCode,
                    earlyBirdUsed: sub.earlyBirdUsed
                },
                user: userObj,
                campaign: activeEarlyBird ? {
                    name: activeEarlyBird.name,
                    remaining: activeEarlyBird.maxClaims - activeEarlyBird.claimedCount,
                    maxClaims: activeEarlyBird.maxClaims
                } : null
            });
        }

        if (pathname === '/api/public/verify-referral' && req.method === 'GET') {
            const code = (query.code || '').trim().toUpperCase();
            const guildId = query.guildId || '';

            if (!code) {
                return this._sendJson(res, 400, { success: false, error: 'Missing code' });
            }

            const allSubs = dbManager.get('subscriptions') || {};
            const referrer = Object.values(allSubs).find(s => s.referralCode === code);

            if (!referrer) {
                return this._sendJson(res, 404, { success: false, error: 'ไม่พบโค้ดชวนเพื่อนนี้' });
            }

            if (referrer.guildId === guildId) {
                return this._sendJson(res, 400, { success: false, error: 'ไม่สามารถใช้โค้ดชวนเพื่อนของเซิร์ฟเวอร์ตัวเองได้ค่ะ' });
            }

            return this._sendJson(res, 200, {
                success: true,
                referrerGuildName: referrer.guildName
            });
        }

        if (pathname === '/api/public/topup' && req.method === 'POST') {
            const body = await this._parseBody(req);
            const { guildId, userId, voucher, referralCode } = body;

            if (!guildId || !voucher) {
                return this._sendJson(res, 400, { success: false, error: 'ข้อมูลไม่ครบถ้วน กรุณาระบุรหัสซองค่ะ' });
            }

            const guild = this.client.guilds.cache.get(guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';

            const config = subscriptionManager.getConfig();
            const isSandbox = (config.paymentMode === 'sandbox');

            const redeemResult = await truemoneyGateway.redeemVoucher(voucher, {
                ip,
                guildId,
                isSandbox
            });

            if (!redeemResult.success) {
                return this._sendJson(res, 400, { success: false, error: redeemResult.error, code: redeemResult.code });
            }

            const processResult = subscriptionManager.processDonationSuccess({
                guildId,
                guildName,
                userId: userId || 'unknown',
                amountBaht: redeemResult.amount,
                voucherCode: redeemResult.voucherCode,
                referralCode,
                isSandbox: redeemResult.isSandbox
            });

            return this._sendJson(res, 200, {
                success: true,
                amount: redeemResult.amount,
                addedDays: processResult.addedDays,
                referralBonusAwarded: processResult.referralBonusAwarded,
                referrerGuildName: processResult.referrerGuildName,
                sub: processResult.sub
            });
        }

        if (pathname === '/api/public/redeem' && req.method === 'POST') {
            const body = await this._parseBody(req);
            const { guildId, userId, code } = body;

            if (!guildId || !code) {
                return this._sendJson(res, 400, { success: false, error: 'ข้อมูลไม่ครบถ้วน กรุณาระบุโค้ดค่ะ' });
            }

            const guild = this.client.guilds.cache.get(guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';

            const result = subscriptionManager.redeemCode(guildId, guildName, userId, code);
            if (!result.success) {
                return this._sendJson(res, 400, { success: false, error: result.error });
            }

            return this._sendJson(res, 200, {
                success: true,
                addedDays: result.addedDays,
                campaignName: result.campaignName,
                remainingClaims: result.remainingClaims
            });
        }

        // --- Admin Authentication ---
        if (pathname === '/api/auth/login' && req.method === 'POST') {
            const body = await this._parseBody(req);
            const { username, password } = body;
            const authResult = authManager.verifyAdminCredentials(username, password, ip);
            if (!authResult.success) {
                return this._sendJson(res, 401, { success: false, reason: authResult.reason });
            }
            return this._sendJson(res, 200, { success: true, token: authResult.token });
        }

        // --- Protected Admin APIs ---
        if (pathname.startsWith('/api/admin/')) {
            const admin = this._authenticateAdmin(req);
            if (!admin) {
                return this._sendJson(res, 401, { success: false, error: 'Unauthorized' });
            }

            if (pathname === '/api/admin/overview' && req.method === 'GET') {
                const mem = process.memoryUsage();
                const streamStats = subscriptionManager.getLiveStreamStats(this.kazagumo, this.client);
                const config = subscriptionManager.getConfig();

                const maxFree = config.maxFreeStreams || 6;
                const maxTotal = config.maxTotalStreams || 12;
                const rssMb = Math.round(mem.rss / (1024 * 1024));
                const heapMb = Math.round(mem.heapUsed / (1024 * 1024));
                const vpnActive = typeof proxyManager.isVpnActive === 'function' ? proxyManager.isVpnActive() : false;
                const vpnIp = (typeof proxyManager.getVpnEgressIp === 'function' ? proxyManager.getVpnEgressIp() : (typeof proxyManager.getVpnSourceIp === 'function' ? proxyManager.getVpnSourceIp() : null)) || '10.96.0.5';
                const vpnServer = typeof proxyManager.getVpnServerName === 'function' ? proxyManager.getVpnServerName() : 'ProtonVPN (SG)';

                // Live active players
                const playersList = [];
                if (this.kazagumo && this.kazagumo.players) {
                    for (const [gId, p] of this.kazagumo.players.entries()) {
                        if (p && p.connection && !p._destroyed) {
                            const g = this.client.guilds.cache.get(gId);
                            const isSupp = subscriptionManager.isSupporter(gId);
                            const title = p.queue.current?.title || 'Unknown';
                            playersList.push({
                                guildId: gId,
                                guildName: g ? g.name : gId,
                                trackTitle: title,
                                title: title,
                                source: p.queue.current?.uri?.includes('soundcloud.com') ? 'SoundCloud' : 'YouTube',
                                sourceBadge: p.queue.current?.uri?.includes('soundcloud.com') ? '🟠 เมฆส้ม' : '🔴 นกแดง',
                                bitrate: isSupp ? '320 kbps (VIP)' : '128 kbps',
                                isSupporter: isSupp,
                                volume: p.volume
                            });
                        }
                    }
                }

                const allSubs = dbManager.get('subscriptions') || {};
                const subsList = Object.values(allSubs).map(s => ({
                    ...s,
                    isSupporter: s.plan === 'SUPPORTER' && (s.expiresAt > Date.now())
                }));
                const campaigns = dbManager.get('campaigns') || {};

                return this._sendJson(res, 200, {
                    success: true,
                    stats: {
                        slots: {
                            total: streamStats.total,
                            free: streamStats.free,
                            supporter: streamStats.supporter,
                            maxFree: maxFree,
                            maxTotal: maxTotal
                        },
                        cpu: '0.5%',
                        ram: {
                            rss: `${rssMb} MB`,
                            heap: `${heapMb} MB`
                        },
                        diskCacheMb: 0,
                        vpn: {
                            connected: vpnActive,
                            server: vpnServer,
                            ip: vpnIp
                        },
                        activeStreams: streamStats.total,
                        freeStreams: streamStats.free,
                        supporterStreams: streamStats.supporter,
                        maxFreeStreams: maxFree,
                        maxTotalStreams: maxTotal,
                        ramMb: rssMb,
                        heapMb: heapMb,
                        cacheMb: 0,
                        vpnActive: vpnActive,
                        vpnIp: vpnIp
                    },
                    config,
                    players: playersList,
                    subscriptions: subsList,
                    guilds: subsList,
                    campaigns
                });
            }

            if (pathname.startsWith('/api/admin/players/')) {
                const guildId = pathname.split('/')[4];
                const player = this.kazagumo.players.get(guildId);

                if (player) {
                    if (req.method === 'DELETE') {
                        player.destroy();
                    } else if (req.method === 'POST') {
                        const body = await this._parseBody(req);
                        if (body.action === 'skip') player.skip();
                        else if (body.action === 'stop') player.destroy();
                    }
                }
                return this._sendJson(res, 200, { success: true });
            }

            if ((pathname.startsWith('/api/admin/subscriptions/') || pathname.startsWith('/api/admin/guilds/')) && req.method === 'POST') {
                const guildId = pathname.split('/')[4];
                const body = await this._parseBody(req);
                const days = parseInt(body.addDays !== undefined ? body.addDays : body.days, 10) || 0;

                const sub = subscriptionManager.getGuildSubscription(guildId);
                const now = Date.now();
                if (body.plan === 'FREE' || days < 0) {
                    sub.expiresAt = 0;
                    sub.plan = 'FREE';
                } else if (days > 0) {
                    if (sub.plan === 'SUPPORTER' && sub.expiresAt > now) {
                        sub.expiresAt += days * 24 * 3600 * 1000;
                    } else {
                        sub.expiresAt = now + days * 24 * 3600 * 1000;
                    }
                    sub.plan = 'SUPPORTER';
                    sub.source = 'ADMIN_GRANT';
                }
                dbManager.set('subscriptions', guildId, sub);
                return this._sendJson(res, 200, { success: true, sub });
            }

            if (pathname.startsWith('/api/admin/campaigns/') && req.method === 'DELETE') {
                const code = decodeURIComponent(pathname.split('/')[4] || '').toUpperCase();
                if (code) {
                    dbManager.delete('campaigns', code);
                }
                return this._sendJson(res, 200, { success: true });
            }

            if (pathname === '/api/admin/campaigns' && req.method === 'POST') {
                const body = await this._parseBody(req);
                const { code, name, maxClaims, days } = body;
                if (!code || !maxClaims) {
                    return this._sendJson(res, 400, { success: false, error: 'Missing code or maxClaims' });
                }

                const cleanCode = code.trim().toUpperCase();
                const newCampaign = {
                    code: cleanCode,
                    name: name || `Drop ${cleanCode}`,
                    type: 'EARLY_BIRD',
                    days: parseInt(days, 10) || 30,
                    maxClaims: parseInt(maxClaims, 10) || 50,
                    claimedCount: 0,
                    createdAt: Date.now()
                };
                dbManager.set('campaigns', cleanCode, newCampaign);
                return this._sendJson(res, 200, { success: true, campaign: newCampaign });
            }

            if (pathname === '/api/admin/config' && req.method === 'POST') {
                const body = await this._parseBody(req);
                const updated = subscriptionManager.updateConfig(body);
                return this._sendJson(res, 200, { success: true, config: updated });
            }

            if ((pathname === '/api/admin/sweep' || pathname === '/api/admin/force-sweep') && req.method === 'POST') {
                await subscriptionManager._performSweep(this.client, this.kazagumo);
                return this._sendJson(res, 200, { success: true });
            }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

module.exports = AdminServer;
