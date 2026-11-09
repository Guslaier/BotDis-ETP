const { EmbedBuilder } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gvolume',
        description: 'Adjust or view stage playback volume (0-150)',
        default_member_permissions: '8',
        options: [
            {
                name: 'amount',
                type: 4, // INTEGER
                description: 'Volume level 0-150 (Leave empty to view current)',
                required: false,
            }
        ]
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const featureManager = require('../src/helpers/featureManager');
        const access = featureManager.checkAccess('volume', guildId);
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

        const amount = interaction.options.getInteger('amount');
        if (amount === null) {
            const currentVolume = player ? player.volume : settingsManager.getGuildVolume(guildId);
            embed.setDescription(i18n.t(guildId, 'VOLUME_CURRENT', { volume: currentVolume }));
            return interaction.reply({ embeds: [embed] });
        }

        let volume = amount;
        if (volume < 0) volume = 0;
        if (volume > 150) volume = 150;

        settingsManager.setGuildVolume(guildId, volume);

        if (player) {
            player.setVolume(volume);
            if (player.nowPlayingMessage && player.queue?.current) {
                try {
                    const { createNowPlayingCard } = require('../src/helpers/musicCardHelper');
                    const cardData = createNowPlayingCard(player, player.queue.current);
                    await player.nowPlayingMessage.edit(cardData).catch(() => {});
                } catch {}
            }
        }

        if (volume === 0) {
            embed.setDescription(i18n.t(guildId, 'VOLUME_MUTED'));
        } else {
            embed.setDescription(i18n.t(guildId, 'VOLUME_SET', { volume }));
        }

        return interaction.reply({ embeds: [embed] });
    }
};
