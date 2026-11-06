const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gskip',
        description: 'ข้ามเพลงที่กำลังเล่นอยู่',
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || (!player.playing && !player._starting)) {
            embed.setDescription('❌ อ๊ะ! ไม่มีเพลงที่กำลังเล่นอยู่ค่ะ จะให้ดีเจข้ามความว่างเปล่าเหรอคะ? 😅');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.skip();
        const nextTitle = player.queue.current?.title || 'เพลงถัดไป';
        embed.setDescription(`⏭️ จัดไปค่ะ! ข้ามเพลงนี้แล้ว กำลังเตรียมเล่น: **${nextTitle}** ค่ะ 💅✨`);
        return interaction.reply({ embeds: [embed] });
    }
};
