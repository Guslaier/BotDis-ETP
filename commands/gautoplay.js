const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const subscriptionManager = require('../src/billing/subscriptionManager');
const featureManager = require('../src/helpers/featureManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gautoplay')
        .setDescription('Toggle smart continuous autoplay when queue ends (Supporter)'),

    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const access = featureManager.checkAccess('autoplay', guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!access.allowed) {
            settingsManager.setGuildAutoplay(guildId, false);
            const player = kazagumo.players.get(guildId);
            if (player) {
                player.autoplay = false;
                player._preloadedAutoplayTrack = null;
                if (player._autoplayPreloadTimer) {
                    clearTimeout(player._autoplayPreloadTimer);
                    player._autoplayPreloadTimer = null;
                }
            }
            const isSupporterOnly = access.mode === 'supporter_only';
            embed.setColor(isSupporterOnly ? '#FF2E93' : '#EF4444')
                .setTitle(access.title || (isSupporterOnly ? i18n.t(guildId, 'FEATURE_SUPPORTER_TITLE') : i18n.t(guildId, 'FEATURE_MAINTENANCE_TITLE')))
                .setDescription(access.reason);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const player = kazagumo.players.get(guildId);

        let newStatus;
        if (player) {
            player.autoplay = !player.autoplay;
            newStatus = player.autoplay;
            settingsManager.setGuildAutoplay(player.guildId, newStatus);
            if (player.nowPlayingMessage && player.queue?.current) {
                try {
                    const { createNowPlayingCard } = require('../src/helpers/musicCardHelper');
                    const cardData = createNowPlayingCard(player, player.queue.current);
                    await player.nowPlayingMessage.edit(cardData).catch(() => {});
                } catch {}
            }
        } else {
            const current = settingsManager.getGuildAutoplay(guildId);
            newStatus = settingsManager.setGuildAutoplay(guildId, !current);
        }

        embed.setDescription(i18n.t(guildId, newStatus ? 'AUTOPLAY_ENABLED' : 'AUTOPLAY_DISABLED'));
        return interaction.reply({ embeds: [embed] });
    }
};
