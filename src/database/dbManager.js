const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '../../data');

class DatabaseManager {
    constructor() {
        this.cache = new Map();
        this._ensureDataDir();
        this._initCollections();
    }

    _ensureDataDir() {
        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
        } catch (err) {
            console.error('[DBManager] Failed to create data directory:', err.message);
        }
    }

    _initCollections() {
        const collections = ['subscriptions', 'campaigns', 'transactions', 'billingConfig', 'bannedGuilds', 'nodesConfig', 'nodesRegistry'];
        for (const col of collections) {
            const filePath = path.join(dataDir, `${col}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    this.cache.set(col, JSON.parse(content));
                } catch (err) {
                    console.error(`[DBManager] Error reading ${col}.json, attempting backup restore:`, err.message);
                    const bakPath = path.join(dataDir, `${col}.json.bak`);
                    if (fs.existsSync(bakPath)) {
                        try {
                            const bakContent = fs.readFileSync(bakPath, 'utf8');
                            this.cache.set(col, JSON.parse(bakContent));
                        } catch {
                            this.cache.set(col, {});
                        }
                    } else {
                        this.cache.set(col, {});
                    }
                }
            } else {
                this.cache.set(col, {});
                this.save(col);
            }
        }
    }

    get(collection, key) {
        const col = this.cache.get(collection);
        if (!col) return null;
        if (key === undefined) return col;
        return col[key] || null;
    }

    set(collection, key, value) {
        let col = this.cache.get(collection);
        if (!col) {
            col = {};
            this.cache.set(collection, col);
        }
        col[key] = value;
        this.save(collection);
        return value;
    }

    delete(collection, key) {
        const col = this.cache.get(collection);
        if (!col || !(key in col)) return false;
        delete col[key];
        this.save(collection);
        return true;
    }

    /**
     * Atomic write to disk using temp file and rename.
     * Prevents file corruption during unexpected shutdown.
     */
    save(collection) {
        try {
            this._ensureDataDir();
            const colData = this.cache.get(collection) || {};
            const targetPath = path.join(dataDir, `${collection}.json`);
            const tempPath = path.join(dataDir, `${collection}.json.tmp`);
            const bakPath = path.join(dataDir, `${collection}.json.bak`);

            const jsonStr = JSON.stringify(colData, null, 2);
            fs.writeFileSync(tempPath, jsonStr, 'utf8');

            if (fs.existsSync(targetPath)) {
                try {
                    fs.copyFileSync(targetPath, bakPath);
                } catch {}
            }

            fs.renameSync(tempPath, targetPath);
            return true;
        } catch (err) {
            console.error(`[DBManager] Atomic save failed for ${collection}:`, err.message);
            return false;
        }
    }
}

module.exports = new DatabaseManager();
