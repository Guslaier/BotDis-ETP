const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');
const featureManager = require('../src/helpers/featureManager');

module.exports = {
    data: {
        name: 'gseek',
        description: 'Seek to a specific timestamp in current track',
        options: [
            {
                name: 'time',
                type: 3, // STRING
                description: 'Timestamp to seek to (e.g. 01:30 or seconds)',
                required: true,
            },
        ],
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const access = featureManager.checkAccess('seek', guildId);
        if (!access.allowed) {
            const isSupporterOnly = access.mode === 'supporter_only';
            const blockEmbed = new EmbedBuilder()
                .setColor(isSupporterOnly ? '#FF2E93' : '#EF4444')
                .setTitle(access.title || (isSupporterOnly ? i18n.t(guildId, 'FEATURE_SUPPORTER_TITLE') : i18n.t(guildId, 'FEATURE_MAINTENANCE_TITLE')))
                .setDescription(access.reason);
            return interaction.reply({ embeds: [blockEmbed], flags: 64 });
        }

        const timeInput = interaction.options.getString('time');
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        let timeMs = 0;
        if (timeInput.includes(':')) {
            const parts = timeInput.split(':').map(Number);
            if (parts.length === 2) {
                timeMs = (parts[0] * 60 + parts[1]) * 1000;
            } else if (parts.length === 3) {
                timeMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
            }
        } else {
            timeMs = Number(timeInput) * 1000;
        }

        if (isNaN(timeMs) || timeMs < 0) {
            embed.setDescription(i18n.t(guildId, 'SEEK_INVALID_TIME'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (player.queue.current.length > 0 && timeMs > player.queue.current.length) {
            embed.setDescription(i18n.t(guildId, 'SEEK_TOO_FAR'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        await interaction.deferReply();
        await player.seek(timeMs);
        embed.setDescription(i18n.t(guildId, 'SEEK_SUCCESS', { time: timeInput }));
        return interaction.followUp({ embeds: [embed] });
    }
};
