const { PermissionFlagsBits } = require('discord.js');

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

    isGuildOwner(interaction) {
        if (!interaction?.guild) return false;
        return interaction.guild.ownerId === interaction.user?.id;
    }

    canUpdateCommands(interaction) {
        if (!interaction) return false;
        // 1. Bot Master Owner (super admin pass)
        if (this.isOwner(interaction.user?.id)) return true;

        // 2. Discord Server Owner (เจ้าของเซิร์ฟเวอร์ Discord)
        if (this.isGuildOwner(interaction)) return true;

        // 3. Discord Server Administrator
        if (interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;

        return false;
    }
}

module.exports = new OwnerHelper();
