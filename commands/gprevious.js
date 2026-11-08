const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gprevious',
        description: 'Replay the previous track that just finished',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const hasPrev = !!(player.queue.previous || (player.previousTracks && player.previousTracks.length > 0));
        if (!hasPrev) {
            embed.setDescription(i18n.t(guildId, 'NO_PREVIOUS'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.playPrevious();
        const targetTitle = player.queue.current?.title || player.queue.previous?.title || (i18n.isEn(guildId) ? 'Previous Track' : 'เพลงก่อนหน้า');
        embed.setDescription(i18n.t(guildId, 'PREVIOUS_PLAYING', { title: targetTitle }));
        return interaction.reply({ embeds: [embed] });
    }
};
