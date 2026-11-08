const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gshuffle',
        description: 'Shuffle and randomize order of queued tracks',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || player.queue.length === 0) {
            embed.setDescription(i18n.t(guildId, 'NO_QUEUE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (player.queue.length <= 1) {
            embed.setDescription(i18n.t(guildId, 'NEED_MORE_TRACKS_SHUFFLE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.queue.shuffle();
        embed.setDescription(i18n.t(guildId, 'QUEUE_SHUFFLED'));
        return interaction.reply({ embeds: [embed] });
    }
};
