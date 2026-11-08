const { EmbedBuilder } = require('discord.js');
const lyricsHelper = require('../src/helpers/lyricsHelper');
const featureManager = require('../src/helpers/featureManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'glyrics',
        description: 'Search and display lyrics for currently playing track',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const access = featureManager.checkAccess('lyrics', guildId);
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
        await interaction.deferReply();

        try {
            const data = await lyricsHelper.getLyrics(track);

            if (!data || !data.lyrics) {
                embed.setDescription(i18n.t(guildId, 'LYRICS_NOT_FOUND', { title: track.title }));
                return interaction.followUp({ embeds: [embed] });
            }

            let lyrics = data.lyrics;
            if (lyrics.length > 4000) {
                lyrics = lyrics.substring(0, 3995) + '...';
            }

            embed.setTitle(i18n.t(guildId, 'LYRICS_TITLE', { title: data.title || track.title }))
                 .setDescription(lyrics)
                 .setFooter({ text: i18n.t(guildId, 'LYRICS_SOURCE', { source: data.source }) });

            return interaction.followUp({ embeds: [embed] });

        } catch (error) {
            console.error('[LyricsCommand] Error:', error.message);
            embed.setDescription(i18n.t(guildId, 'LYRICS_ERROR'));
            return interaction.followUp({ embeds: [embed] });
        }
    }
};
