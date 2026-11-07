const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gstop',
        description: 'Stop playback, clear queue, and leave voice channel',
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription('❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.destroy();
        embed.setDescription('🛑 ปิดสเตจเรียบร้อยครับ ล้างคิวและหยุดเพลงทั้งหมดแล้ว ไว้เจอกันใหม่นะครับ 👋');
        return interaction.reply({ embeds: [embed] });
    }
};
