const EventEmitter = require('events');
const http = require('http');

class NodeRouter extends EventEmitter {
    constructor() {
        super();
        this.nodes = new Map();
        this._initLocalNode();
        this._initRemoteNodes();
        this._healthTimer = null;
        this._startHealthChecks();
    }

    _initLocalNode() {
        this.nodes.set('local-0', {
            id: 'local-0',
            name: 'LocalNode-0 (Controller Core)',
            type: 'local',
            host: '127.0.0.1',
            status: 'online',
            activeRooms: 0,
            maxRooms: parseInt(process.env.MAX_TOTAL_STREAMS || '12', 10),
            latency: 0,
            lastPing: Date.now(),
            vpn: null
        });
    }

    _initRemoteNodes() {
        const raw = process.env.REMOTE_NODES; // JSON or comma-separated
        if (!raw) return;
        try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                for (const node of list) {
                    if (node.id && node.host) {
                        this.nodes.set(node.id, {
                            id: node.id,
                            name: node.name || node.id,
                            type: 'remote',
                            host: node.host,
                            port: node.port || 2333,
                            status: 'offline',
                            activeRooms: 0,
                            maxRooms: node.maxRooms || 15,
                            latency: 0,
                            lastPing: 0,
                            vpn: null
                        });
                    }
                }
            }
        } catch (err) {
            console.warn('[NodeRouter] Failed to parse REMOTE_NODES config:', err.message);
        }
    }

    _startHealthChecks() {
        if (this._healthTimer) clearInterval(this._healthTimer);
        this._pollRemoteNodes();
        this._healthTimer = setInterval(() => {
            this._pollRemoteNodes();
        }, 10000);
        if (this._healthTimer.unref) this._healthTimer.unref();
    }

    _pollRemoteNodes() {
        for (const node of this.nodes.values()) {
            if (node.type === 'remote') {
                this._checkRemoteNode(node);
            }
        }
    }

    _checkRemoteNode(node) {
        const pingStart = Date.now();
        const req = http.request({
            hostname: node.host,
            port: node.port || 2333,
            path: '/api/node/stats',
            method: 'GET',
            timeout: 4000,
            headers: {
                'x-node-secret': process.env.NODE_AUTH_SECRET || ''
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        node.status = parsed.status || 'online';
                        node.activeRooms = parsed.activeRooms || 0;
                        node.maxRooms = parsed.maxRooms || node.maxRooms;
                        node.cpu = parsed.cpu || '-';
                        node.ram = parsed.ram || '-';
                        node.hostRam = parsed.hostRam || '-';
                        node.vpn = parsed.vpn || null;
                        node.latency = Date.now() - pingStart;
                        node.lastPing = Date.now();
                    } catch (e) {
                        node.status = 'offline';
                    }
                } else {
                    node.status = 'offline';
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            node.status = 'offline';
            node.latency = -1;
        });

        req.on('error', () => {
            node.status = 'offline';
            node.latency = -1;
        });

        req.end();
    }

    getNodes() {
        return Array.from(this.nodes.values());
    }

    updateLocalActiveRooms(count) {
        const local = this.nodes.get('local-0');
        if (local) {
            local.activeRooms = count;
            local.lastPing = Date.now();
        }
    }

    updateLocalStats(stats = {}) {
        const local = this.nodes.get('local-0');
        if (local) {
            if (stats.activeRooms !== undefined) local.activeRooms = stats.activeRooms;
            if (stats.maxRooms !== undefined) local.maxRooms = stats.maxRooms;
            if (stats.cpu !== undefined) local.cpu = stats.cpu;
            if (stats.ram !== undefined) local.ram = stats.ram;
            if (stats.hostRam !== undefined) local.hostRam = stats.hostRam;
            if (stats.vpn !== undefined) local.vpn = stats.vpn;
            local.lastPing = Date.now();
        }
    }

    selectBestNode(guildId, isSupporter = false) {
        const availableNodes = Array.from(this.nodes.values()).filter(n => n.status === 'online');
        if (!availableNodes.length) {
            return this.nodes.get('local-0');
        }

        // Sort by least load ratio (activeRooms / maxRooms)
        availableNodes.sort((a, b) => {
            const loadA = a.activeRooms / Math.max(1, a.maxRooms);
            const loadB = b.activeRooms / Math.max(1, b.maxRooms);
            return loadA - loadB;
        });

        return availableNodes[0];
    }

    async toggleDrain(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { success: false, error: 'Node not found' };

        if (node.type === 'remote') {
            return new Promise((resolve) => {
                const req = http.request({
                    hostname: node.host,
                    port: node.port || 2333,
                    path: '/api/node/drain',
                    method: 'POST',
                    timeout: 4000,
                    headers: {
                        'x-node-secret': process.env.NODE_AUTH_SECRET || ''
                    }
                }, (res) => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(d);
                            node.status = parsed.status;
                            resolve({ success: true, node });
                        } catch {
                            resolve({ success: false, error: 'Invalid response from remote node' });
                        }
                    });
                });
                req.on('error', (err) => resolve({ success: false, error: err.message }));
                req.end();
            });
        }

        if (node.status === 'draining') {
            node.status = 'online';
        } else {
            node.status = 'draining';
        }
        return { success: true, node };
    }

    setNodeStatus(nodeId, status) {
        const node = this.nodes.get(nodeId);
        if (!node) return { success: false, error: 'Node not found' };
        node.status = status;
        return { success: true, node };
    }
}

module.exports = new NodeRouter();
