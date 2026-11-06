const EventEmitter = require('events');

class NodeRouter extends EventEmitter {
    constructor() {
        super();
        this.nodes = new Map();
        this._initLocalNode();
        this._initRemoteNodes();
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
            lastPing: Date.now()
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
                            lastPing: 0
                        });
                    }
                }
            }
        } catch (err) {
            console.warn('[NodeRouter] Failed to parse REMOTE_NODES config:', err.message);
        }
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

    selectBestNode(guildId, isSupporter = false) {
        const availableNodes = Array.from(this.nodes.values()).filter(n => n.status === 'online');
        if (!availableNodes.length) {
            return this.nodes.get('local-0');
        }

        // Sort by least load (activeRooms / maxRooms)
        availableNodes.sort((a, b) => {
            const loadA = a.activeRooms / Math.max(1, a.maxRooms);
            const loadB = b.activeRooms / Math.max(1, b.maxRooms);
            return loadA - loadB;
        });

        return availableNodes[0];
    }

    toggleDrain(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { success: false, error: 'Node not found' };
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
