const { EmbedBuilder } = require('discord.js');
const { createNowPlayingCard } = require('../src/helpers/musicCardHelper');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gnowplaying',
        description: 'Display current track player card and interactive controls',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing) {
            embed.setDescription(i18n.t(guildId, 'NOW_PLAYING_NOT_PLAYING'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const track = player.queue.current;
        if (!track) {
            embed.setDescription(i18n.t(guildId, 'NO_TRACK_INFO'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        // Delete previous card to avoid duplicate stale cards in the channel
        if (player.nowPlayingMessage) {
            try {
                await player.nowPlayingMessage.delete().catch(() => {});
            } catch {}
            player.nowPlayingMessage = null;
        }

        if (player._repositionTimeout) {
            clearTimeout(player._repositionTimeout);
            player._repositionTimeout = null;
        }

        const cardData = createNowPlayingCard(player, track);
        const replyMsg = await interaction.reply({ ...cardData, fetchReply: true });
        player.nowPlayingMessage = replyMsg;
        player.messagesSinceCard = 0;
        player.lastRepositionAt = Date.now();
        return replyMsg;
    }
};
