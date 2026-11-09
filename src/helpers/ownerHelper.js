const MASTER_OWNER_ID = '640276519603929103';

class OwnerHelper {
    constructor() {
        this.masterOwnerId = MASTER_OWNER_ID;
    }

    getOwnerIds() {
        const envIds = (process.env.OWNER_IDS || '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);
        const set = new Set([this.masterOwnerId, ...envIds]);
        return Array.from(set);
    }

    isOwner(userId) {
        if (!userId) return false;
        const idStr = String(userId).trim();
        return this.getOwnerIds().includes(idStr);
    }
}

module.exports = new OwnerHelper();
