require('dotenv').config();
const http = require('http');
const url = require('url');
const os = require('os');
const cacheManager = require('../CacheManager');
const proxyManager = require('../helpers/proxyManager');

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
                    cpu: cpuUsage.display,
                    ram: `${rssMb} MB (Node)`,
                    hostRam: `${sysMem.usedMb}/${sysMem.totalMb} MB (${sysMem.percent}%)`,
                    vpn: {
                        enabled: isVpnActive,
                        server: isVpnActive ? vpnServerName : 'DIRECT',
                        exitIp: vpnPublicIp,
                        interfaceIp: vpnSourceIp
                    },
                    uptime: process.uptime()
                });
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

                this.activeStreams++;
                console.log(`[AudioNode] Stream requested: ${uri} (Active: ${this.activeStreams}/${this.maxRooms})`);

                let streamInstance = null;
                let isTerminated = false;

                const cleanup = () => {
                    if (isTerminated) return;
                    isTerminated = true;
                    this.activeStreams = Math.max(0, this.activeStreams - 1);
                    if (streamInstance && typeof streamInstance.kill === 'function') {
                        try { streamInstance.kill(); } catch {}
                    }
                    console.log(`[AudioNode] Stream terminated: ${uri} (Remaining: ${this.activeStreams})`);
                };

                req.on('close', cleanup);
                res.on('finish', cleanup);
                res.on('error', cleanup);

                try {
                    const track = { title: 'RemoteStream', uri };
                    streamInstance = await cacheManager._spawnPipedStream(
                        track,
                        uri,
                        seekSeconds,
                        volume,
                        false,
                        null,
                        filter,
                        bitrate
                    );

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
