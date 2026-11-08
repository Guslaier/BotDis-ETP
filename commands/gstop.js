const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gstop',
        description: 'Stop playback, clear queue, and leave voice channel',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.destroy();
        embed.setDescription(i18n.t(guildId, 'STOPPED'));
        return interaction.reply({ embeds: [embed] });
    }
};
