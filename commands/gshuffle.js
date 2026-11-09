const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gshuffle',
        description: 'Shuffle and randomize order of queued tracks',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const featureManager = require('../src/helpers/featureManager');
        const access = featureManager.checkAccess('shuffle', guildId);
        if (!access.allowed) {
            const isSupporterOnly = access.mode === 'supporter_only';
            const blockEmbed = new EmbedBuilder()
                .setColor(isSupporterOnly ? '#FF2E93' : '#EF4444')
                .setTitle(access.title || (isSupporterOnly ? i18n.t(guildId, 'FEATURE_SUPPORTER_TITLE') : i18n.t(guildId, 'FEATURE_MAINTENANCE_TITLE')))
                .setDescription(access.reason);
            return interaction.reply({ embeds: [blockEmbed], flags: 64 });
        }

        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || player.queue.length === 0) {
            embed.setDescription(i18n.t(guildId, 'NO_QUEUE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (player.queue.length <= 1) {
            embed.setDescription(i18n.t(guildId, 'NEED_MORE_TRACKS_SHUFFLE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.queue.shuffle();
        embed.setDescription(i18n.t(guildId, 'QUEUE_SHUFFLED'));
        return interaction.reply({ embeds: [embed] });
    }
};
