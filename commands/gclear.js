const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gclear',
        description: 'Clear all upcoming tracks from the queue',
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription('❌ ตอนนี้ไม่มีคิวเพลงให้ล้างครับ สั่งเปิดเพลงได้เลย 🎶');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.queue.clear();
        embed.setDescription('🧹 ล้างคิวเพลงที่รออยู่ทั้งหมดเรียบร้อยแล้วครับ ✨');
        return interaction.reply({ embeds: [embed] });
    }
};
