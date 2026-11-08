const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gremove',
        description: 'Remove a track from queue by position number',
        options: [
            {
                name: 'position',
                type: 4, // INTEGER
                description: 'Queue position number of the track to remove',
                required: true,
            },
        ],
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const position = interaction.options.getInteger('position');
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || player.queue.length === 0) {
            embed.setDescription(i18n.t(guildId, 'NO_QUEUE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        
        if (position < 1 || position > player.queue.length) {
            embed.setDescription(i18n.t(guildId, 'INVALID_QUEUE_POS', { max: player.queue.length }));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const removedTrack = player.queue.remove(position - 1);
        if (!removedTrack) {
            embed.setDescription(i18n.t(guildId, 'REMOVE_FAIL'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        embed.setDescription(i18n.t(guildId, 'REMOVE_SUCCESS', { title: removedTrack.title }));
        return interaction.reply({ embeds: [embed] });
    }
};
