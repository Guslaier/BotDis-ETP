const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gresume',
        description: 'เล่นเพลงต่อจากที่หยุดไว้ (Resume paused track)',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#00FF88');

        if (!player) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (!player.paused) {
            embed.setDescription('⚠️ เพลงกำลังเล่นอยู่แล้วนะ เต้นต่อเลยไม่ต้องรอ! 💃🔥');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.pause(false);
        embed.setDescription(i18n.t(guildId, 'RESUMED'));
        return interaction.reply({ embeds: [embed] });
    }
};
