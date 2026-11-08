const EventEmitter = require('events');
const http = require('http');
const dbManager = require('../database/dbManager');

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
        const overrides = dbManager.get('nodesConfig') || {};
        const override = overrides['local-0'];
        const billingConfig = dbManager.get('billingConfig', 'config') || {};
        const maxRooms = override?.maxRooms || billingConfig.maxTotalStreams || parseInt(process.env.MAX_TOTAL_STREAMS || '4', 10);
        const maxFreeRooms = override?.maxFreeRooms !== undefined ? override.maxFreeRooms : (billingConfig.maxFreeStreams || parseInt(process.env.MAX_FREE_STREAMS || '2', 10));

        this.nodes.set('local-0', {
            id: 'local-0',
            name: override?.name || 'LocalNode-0 (Controller Core)',
            type: 'local',
            host: '127.0.0.1',
            status: 'online',
            activeRooms: 0,
            activeFreeRooms: 0,
            activeSupporterRooms: 0,
            maxRooms: maxRooms,
            maxFreeRooms: Math.min(maxFreeRooms, maxRooms),
            latency: 0,
            lastPing: Date.now(),
            vpn: null
        });
    }

    _initRemoteNodes() {
        const registry = dbManager.get('nodesRegistry') || {};
        const overrides = dbManager.get('nodesConfig') || {};

        // If nodesRegistry is empty, bootstrap/seed from process.env.REMOTE_NODES
        if (Object.keys(registry).length === 0 && process.env.REMOTE_NODES) {
            try {
                let raw = process.env.REMOTE_NODES.trim();
                if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
                    raw = raw.slice(1, -1).trim();
                }
                if (raw.includes('\\"')) {
                    raw = raw.replace(/\\"/g, '"');
                }
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    for (const node of list) {
                        if (node.host) {
                            const port = parseInt(node.port || '2333', 10);
                            const id = node.id || `remote-${String(node.host).replace(/[^a-zA-Z0-9]/g, '-')}-${port}`;
                            const maxRooms = node.maxRooms || 15;
                            const maxFreeRooms = node.maxFreeRooms !== undefined ? node.maxFreeRooms : maxRooms;
                            const nodeRecord = {
                                id: id,
                                name: node.name || id,
                                type: 'remote',
                                host: node.host,
                                port: port,
                                maxRooms: maxRooms,
                                maxFreeRooms: maxFreeRooms,
                                createdAt: Date.now()
                            };
                            dbManager.set('nodesRegistry', id, nodeRecord);
                            registry[id] = nodeRecord;
                        }
                    }
                }
            } catch (err) {
                console.warn('[NodeRouter] Failed to bootstrap nodes from REMOTE_NODES:', err.message);
            }
        }

        // Initialize active nodes map from persistent registry
        for (const [id, node] of Object.entries(registry)) {
            if (node && node.host) {
                const port = parseInt(node.port || '2333', 10);
                const override = overrides[id];
                const maxRooms = override?.maxRooms || node.maxRooms || 15;
                const maxFreeRooms = override?.maxFreeRooms !== undefined ? override.maxFreeRooms : (node.maxFreeRooms !== undefined ? node.maxFreeRooms : maxRooms);
                this.nodes.set(id, {
                    id: id,
                    name: override?.name || node.name || id,
                    type: 'remote',
                    host: node.host,
                    port: port,
                    status: 'offline',
                    activeRooms: 0,
                    activeFreeRooms: 0,
                    activeSupporterRooms: 0,
                    maxRooms: maxRooms,
                    maxFreeRooms: Math.min(maxFreeRooms, maxRooms),
                    latency: 0,
                    lastPing: 0,
                    vpn: null
                });
            }
        }
    }

    async addNode(data = {}) {
        const host = (data.host || '').trim();
        const port = parseInt(data.port || '2333', 10);
        const name = (data.name || '').trim();
        const maxRooms = Math.max(1, parseInt(data.maxRooms || '15', 10));
        let maxFreeRooms = data.maxFreeRooms !== undefined ? parseInt(data.maxFreeRooms, 10) : maxRooms;
        if (isNaN(maxFreeRooms) || maxFreeRooms < 0) maxFreeRooms = maxRooms;
        maxFreeRooms = Math.min(maxFreeRooms, maxRooms);

        if (!host) {
            return { success: false, error: 'Host or IP address is required' };
        }
        if (isNaN(port) || port < 1 || port > 65535) {
            return { success: false, error: 'Invalid port number' };
        }

        const id = data.id || `remote-${String(host).replace(/[^a-zA-Z0-9]/g, '-')}-${port}`;
        if (this.nodes.has(id)) {
            return { success: false, error: `Node with ID "${id}" already exists` };
        }

        const nodeObj = {
            id: id,
            name: name || id,
            type: 'remote',
            host: host,
            port: port,
            status: 'offline',
            activeRooms: 0,
            activeFreeRooms: 0,
            activeSupporterRooms: 0,
            maxRooms: maxRooms,
            maxFreeRooms: maxFreeRooms,
            latency: 0,
            lastPing: 0,
            vpn: null,
            createdAt: Date.now()
        };

        // Persist to database
        dbManager.set('nodesRegistry', id, {
            id: nodeObj.id,
            name: nodeObj.name,
            type: 'remote',
            host: nodeObj.host,
            port: nodeObj.port,
            maxRooms: nodeObj.maxRooms,
            maxFreeRooms: nodeObj.maxFreeRooms,
            createdAt: nodeObj.createdAt
        });

        // Add to active memory
        this.nodes.set(id, nodeObj);

        // Immediately test ping and fetch stats
        this._checkRemoteNode(nodeObj);

        console.log(`[NodeRouter] Hot-plugged new AudioNode: "${nodeObj.name}" (${nodeObj.host}:${nodeObj.port})`);
        return { success: true, node: nodeObj };
    }

    async removeNode(nodeId) {
        if (!nodeId || nodeId === 'local-0') {
            return { success: false, error: 'Cannot delete local controller core node' };
        }

        const node = this.nodes.get(nodeId);
        if (!node) {
            return { success: false, error: 'Node not found' };
        }

        // Delete from active memory
        this.nodes.delete(nodeId);

        // Delete from persistent database
        dbManager.delete('nodesRegistry', nodeId);
        dbManager.delete('nodesConfig', nodeId);

        console.log(`[NodeRouter] Removed AudioNode: "${node.name}" (${nodeId})`);
        return { success: true, nodeId };
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
                        const overrides = dbManager.get('nodesConfig') || {};
                        const override = overrides[node.id];

                        node.status = parsed.status || 'online';
                        node.activeRooms = parsed.activeRooms || 0;

                        // Auto-adopt worker's reported name and maxRooms if not overridden by web admin
                        if (override?.name) {
                            node.name = override.name;
                        } else if (parsed.name) {
                            node.name = parsed.name;
                        }

                        if (override?.maxRooms) {
                            node.maxRooms = override.maxRooms;
                        } else if (parsed.maxRooms) {
                            node.maxRooms = parsed.maxRooms;
                        }

                        if (override?.maxFreeRooms !== undefined) {
                            node.maxFreeRooms = override.maxFreeRooms;
                        } else if (parsed.maxFreeRooms !== undefined) {
                            node.maxFreeRooms = parsed.maxFreeRooms;
                        } else if (node.maxFreeRooms === undefined) {
                            node.maxFreeRooms = node.maxRooms;
                        }

                        node.cpu = parsed.cpu || '-';
                        node.ram = parsed.ram || '-';
                        node.hostRam = parsed.hostRam || '-';
                        node.vpn = parsed.vpn || null;
                        node.disk = parsed.disk || null;
                        node.bandwidth = parsed.bandwidth || null;
                        node.cache = parsed.cache || null;
                        node.circuit = parsed.circuit || null;
                        node.activeSpawns = parsed.activeSpawns || 0;
                        node.maxSpawns = parsed.maxSpawns || 2;
                        node.queuedSpawns = parsed.queuedSpawns || 0;
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
            const overrides = dbManager.get('nodesConfig') || {};
            const override = overrides['local-0'];

            if (stats.activeRooms !== undefined) local.activeRooms = stats.activeRooms;
            if (stats.activeFreeRooms !== undefined) local.activeFreeRooms = stats.activeFreeRooms;
            if (stats.activeSupporterRooms !== undefined) local.activeSupporterRooms = stats.activeSupporterRooms;
            local.maxRooms = override?.maxRooms || stats.maxRooms || local.maxRooms;
            local.maxFreeRooms = override?.maxFreeRooms !== undefined ? override.maxFreeRooms : (local.maxFreeRooms ?? local.maxRooms);
            if (stats.cpu !== undefined) local.cpu = stats.cpu;
            if (stats.ram !== undefined) local.ram = stats.ram;
            if (stats.hostRam !== undefined) local.hostRam = stats.hostRam;
            if (stats.vpn !== undefined) local.vpn = stats.vpn;
            if (stats.disk !== undefined) local.disk = stats.disk;
            if (stats.bandwidth !== undefined) local.bandwidth = stats.bandwidth;
            if (stats.cache !== undefined) local.cache = stats.cache;
            if (stats.circuit !== undefined) local.circuit = stats.circuit;
            if (stats.activeSpawns !== undefined) local.activeSpawns = stats.activeSpawns;
            if (stats.maxSpawns !== undefined) local.maxSpawns = stats.maxSpawns;
            if (stats.queuedSpawns !== undefined) local.queuedSpawns = stats.queuedSpawns;
            local.lastPing = Date.now();
        }
    }

    async clearNodeCache(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { success: false, error: 'Node not found' };

        if (node.type === 'remote') {
            return new Promise((resolve) => {
                const req = http.request({
                    hostname: node.host,
                    port: node.port || 2333,
                    path: '/api/node/cache/clear',
                    method: 'POST',
                    timeout: 4000,
                    headers: { 'x-node-secret': process.env.NODE_AUTH_SECRET || '' }
                }, (res) => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => {
                        try { resolve(JSON.parse(d)); } catch { resolve({ success: res.statusCode === 200 }); }
                    });
                });
                req.on('error', (err) => resolve({ success: false, error: err.message }));
                req.end();
            });
        }

        const cacheManager = require('../CacheManager');
        return { success: true, ...cacheManager.clearAllCache() };
    }

    async switchNodeVpn(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { success: false, error: 'Node not found' };

        if (node.type === 'remote') {
            return new Promise((resolve) => {
                const req = http.request({
                    hostname: node.host,
                    port: node.port || 2333,
                    path: '/api/node/vpn/switch',
                    method: 'POST',
                    timeout: 4000,
                    headers: { 'x-node-secret': process.env.NODE_AUTH_SECRET || '' }
                }, (res) => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => {
                        try { resolve(JSON.parse(d)); } catch { resolve({ success: res.statusCode === 200 }); }
                    });
                });
                req.on('error', (err) => resolve({ success: false, error: err.message }));
                req.end();
            });
        }

        const proxyManager = require('../helpers/proxyManager');
        const result = await proxyManager.switchVpnServer('next');
        const newExitIp = await proxyManager.fetchPublicExitIp(4000).catch(() => null);
        if (result && result.ok) {
            const youtubeCircuit = require('../helpers/youtubeCircuit');
            youtubeCircuit.reset();
        }
        return { success: true, result, newExitIp };
    }

    async resetNodeCircuit(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { success: false, error: 'Node not found' };

        if (node.type === 'remote') {
            return new Promise((resolve) => {
                const req = http.request({
                    hostname: node.host,
                    port: node.port || 2333,
                    path: '/api/node/circuit/reset',
                    method: 'POST',
                    timeout: 4000,
                    headers: { 'x-node-secret': process.env.NODE_AUTH_SECRET || '' }
                }, (res) => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => {
                        try { resolve(JSON.parse(d)); } catch { resolve({ success: res.statusCode === 200 }); }
                    });
                });
                req.on('error', (err) => resolve({ success: false, error: err.message }));
                req.end();
            });
        }

        const youtubeCircuit = require('../helpers/youtubeCircuit');
        youtubeCircuit.reset();
        return { success: true };
    }

    getClusterCapacity() {
        let clusterMaxTotal = 0;
        let clusterMaxFree = 0;
        let clusterOnlineNodes = 0;
        let clusterTotalNodes = 0;

        for (const node of this.nodes.values()) {
            clusterTotalNodes++;
            const isEligible = node.status === 'online' || node.type === 'local';
            if (isEligible) {
                clusterOnlineNodes++;
                const maxRooms = node.maxRooms || 0;
                const maxFree = node.maxFreeRooms !== undefined ? node.maxFreeRooms : maxRooms;
                clusterMaxTotal += maxRooms;
                clusterMaxFree += maxFree;
            }
        }

        return {
            clusterMaxTotal: Math.max(1, clusterMaxTotal),
            clusterMaxFree: Math.max(0, clusterMaxFree),
            clusterSupporterReserved: Math.max(0, clusterMaxTotal - clusterMaxFree),
            onlineNodes: clusterOnlineNodes,
            totalNodes: clusterTotalNodes
        };
    }

    selectBestNode(guildId, isSupporter = false) {
        const availableNodes = Array.from(this.nodes.values()).filter(n => n.status === 'online');
        if (!availableNodes.length) {
            return this.nodes.get('local-0');
        }

        // Prioritize online nodes based on Supporter VIP vs Free slot allocation
        availableNodes.sort((a, b) => {
            const aFreeMax = a.maxFreeRooms !== undefined ? a.maxFreeRooms : a.maxRooms;
            const bFreeMax = b.maxFreeRooms !== undefined ? b.maxFreeRooms : b.maxRooms;

            const aHasCapacity = isSupporter
                ? (a.activeRooms < a.maxRooms)
                : (a.activeRooms < a.maxRooms && (a.activeFreeRooms || 0) < aFreeMax);

            const bHasCapacity = isSupporter
                ? (b.activeRooms < b.maxRooms)
                : (b.activeRooms < b.maxRooms && (b.activeFreeRooms || 0) < bFreeMax);

            if (aHasCapacity && !bHasCapacity) return -1;
            if (!aHasCapacity && bHasCapacity) return 1;

            if (a.type !== b.type) {
                return a.type === 'remote' ? -1 : 1;
            }

            const loadA = a.activeRooms / Math.max(1, a.maxRooms);
            const loadB = b.activeRooms / Math.max(1, b.maxRooms);
            if (loadA !== loadB) return loadA - loadB;

            // Balance by spawn queue pressure if active rooms ratio is equal
            const spawnPressureA = (a.activeSpawns || 0) / Math.max(1, a.maxSpawns || 2);
            const spawnPressureB = (b.activeSpawns || 0) / Math.max(1, b.maxSpawns || 2);
            if (spawnPressureA !== spawnPressureB) return spawnPressureA - spawnPressureB;

            return (a.latency || 0) - (b.latency || 0);
        });

        return availableNodes[0];
    }

    async updateNodeConfig(nodeId, config = {}) {
        const node = this.nodes.get(nodeId);
        if (!node) return { success: false, error: 'Node not found' };

        if (config.name && typeof config.name === 'string') {
            node.name = config.name.trim();
        }
        if (config.maxRooms !== undefined && !isNaN(parseInt(config.maxRooms, 10))) {
            node.maxRooms = Math.max(1, parseInt(config.maxRooms, 10));
        }
        if (config.maxFreeRooms !== undefined && !isNaN(parseInt(config.maxFreeRooms, 10))) {
            node.maxFreeRooms = Math.min(Math.max(0, parseInt(config.maxFreeRooms, 10)), node.maxRooms);
        } else if (node.maxFreeRooms === undefined || node.maxFreeRooms > node.maxRooms) {
            node.maxFreeRooms = node.maxRooms;
        }

        // Persist to database
        const allOverrides = dbManager.get('nodesConfig') || {};
        allOverrides[nodeId] = {
            name: node.name,
            maxRooms: node.maxRooms,
            maxFreeRooms: node.maxFreeRooms,
            updatedAt: Date.now()
        };
        dbManager.save('nodesConfig');

        // If remote worker and online, broadcast update live without blocking response
        if (node.type === 'remote' && node.status === 'online') {
            try {
                const payload = JSON.stringify({
                    name: node.name,
                    maxRooms: node.maxRooms,
                    maxFreeRooms: node.maxFreeRooms
                });
                const req = http.request({
                    hostname: node.host,
                    port: node.port || 2333,
                    path: '/api/node/config',
                    method: 'POST',
                    timeout: 2000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload),
                        'x-node-secret': process.env.NODE_AUTH_SECRET || ''
                    }
                }, (res) => {
                    res.resume();
                });
                req.on('timeout', () => req.destroy());
                req.on('error', () => {});
                req.write(payload);
                req.end();
            } catch {}
        }

        return { success: true, node };
    }

    async toggleDrain(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { success: false, error: 'Node not found' };

        // Prevent draining if this is the only online node in the cluster
        if (node.status !== 'draining') {
            const onlineCount = Array.from(this.nodes.values()).filter(n => n.status === 'online').length;
            if (onlineCount <= 1) {
                return {
                    success: false,
                    error: 'ไม่สามารถเปิดโหมด Drain ได้เนื่องจากมีโหนดออนไลน์เหลือเพียง 1 โหนดในคลัสเตอร์ (At least 1 node must remain online)'
                };
            }
        }

        if (node.type === 'remote') {
            if (node.status === 'offline') {
                return { success: false, error: 'Cannot toggle drain on offline node' };
            }
            return new Promise((resolve) => {
                const req = http.request({
                    hostname: node.host,
                    port: node.port || 2333,
                    path: '/api/node/drain',
                    method: 'POST',
                    timeout: 3000,
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
                req.on('timeout', () => {
                    req.destroy();
                    resolve({ success: false, error: 'Remote node request timed out' });
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
