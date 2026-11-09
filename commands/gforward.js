const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { formatDuration } = require('../src/helpers/musicCardHelper');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gforward')
        .setDescription('Fast-forward playback by specified seconds')
        .addIntegerOption(opt =>
            opt.setName('seconds')
                .setDescription('Number of seconds to fast-forward (e.g. 10, 30)')
                .setRequired(true)
                .setMinValue(1)
        ),

    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const featureManager = require('../src/helpers/featureManager');
        const access = featureManager.checkAccess('seek', guildId);
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

        if (!player || !player.playing || !player.queue.current) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const track = player.queue.current;
        if (track.isStream) {
            embed.setDescription(i18n.t(guildId, 'CANNOT_SEEK_LIVE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const seconds = interaction.options.getInteger('seconds');
        const currentPos = player.position || 0;
        const newPos = currentPos + (seconds * 1000);
        const maxDuration = track.length || 0;

        if (maxDuration > 0 && newPos >= maxDuration) {
            embed.setDescription(i18n.t(guildId, 'SEEK_EXCEED_DURATION', { duration: formatDuration(maxDuration) }));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        await player.seek(newPos);
        embed.setDescription(i18n.t(guildId, 'SEEK_FORWARD_SUCCESS', {
            seconds,
            pos: formatDuration(newPos)
        }));
        return interaction.reply({ embeds: [embed] });
    }
};
