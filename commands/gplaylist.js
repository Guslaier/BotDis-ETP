const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const subscriptionManager = require('../src/billing/subscriptionManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gplaylist',
        description: 'Load full playlist from YouTube or SoundCloud into queue',
        options: [
            {
                name: 'query',
                type: 3, // STRING
                description: 'Playlist URL or search query',
                required: true,
            },
            {
                name: 'limit',
                type: 4, // INTEGER
                description: 'Maximum tracks to import into queue (Free: 1-5, Supporter: 1-25)',
                required: false,
                min_value: 1,
                max_value: 25,
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

        const host = subscriptionManager.getPublicWebUrl();
        const donateUrl = `${host}/donate?guild=${guildId}&guildId=${guildId}&userId=${interaction.user.id}`;
        const donateRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(i18n.t(guildId, 'DONATE_BTN_LABEL'))
                .setStyle(ButtonStyle.Link)
                .setURL(donateUrl)
        );

        // 1. Slot Guard Check
        const slotCheck = subscriptionManager.checkStreamSlot(guildId, kazagumo, client);
        if (!slotCheck.allowed) {
            let msg = slotCheck.message;
            if (slotCheck.reason === 'FREE_SLOTS_FULL') {
                msg = i18n.t(guildId, 'SLOTS_FULL', { current: slotCheck.current, max: slotCheck.max });
            } else if (slotCheck.reason === 'CLUSTER_FULL') {
                msg = i18n.t(guildId, 'CLUSTER_FULL');
            }
            embed.setColor('#FFD600')
                .setTitle(i18n.t(guildId, 'SLOTS_FULL_TITLE'))
                .setDescription(msg);
            return interaction.reply({ embeds: [embed], components: [donateRow] });
        }

        const tierConfig = subscriptionManager.getTierConfig(interaction.guild.id);
        const maxPlaylistAllowed = tierConfig.isSupporter ? 25 : 5;
        const requestedLimit = interaction.options.getInteger('limit');
        const limit = requestedLimit ? Math.min(requestedLimit, maxPlaylistAllowed) : maxPlaylistAllowed;
        const query = interaction.options.getString('query');
        await interaction.deferReply();

        let player = kazagumo.players.get(interaction.guild.id);
        if (!player) {
            player = await kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: voiceChannel.id,
                volume: settingsManager.getGuildVolume(interaction.guild.id)
            });
        }

        const result = await kazagumo.search(query, {
            requester: interaction.user,
            forcePlaylist: true,
            limit
        });

        if (!result.tracks.length) {
            embed.setDescription(i18n.t(guildId, 'PLAYLIST_NOT_FOUND'));
            return interaction.followUp({ embeds: [embed] });
        }

        const addedTracks = [];
        let skippedOver30Min = 0;

        for (const track of result.tracks) {
            if (addedTracks.length >= maxPlaylistAllowed) break;
            if (player.queue.length + addedTracks.length >= tierConfig.maxQueue) break;

            if (!tierConfig.isSupporter && (track.duration > 1800 || track.isStream)) {
                skippedOver30Min++;
                continue;
            }
            addedTracks.push(track);
            player.queue.add(track);
        }

        let desc = `📋 **${result.playlistName || 'Playlist'}**\n\n${i18n.t(guildId, 'PLAYLIST_ADDED')} (${addedTracks.length} tracks)`;
        if (!tierConfig.isSupporter) {
            desc += `\n*(${i18n.t(guildId, 'PLAYLIST_LIMIT_FREE')})*`;
        }
        if (requestedLimit && requestedLimit > maxPlaylistAllowed) {
            desc += `\n${i18n.t(guildId, 'PLAYLIST_LIMIT_WARNING', { limit: maxPlaylistAllowed })}`;
        }
        if (skippedOver30Min > 0) {
            desc += `\n${i18n.t(guildId, 'PLAYLIST_SKIPPED_30MIN', { count: skippedOver30Min })}`;
        }
        if (player.queue.length >= tierConfig.maxQueue) {
            desc += `\n*(${i18n.t(guildId, 'QUEUE_LIMIT_FREE')})*`;
        }

        embed.setDescription(desc);
        await interaction.followUp({ embeds: [embed] });

        if (!player.playing && !player._starting && !player.paused) {
            try {
                await player.play();
            } catch (error) {
                console.error('[gplaylist] Play error:', error.message);
                return interaction.followUp({ content: i18n.t(guildId, 'PLAY_ERROR'), flags: 64 });
            }
        }
    }
};
