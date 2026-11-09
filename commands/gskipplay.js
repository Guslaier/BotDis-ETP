const { EmbedBuilder } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const subscriptionManager = require('../src/billing/subscriptionManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gskipplay',
        description: 'Skip current track and immediately play new query',
        options: [
            {
                name: 'query',
                type: 3, // STRING
                description: 'Song title, artist, or music URL to play now',
                required: true,
            },
        ],
    },
    run: async (client, interaction, kazagumo) => {
        const voiceChannel = interaction.member?.voice?.channel;
        const guildId = interaction.guild.id;
        const embed = new EmbedBuilder().setColor('#00FF88');

        if (!voiceChannel) {
            embed.setDescription(i18n.t(guildId, 'VOICE_JOIN_REQUIRED'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const query = interaction.options.getString('query');
        await interaction.deferReply();

        let player = kazagumo.players.get(guildId);
        if (!player) {
            player = await kazagumo.createPlayer({
                guildId: guildId,
                textId: interaction.channel.id,
                voiceId: voiceChannel.id,
                volume: settingsManager.getGuildVolume(guildId)
            });
        }

        const result = await kazagumo.search(query, {
            requester: interaction.user
        });

        if (!result.tracks.length) {
            embed.setDescription(i18n.t(guildId, 'TRACK_NOT_FOUND'));
            return interaction.followUp({ embeds: [embed] });
        }

        if (result.type === 'PLAYLIST') {
            for (let i = result.tracks.length - 1; i >= 0; i--) {
                player.queue.unshift(result.tracks[i]);
            }
            if (player.playing || player._starting) {
                player.skip();
            } else {
                player.play();
            }
            embed.setDescription(i18n.t(guildId, 'SKIPPLAY_PLAYLIST', { title: result.playlistName || 'Playlist' }));
            await interaction.followUp({ embeds: [embed] });
        } else {
            const track = result.tracks[0];
            const tierConfig = subscriptionManager.getTierConfig(guildId);
            if (!tierConfig.isSupporter && (track.duration > (tierConfig.maxSongDuration || 600) || track.isStream)) {
                const durationMin = Math.floor((track.duration || 0) / 60);
                embed.setColor('#FFD600')
                    .setTitle(i18n.t(guildId, 'SONG_TOO_LONG_TITLE'))
                    .setDescription(i18n.t(guildId, 'SONG_TOO_LONG', { duration: `${durationMin} min` }));
                return interaction.followUp({ embeds: [embed] });
            }

            player.queue.unshift(track);
            
            if (player.playing || player._starting) {
                player.skip();
            } else {
                player.play();
            }

            embed.setDescription(i18n.t(guildId, 'SKIPPLAY_TRACK', { title: track.title }));
            await interaction.followUp({ embeds: [embed] });
        }
    }
};
