const { EmbedBuilder } = require('discord.js');
const { createNowPlayingCard } = require('../src/helpers/musicCardHelper');

module.exports = {
    data: {
        name: 'gnowplaying',
        description: 'Display current track player card and interactive controls',
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing) {
            embed.setDescription('❌ ตอนนี้ไม่ได้เปิดเพลงอยู่ครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const track = player.queue.current;
        if (!track) {
            embed.setDescription('❌ ไม่พบข้อมูลเพลงครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        // Delete previous card to avoid duplicate stale cards in the channel
        if (player.nowPlayingMessage) {
            try {
                await player.nowPlayingMessage.delete().catch(() => {});
            } catch {}
            player.nowPlayingMessage = null;
        }

        const cardData = createNowPlayingCard(player, track);
        const replyMsg = await interaction.reply({ ...cardData, fetchReply: true });
        player.nowPlayingMessage = replyMsg;
        return replyMsg;
    }
};
