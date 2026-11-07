const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gprevious',
        description: 'Replay the previous track that just finished',
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription('❌ ไม่มีคิวเพลงครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const hasPrev = !!(player.queue.previous || (player.previousTracks && player.previousTracks.length > 0));
        if (!hasPrev) {
            embed.setDescription('❌ ไม่มีเพลงก่อนหน้านี้ในประวัติครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.playPrevious();
        const targetTitle = player.queue.current?.title || player.queue.previous?.title || 'เพลงก่อนหน้า';
        embed.setDescription(`⏮️ กำลังย้อนกลับไปเล่นเพลง: **${targetTitle}** ครับ ⚡`);
        return interaction.reply({ embeds: [embed] });
    }
};
