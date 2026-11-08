const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gpause',
        description: 'Pause current music playback',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (player.paused) {
            embed.setDescription(i18n.t(guildId, 'ALREADY_PAUSED'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.pause(true);
        embed.setDescription(i18n.t(guildId, 'PAUSED'));
        return interaction.reply({ embeds: [embed] });
    }
};
