require('dotenv').config();
const http = require('http');
const url = require('url');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const cacheManager = require('../CacheManager');
const proxyManager = require('../helpers/proxyManager');
const youtubeCircuit = require('../helpers/youtubeCircuit');

// Clear system proxy variables so yt-dlp always uses direct residential internet when no proxy configured
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.all_proxy;
delete process.env.ALL_PROXY;

class AudioNodeServer {
    constructor() {
        this.port = parseInt(process.env.NODE_PORT || '2333', 10);
        this.id = process.env.NODE_ID || `node-${os.hostname()}`;
        this.name = process.env.NODE_NAME || `AudioNode-${this.port}`;
        this.authSecret = process.env.NODE_AUTH_SECRET || null;
        this.maxRooms = parseInt(process.env.MAX_TOTAL_STREAMS || '15', 10);
        this.activeStreams = 0;
        this.isDraining = false;
        this.server = null;
        this.lastCpuMeasure = { idle: 0, total: 0, time: Date.now() };
    }

    _getCpuUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        for (const cpu of cpus) {
            for (const type of Object.keys(cpu.times)) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }

        const now = Date.now();
        const deltaTotal = totalTick - (this.lastCpuMeasure.total || 0);
        const deltaIdle = totalIdle - (this.lastCpuMeasure.idle || 0);
        this.lastCpuMeasure = { idle: totalIdle, total: totalTick, time: now };

        let hostCpu = 0;
        if (deltaTotal > 0) {
            hostCpu = Math.max(0, Math.min(100, Math.round((1 - (deltaIdle / deltaTotal)) * 100)));
        }

        const procUsage = process.cpuUsage();
        const procPercent = ((procUsage.user + procUsage.system) / 1000 / Math.max(1, (process.uptime() * 1000))) * 100;

        return {
            host: `${hostCpu}%`,
            process: `${procPercent.toFixed(1)}%`,
            display: `${hostCpu}% (Host) • ${procPercent.toFixed(1)}% (Node)`
        };
    }

    _getSystemMemory() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        return {
            totalMb: Math.round(total / (1024 * 1024)),
            usedMb: Math.round(used / (1024 * 1024)),
            percent: Math.round((used / total) * 100)
        };
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

    _checkAuth(req) {
        if (!this.authSecret) return true;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7).trim();
            if (token === this.authSecret) return true;
        }
        const nodeSecret = req.headers['x-node-secret'];
        if (nodeSecret && nodeSecret.trim() === this.authSecret) return true;
        return false;
    }

    _sendJson(res, statusCode, data) {
        const payload = JSON.stringify(data);
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Cache-Control': 'no-cache, no-store'
        });
        res.end(payload);
    }

    async start() {
        await proxyManager.init();

        this.server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url, true);
            const pathname = parsedUrl.pathname;

            if (req.method === 'OPTIONS') {
                res.writeHead(204, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-node-secret'
                });
                return res.end();
            }

            if (!this._checkAuth(req)) {
                return this._sendJson(res, 401, { success: false, error: 'Unauthorized: Invalid NODE_AUTH_SECRET' });
            }

            // Health & basic telemetry
            if (pathname === '/' || pathname === '/api/node/health') {
                return this._sendJson(res, 200, {
                    success: true,
                    id: this.id,
                    name: this.name,
                    status: this.isDraining ? 'draining' : 'online',
                    activeRooms: this.activeStreams,
                    maxRooms: this.maxRooms,
                    uptime: process.uptime()
                });
            }

            // Full telemetry for Controller NodeRouter
            if (pathname === '/api/node/stats') {
                const cpuUsage = this._getCpuUsage();
                const sysMem = this._getSystemMemory();
                const disk = this._getDiskSpace();
                const bandwidth = this._getNetworkBandwidth();
                const cache = cacheManager.getCacheStats();
                const mem = process.memoryUsage();
                const rssMb = Math.round(mem.rss / (1024 * 1024));
                const vpnSourceIp = proxyManager.getVpnSourceIp();
                const vpnPublicIp = proxyManager.lastExitIp || null;
                const vpnServerName = typeof proxyManager.getVpnServerName === 'function' ? proxyManager.getVpnServerName() : 'Direct';
                const isVpnActive = proxyManager.vpnEnabled && !!vpnSourceIp;

                return this._sendJson(res, 200, {
                    success: true,
                    id: this.id,
                    name: this.name,
                    status: this.isDraining ? 'draining' : 'online',
                    activeRooms: this.activeStreams,
                    maxRooms: this.maxRooms,
                    activeSpawns: typeof cacheManager.getActiveSpawns === 'function' ? cacheManager.getActiveSpawns() : 0,
                    maxSpawns: cacheManager.maxConcurrentSpawns || 2,
                    queuedSpawns: typeof cacheManager.getQueuedSpawnsCount === 'function' ? cacheManager.getQueuedSpawnsCount() : 0,
                    cpu: cpuUsage.display,
                    ram: `${rssMb} MB (Node)`,
                    hostRam: `${sysMem.usedMb}/${sysMem.totalMb} MB (${sysMem.percent}%)`,
                    disk: disk,
                    bandwidth: bandwidth,
                    cache: cache,
                    circuit: {
                        isOpen: youtubeCircuit.isOpen(),
                        reason: youtubeCircuit.lastReason || null,
                        cooldownSec: Math.max(0, Math.round((youtubeCircuit.openUntil - Date.now()) / 1000)),
                        status: youtubeCircuit.isOpen() ? 'OPEN' : 'CLOSED'
                    },
                    vpn: {
                        enabled: isVpnActive,
                        server: isVpnActive ? vpnServerName : 'DIRECT',
                        exitIp: vpnPublicIp,
                        interfaceIp: vpnSourceIp
                    },
                    uptime: process.uptime()
                });
            }

            // Node Action: Clear Cache
            if (pathname === '/api/node/cache/clear' && req.method === 'POST') {
                const resClear = cacheManager.clearAllCache();
                return this._sendJson(res, 200, { success: true, ...resClear });
            }

            // Node Action: Switch VPN
            if (pathname === '/api/node/vpn/switch' && req.method === 'POST') {
                const result = await proxyManager.switchVpnServer('next');
                const newExitIp = await proxyManager.fetchPublicExitIp(4000).catch(() => null);
                return this._sendJson(res, 200, { success: true, result, newExitIp });
            }

            // Node Action: Reset Circuit Breaker
            if (pathname === '/api/node/circuit/reset' && req.method === 'POST') {
                youtubeCircuit.reset();
                return this._sendJson(res, 200, { success: true });
            }

            // Pre-cache track endpoint: /api/node/precache?uri=...&identifier=...&title=...
            if (pathname === '/api/node/precache' && req.method === 'POST') {
                const query = parsedUrl.query;
                const uri = query.uri;
                const title = query.title ? decodeURIComponent(query.title) : 'Track';
                const identifier = query.identifier || (uri ? crypto.createHash('md5').update(uri).digest('hex').slice(0, 20) : null);
                if (uri && identifier && !cacheManager.isCached(identifier)) {
                    console.log(`[AudioNode] Background pre-caching next song: "${title}" (${identifier})`);
                    cacheManager.prepareTrack({ uri, identifier, title }, true).catch(() => {});
                }
                return this._sendJson(res, 200, { success: true });
            }

            // Stream audio endpoint: /api/node/stream?uri=...&seek=0&bitrate=64k&filter=off&volume=100
            if (pathname === '/api/node/stream' && req.method === 'GET') {
                const query = parsedUrl.query;
                const uri = query.uri;
                if (!uri) {
                    return this._sendJson(res, 400, { success: false, error: 'Missing uri parameter' });
                }

                if (this.isDraining) {
                    return this._sendJson(res, 503, { success: false, error: 'Node is draining' });
                }

                const seekSeconds = parseFloat(query.seek || '0') || 0;
                const volume = parseInt(query.volume || '100', 10) || 100;
                const filter = query.filter || 'off';
                const bitrate = query.bitrate || '64k';
                const title = query.title ? decodeURIComponent(query.title) : 'Track';
                const identifier = query.identifier || crypto.createHash('md5').update(uri).digest('hex').slice(0, 20);

                this.activeStreams++;
                console.log(`[AudioNode] Stream requested: "${title}" (${uri}) (Active: ${this.activeStreams}/${this.maxRooms})`);

                let streamInstance = null;
                let isTerminated = false;

                const cleanup = () => {
                    if (isTerminated) return;
                    isTerminated = true;
                    this.activeStreams = Math.max(0, this.activeStreams - 1);
                    if (streamInstance && typeof streamInstance.kill === 'function') {
                        try { streamInstance.kill(); } catch {}
                    }
                    console.log(`[AudioNode] Stream terminated: "${title}" (${uri}) (Remaining: ${this.activeStreams})`);
                };

                req.on('close', cleanup);
                res.on('finish', cleanup);
                res.on('error', cleanup);

                try {
                    const track = { title, uri, identifier };
                    const targetPath = cacheManager.getTrackPath(identifier);

                    let spawned = null;
                    if (cacheManager.isCached(identifier)) {
                        console.log(`[AudioNode] Disk Cache HIT for "${title}" (Instant 0ms start)`);
                        spawned = cacheManager._streamFromDisk(targetPath, seekSeconds, volume, null, filter, bitrate);
                    } else {
                        spawned = await cacheManager._spawnPipedStream(
                            track,
                            uri,
                            seekSeconds,
                            volume,
                            false,
                            null,
                            filter,
                            bitrate
                        );
                        // Delay background caching by 5s so it doesn't fight live stream for initial buffer
                        if (seekSeconds === 0) {
                            setTimeout(() => {
                                if (!isTerminated && !cacheManager.isCached(identifier)) {
                                    cacheManager.prepareTrack(track, true).catch(() => {});
                                }
                            }, 5000).unref();
                        }
                    }

                    if (isTerminated) {
                        try { spawned.kill(); } catch {}
                        return;
                    }

                    streamInstance = spawned;

                    res.writeHead(200, {
                        'Content-Type': 'audio/ogg; codecs=opus',
                        'Transfer-Encoding': 'chunked',
                        'Cache-Control': 'no-cache, no-store',
                        'Connection': 'keep-alive'
                    });

                    streamInstance.pipe(res);
                } catch (err) {
                    cleanup();
                    if (!res.headersSent) {
                        return this._sendJson(res, 500, { success: false, error: err.message });
                    }
                }
                return;
            }

            // Toggle drain mode
            if (pathname === '/api/node/drain' && req.method === 'POST') {
                this.isDraining = !this.isDraining;
                return this._sendJson(res, 200, {
                    success: true,
                    status: this.isDraining ? 'draining' : 'online'
                });
            }

            // Switch VPN profile
            if (pathname === '/api/node/vpn/switch' && req.method === 'POST') {
                const switchRes = await proxyManager.switchVpnServer('next');
                const newExitIp = await proxyManager.fetchPublicExitIp(4000).catch(() => null);
                return this._sendJson(res, 200, { success: true, result: switchRes, newExitIp });
            }

            // Live update config (name, maxRooms) from Controller Web Admin
            if (pathname === '/api/node/config' && req.method === 'POST') {
                let bodyRaw = '';
                req.on('data', chunk => bodyRaw += chunk);
                req.on('end', () => {
                    try {
                        const body = JSON.parse(bodyRaw || '{}');
                        if (body.name && typeof body.name === 'string') {
                            this.name = body.name.trim();
                        }
                        if (body.maxRooms && !isNaN(parseInt(body.maxRooms, 10))) {
                            this.maxRooms = Math.max(1, parseInt(body.maxRooms, 10));
                        }
                        console.log(`[AudioNode] Config updated live: Name="${this.name}", MaxRooms=${this.maxRooms}`);
                        return this._sendJson(res, 200, {
                            success: true,
                            id: this.id,
                            name: this.name,
                            maxRooms: this.maxRooms
                        });
                    } catch (err) {
                        return this._sendJson(res, 400, { success: false, error: err.message });
                    }
                });
                return;
            }

            return this._sendJson(res, 404, { success: false, error: 'Endpoint not found' });
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            const vpnIp = proxyManager.getVpnSourceIp();
            const exitIp = proxyManager.lastExitIp || vpnIp || 'Direct';
            console.log(`=======================================================`);
            console.log(`[AudioNode] Worker Server Online on port ${this.port}`);
            console.log(`[AudioNode] ID: ${this.id} | Name: ${this.name}`);
            console.log(`[AudioNode] VPN Egress: ${proxyManager.getVpnServerName()} (Exit IP: ${exitIp})`);
            console.log(`[AudioNode] Capacity: ${this.maxRooms} streams`);
            console.log(`=======================================================`);
        });
    }
}

if (require.main === module) {
    const nodeServer = new AudioNodeServer();
    nodeServer.start().catch((err) => {
        console.error('[AudioNode] Fatal startup error:', err);
        process.exit(1);
    });
}

module.exports = AudioNodeServer;
