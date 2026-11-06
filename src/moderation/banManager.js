const dbManager = require('../database/dbManager');

class BanManager {
    constructor() {
        this.collection = 'bannedGuilds';
    }

    isGuildBanned(guildId) {
        return !!this.getBanInfo(guildId);
    }

    getBanInfo(guildId) {
        if (!guildId) return null;
        const allBans = dbManager.get(this.collection) || {};
        const ban = allBans[guildId];
        if (!ban) return null;

        const now = Date.now();
        if (!ban.isPermanent && ban.expiresAt && ban.expiresAt <= now) {
            dbManager.delete(this.collection, guildId);
            return null;
        }
        return ban;
    }

    banGuild(guildId, options = {}) {
        if (!guildId) return { success: false, error: 'Missing guildId' };
        const days = parseInt(options.days, 10);
        const reason = (options.reason || 'Violation of Bot Rules').trim();
        const guildName = options.guildName || guildId;
        const bannedBy = options.bannedBy || 'admin';
        const now = Date.now();

        const isPermanent = isNaN(days) || days <= 0;
        const expiresAt = isPermanent ? 0 : now + (days * 24 * 3600 * 1000);

        const record = {
            guildId,
            guildName,
            reason,
            bannedAt: now,
            expiresAt,
            isPermanent,
            bannedBy
        };

        dbManager.set(this.collection, guildId, record);

        if (options.kazagumo && options.kazagumo.players) {
            const player = options.kazagumo.players.get(guildId);
            if (player) {
                try {
                    player.destroy();
                } catch (e) {
                    console.error('[BanManager] Error destroying banned player:', e.message);
                }
            }
        }

        console.log(`[BanManager] Guild ${guildName} (${guildId}) BANNED by ${bannedBy}. Duration: ${isPermanent ? 'Permanent' : days + ' days'}. Reason: ${reason}`);
        return { success: true, ban: record };
    }

    unbanGuild(guildId) {
        if (!guildId) return { success: false, error: 'Missing guildId' };
        dbManager.delete(this.collection, guildId);
        console.log(`[BanManager] Guild ${guildId} UNBANNED.`);
        return { success: true };
    }

    getAllBannedGuilds() {
        const allBans = dbManager.get(this.collection) || {};
        const now = Date.now();
        const list = [];
        for (const [id, ban] of Object.entries(allBans)) {
            if (!ban.isPermanent && ban.expiresAt && ban.expiresAt <= now) {
                dbManager.delete(this.collection, id);
            } else {
                list.push(ban);
            }
        }
        return list;
    }
}

module.exports = new BanManager();
