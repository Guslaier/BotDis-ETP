const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gpause',
        description: 'Pause current music playback',
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing) {
            embed.setDescription('❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (player.paused) {
            embed.setDescription('⚠️ เพลงถูกพักไว้อยู่แล้วครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.pause(true);
        embed.setDescription('⏸️ หยุดเล่นเพลงชั่วคราวแล้วครับ');
        return interaction.reply({ embeds: [embed] });
    }
};
