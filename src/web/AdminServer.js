const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');
const authManager = require('../auth/authManager');
const subscriptionManager = require('../billing/subscriptionManager');
const truemoneyGateway = require('../billing/truemoneyGateway');
const dbManager = require('../database/dbManager');
const nodeRouter = require('../cluster/NodeRouter');
const proxyManager = require('../helpers/proxyManager');
const cacheManager = require('../CacheManager');
const youtubeCircuit = require('../helpers/youtubeCircuit');
const banManager = require('../moderation/banManager');

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
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
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

    _getCpuUsage() {
        let hostCpu = '0%';
        try {
            if (process.platform === 'linux' && fs.existsSync('/proc/stat')) {
                const line = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0];
                const parts = line.trim().split(/\s+/).slice(1).map(Number);
                const idle = parts[3] + (parts[4] || 0);
                const total = parts.reduce((a, b) => a + b, 0);
                if (this._lastHostCpu) {
                    const deltaIdle = idle - this._lastHostCpu.idle;
                    const deltaTotal = total - this._lastHostCpu.total;
                    if (deltaTotal > 0) {
                        const pct = Math.max(0, Math.min(100, Math.round(((deltaTotal - deltaIdle) / deltaTotal) * 100)));
                        hostCpu = `${pct}%`;
                    }
                }
                this._lastHostCpu = { idle, total };
            } else {
                const cpus = os.cpus();
                let idle = 0;
                let total = 0;
                for (const c of cpus) {
                    for (const t in c.times) total += c.times[t];
                    idle += c.times.idle;
                }
                if (this._lastHostCpu) {
                    const deltaIdle = idle - this._lastHostCpu.idle;
                    const deltaTotal = total - this._lastHostCpu.total;
                    if (deltaTotal > 0) {
                        const pct = Math.max(0, Math.min(100, Math.round(((deltaTotal - deltaIdle) / deltaTotal) * 100)));
                        hostCpu = `${pct}%`;
                    }
                }
                this._lastHostCpu = { idle, total };
            }
        } catch {}

        let processCpu = '0.0%';
        try {
            const now = Date.now();
            const curCpu = process.cpuUsage();
            if (this._lastProcCpu && this._lastProcTime) {
                const deltaMs = now - this._lastProcTime;
                if (deltaMs > 0) {
                    const userDiff = curCpu.user - this._lastProcCpu.user;
                    const sysDiff = curCpu.system - this._lastProcCpu.system;
                    const pct = ((userDiff + sysDiff) / (deltaMs * 1000) * 100).toFixed(1);
                    processCpu = `${Math.min(100, Math.max(0, parseFloat(pct)))}%`;
                }
            }
            this._lastProcCpu = curCpu;
            this._lastProcTime = now;
        } catch {}

        return {
            host: hostCpu,
            process: processCpu,
            display: `${hostCpu} (Host) • ${processCpu} (Node)`
        };
    }

    _getSystemMemory() {
        let totalMb = Math.round(os.totalmem() / (1024 * 1024));
        let usedMb = Math.round((os.totalmem() - os.freemem()) / (1024 * 1024));
        try {
            if (process.platform === 'linux' && fs.existsSync('/proc/meminfo')) {
                const raw = fs.readFileSync('/proc/meminfo', 'utf8');
                const totalMatch = raw.match(/MemTotal:\s+(\d+)\s+kB/);
                const availMatch = raw.match(/MemAvailable:\s+(\d+)\s+kB/);
                if (totalMatch && availMatch) {
                    const totalKb = parseInt(totalMatch[1], 10);
                    const availKb = parseInt(availMatch[1], 10);
                    totalMb = Math.round(totalKb / 1024);
                    usedMb = Math.round((totalKb - availKb) / 1024);
                }
            }
        } catch {}
        const percent = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0;
        return { totalMb, usedMb, percent };
    }

    _getDiskSpace() {
        try {
            const rootPath = process.platform === 'win32' ? process.cwd().slice(0, 3) : '/';
            if (fs.statfsSync) {
                const s = fs.statfsSync(rootPath);
                const totalBytes = Number(s.blocks) * Number(s.bsize);
                const freeBytes = Number(s.bavail) * Number(s.bsize);
                const usedBytes = totalBytes - freeBytes;
                return {
                    totalGb: (totalBytes / (1024 ** 3)).toFixed(1),
                    freeMb: Math.round(freeBytes / (1024 ** 2)),
                    usedGb: (usedBytes / (1024 ** 3)).toFixed(1),
                    percent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0
                };
            }
        } catch {}
        return { totalGb: '5.0', freeMb: 1024, usedGb: '4.0', percent: 80 };
    }

    _getNetworkBandwidth() {
        let rxBytes = 0;
        let txBytes = 0;
        try {
            if (process.platform === 'linux' && fs.existsSync('/proc/net/dev')) {
                const lines = fs.readFileSync('/proc/net/dev', 'utf8').split('\n');
                for (const line of lines) {
                    if (line.includes(':') && !line.includes('lo:')) {
                        const parts = line.split(':')[1].trim().split(/\s+/);
                        rxBytes += parseInt(parts[0], 10) || 0;
                        txBytes += parseInt(parts[8], 10) || 0;
                    }
                }
            }
        } catch {}
        const usedGb = ((rxBytes + txBytes) / (1024 ** 3)).toFixed(2);
        const txGb = (txBytes / (1024 ** 3)).toFixed(2);
        const rxGb = (rxBytes / (1024 ** 3)).toFixed(2);
        const used = parseFloat(usedGb);
        const quotaGb = 800;
        const percent = Math.min(100, Math.round((used / quotaGb) * 100));
        return {
            usedGb: used,
            txGb: parseFloat(txGb),
            rxGb: parseFloat(rxGb),
            quotaGb,
            percent
        };
    }

    _formatDuration(ms) {
        if (!ms || isNaN(ms)) return '00:00';
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

        if (pathname === '/admin' || pathname === '/dashboard' || pathname === '/dashboard.html' || pathname === '/admin.html') {
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
                const vpnExitIp = typeof proxyManager.getExitIp === 'function' ? proxyManager.getExitIp() : vpnIp;
                const vpnServer = typeof proxyManager.getVpnServerName === 'function' ? proxyManager.getVpnServerName() : 'ProtonVPN (SG)';

                const sysMem = this._getSystemMemory();
                const disk = this._getDiskSpace();
                const net = this._getNetworkBandwidth();
                const cache = cacheManager.getCacheStats();
                const dynamicVipMax = Math.max(0, maxTotal - streamStats.free);

                // Live active players with deep telemetry
                const playersList = [];
                if (this.kazagumo && this.kazagumo.players) {
                    for (const [gId, p] of this.kazagumo.players.entries()) {
                        if (p && p.connection && !p._destroyed) {
                            const g = this.client.guilds.cache.get(gId);
                            const isSupp = subscriptionManager.isSupporter(gId);
                            const title = p.queue.current?.title || 'Unknown';
                            
                            let listeners = 0;
                            try {
                                const me = g?.members?.me;
                                if (me?.voice?.channel) {
                                    listeners = me.voice.channel.members.filter(m => !m.user.bot).size;
                                }
                            } catch {}

                            const currentDuration = p.queue.current?.length || 0;
                            const currentPos = p.position || 0;
                            const isSoundCloud = p.queue.current?.uri?.includes('soundcloud.com');
                            const sourceLabel = isSoundCloud ? '🟠 เมฆส้ม' : '🔴 นกแดง';

                            playersList.push({
                                guildId: gId,
                                guildName: g ? g.name : gId,
                                trackTitle: title,
                                title: title,
                                source: sourceLabel,
                                sourceBadge: sourceLabel,
                                bitrate: isSupp ? '96 kbps (VIP)' : '64 kbps',
                                isSupporter: isSupp,
                                listeners,
                                elapsed: `${this._formatDuration(currentPos)} / ${this._formatDuration(currentDuration)}`,
                                queueLength: p.queue ? p.queue.length : 0,
                                nodeName: p.node?.name || 'LocalNode-0',
                                volume: p.volume
                            });
                        }
                    }
                }

                const allSubs = dbManager.get('subscriptions') || {};
                const guildMap = new Map();

                if (this.client && this.client.guilds && this.client.guilds.cache) {
                    for (const [id, g] of this.client.guilds.cache.entries()) {
                        const banInfo = banManager.getBanInfo(id);
                        guildMap.set(id, {
                            guildId: id,
                            guildName: g.name,
                            plan: 'FREE',
                            source: 'FREE',
                            expiresAt: 0,
                            referralCode: `REF-${id.slice(-6).toUpperCase()}`,
                            referralCount: 0,
                            cumulativePaidBaht: 0,
                            isSupporter: false,
                            isBanned: !!banInfo,
                            banInfo: banInfo || null
                        });
                    }
                }

                for (const [id, s] of Object.entries(allSubs)) {
                    const g = this.client?.guilds?.cache?.get(id);
                    const isSupp = s.plan === 'SUPPORTER' && (s.expiresAt > Date.now());
                    const banInfo = banManager.getBanInfo(id);
                    guildMap.set(id, {
                        ...s,
                        guildName: g ? g.name : (s.guildName || id),
                        isSupporter: isSupp,
                        isBanned: !!banInfo,
                        banInfo: banInfo || null
                    });
                }

                const subsList = Array.from(guildMap.values());
                const campaigns = dbManager.get('campaigns') || {};

                const allTx = dbManager.get('transactions') || {};
                const transactions = Object.values(allTx)
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                    .slice(0, 50);

                const cpuUsage = this._getCpuUsage();
                const vpnPublicIp = proxyManager.lastExitIp || null;
                const vpnSourceIp = proxyManager.getVpnSourceIp();
                const vpnServerName = typeof proxyManager.getVpnServerName === 'function' ? proxyManager.getVpnServerName() : 'Direct';
                const isVpnActive = proxyManager.vpnEnabled && !!vpnSourceIp;

                nodeRouter.updateLocalStats({
                    activeRooms: streamStats.total,
                    maxRooms: maxTotal,
                    cpu: cpuUsage.display,
                    ram: `${rssMb} MB (Node)`,
                    hostRam: `${sysMem.usedMb}/${sysMem.totalMb} MB (${sysMem.percent}%)`,
                    vpn: {
                        enabled: isVpnActive,
                        server: isVpnActive ? vpnServerName : 'DIRECT',
                        exitIp: vpnPublicIp,
                        interfaceIp: vpnSourceIp
                    }
                });

                const nodes = nodeRouter.getNodes();

                return this._sendJson(res, 200, {
                    success: true,
                    stats: {
                        slots: {
                            total: streamStats.total,
                            free: streamStats.free,
                            supporter: streamStats.supporter,
                            maxFree: maxFree,
                            maxTotal: maxTotal,
                            dynamicVipMax: dynamicVipMax
                        },
                        cpu: cpuUsage.host,
                        cpuDisplay: cpuUsage.display,
                        hostCpu: cpuUsage.host,
                        nodeCpu: cpuUsage.process,
                        hostRam: {
                            usedMb: sysMem.usedMb,
                            totalMb: sysMem.totalMb,
                            percent: sysMem.percent,
                            display: `${sysMem.usedMb} MB / ${sysMem.totalMb} MB (${sysMem.percent}%)`
                        },
                        nodeRam: {
                            rssMb,
                            heapMb,
                            display: `Node RSS: ${rssMb} MB • Heap: ${heapMb} MB`
                        },
                        disk: {
                            usedGb: disk.usedGb,
                            totalGb: disk.totalGb,
                            freeMb: disk.freeMb,
                            percent: disk.percent,
                            display: `${disk.usedGb} GB / ${disk.totalGb} GB (${disk.percent}%)`
                        },
                        bandwidth: {
                            usedGb: net.usedGb,
                            txGb: net.txGb,
                            rxGb: net.rxGb,
                            quotaGb: net.quotaGb,
                            percent: net.percent,
                            display: `${net.usedGb} GB / ${net.quotaGb} GB (${net.percent}%)`
                        },
                        cache: {
                            usedMb: cache.usedMb,
                            maxMb: cache.maxMb,
                            files: cache.files,
                            display: `${cache.usedMb} / ${cache.maxMb} MB (${cache.files} files)`
                        },
                        vpn: {
                            connected: vpnActive,
                            server: vpnServer,
                            internalIp: vpnIp,
                            publicIp: vpnPublicIp,
                            exitIp: vpnPublicIp || vpnIp,
                            display: vpnActive ? (vpnPublicIp ? `${vpnServer} • Exit: ${vpnPublicIp}` : `${vpnServer} • Active`) : 'Standby / Direct'
                        },
                        circuit: {
                            isOpen: youtubeCircuit.isOpen(),
                            reason: youtubeCircuit.lastReason || null,
                            cooldownSec: Math.max(0, Math.round((youtubeCircuit.openUntil - Date.now()) / 1000)),
                            status: youtubeCircuit.isOpen() ? 'OPEN (SoundCloud Fallback Active)' : 'CLOSED (Normal / All Good)'
                        },
                        // Backwards compatibility
                        ram: {
                            rss: `${sysMem.usedMb} MB / ${sysMem.totalMb} MB`,
                            heap: `${heapMb} MB`
                        },
                        diskCacheMb: cache.usedMb,
                        activeStreams: streamStats.total,
                        freeStreams: streamStats.free,
                        supporterStreams: streamStats.supporter,
                        maxFreeStreams: maxFree,
                        maxTotalStreams: maxTotal,
                        ramMb: sysMem.usedMb,
                        heapMb: heapMb,
                        cacheMb: cache.usedMb,
                        vpnActive: vpnActive,
                        vpnIp: vpnExitIp
                    },
                    config,
                    players: playersList,
                    subscriptions: subsList,
                    guilds: subsList,
                    bannedGuilds: banManager.getAllBannedGuilds(),
                    campaigns,
                    transactions,
                    nodes
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

            if (pathname.startsWith('/api/admin/guilds/') && pathname.endsWith('/ban') && req.method === 'POST') {
                const guildId = pathname.split('/')[4];
                const body = await this._parseBody(req);
                const guild = this.client?.guilds?.cache?.get(guildId);
                const guildName = guild ? guild.name : (body.guildName || guildId);
                const resBan = banManager.banGuild(guildId, {
                    days: body.days,
                    reason: body.reason,
                    guildName,
                    bannedBy: admin?.sub || 'admin',
                    kazagumo: this.kazagumo
                });
                return this._sendJson(res, 200, resBan);
            }

            if (pathname.startsWith('/api/admin/guilds/') && pathname.endsWith('/unban') && req.method === 'POST') {
                const guildId = pathname.split('/')[4];
                const resUnban = banManager.unbanGuild(guildId);
                return this._sendJson(res, 200, resUnban);
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
                    sub.audioFilter = 'off';
                    dbManager.set('subscriptions', guildId, sub);
                    subscriptionManager.downgradeGuildToFree(guildId, this.kazagumo);
                } else if (days > 0) {
                    if (sub.plan === 'SUPPORTER' && sub.expiresAt > now) {
                        sub.expiresAt += days * 24 * 3600 * 1000;
                    } else {
                        sub.expiresAt = now + days * 24 * 3600 * 1000;
                    }
                    sub.plan = 'SUPPORTER';
                    sub.source = 'ADMIN_GRANT';
                    dbManager.set('subscriptions', guildId, sub);
                } else {
                    dbManager.set('subscriptions', guildId, sub);
                }
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
                    claimedGuilds: [],
                    createdAt: Date.now()
                };
                dbManager.set('campaigns', cleanCode, newCampaign);
                return this._sendJson(res, 200, { success: true, campaign: newCampaign });
            }

            if (pathname === '/api/admin/config' && req.method === 'POST') {
                const body = await this._parseBody(req);
                const maxFree = parseInt(body.maxFreeStreams, 10);
                const maxTotal = parseInt(body.maxTotalStreams, 10);
                const price = parseInt(body.price30Days, 10);

                if (isNaN(maxFree) || isNaN(maxTotal) || maxFree < 0 || maxTotal < 1) {
                    return this._sendJson(res, 400, { success: false, error: 'ตัวเลขโควต้าต้องเป็นจำนวนเต็มบวกค่ะ' });
                }
                if (maxFree > maxTotal) {
                    return this._sendJson(res, 400, { success: false, error: 'โควตาสตรีมสายฟรี (Max Free Streams) ต้องไม่มากกว่าโควตาสตรีมรวม (Max Total Streams) ค่ะ' });
                }
                if (!isNaN(price) && price < 0) {
                    return this._sendJson(res, 400, { success: false, error: 'ราคาต้องไม่ติดลบค่ะ' });
                }

                const updated = subscriptionManager.updateConfig({
                    paymentMode: body.paymentMode || 'sandbox',
                    price30Days: isNaN(price) ? 29 : price,
                    maxFreeStreams: maxFree,
                    maxTotalStreams: maxTotal
                });
                return this._sendJson(res, 200, { success: true, config: updated });
            }

            if (pathname === '/api/admin/vpn/switch' && req.method === 'POST') {
                const result = await proxyManager.switchVpnServer('next');
                const newExitIp = await proxyManager.fetchPublicExitIp(4000).catch(() => null);
                return this._sendJson(res, 200, { success: true, result, newExitIp });
            }

            if (pathname === '/api/admin/cache/clear' && req.method === 'POST') {
                const resClear = cacheManager.clearAllCache();
                return this._sendJson(res, 200, { success: true, ...resClear });
            }

            if (pathname.startsWith('/api/admin/nodes/') && pathname.endsWith('/drain') && req.method === 'POST') {
                const nodeId = pathname.split('/')[4];
                const resDrain = await nodeRouter.toggleDrain(nodeId);
                return this._sendJson(res, 200, resDrain);
            }

            if (pathname.startsWith('/api/admin/nodes/') && pathname.endsWith('/config') && req.method === 'POST') {
                const nodeId = pathname.split('/')[4];
                const body = await this._parseBody(req);
                const resConfig = await nodeRouter.updateNodeConfig(nodeId, {
                    name: body.name,
                    maxRooms: body.maxRooms
                });
                return this._sendJson(res, resConfig.success ? 200 : 400, resConfig);
            }

            if (pathname === '/api/admin/circuit/reset' && req.method === 'POST') {
                youtubeCircuit.reset();
                return this._sendJson(res, 200, { success: true });
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
