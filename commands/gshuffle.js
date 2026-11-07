const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gshuffle',
        description: 'Shuffle and randomize order of queued tracks',
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription('❌ ไม่มีคิวเพลงครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (player.queue.length <= 1) {
            embed.setDescription('⚠️ ต้องมีเพลงในคิวมากกว่า 1 เพลงขึ้นไปจึงจะสามารถสุ่มคิวได้ครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.queue.shuffle();
        embed.setDescription('🔀 สุ่มลำดับคิวเพลงใหม่เรียบร้อยแล้วครับ 🎲✨');
        return interaction.reply({ embeds: [embed] });
    }
};
