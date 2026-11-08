const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gmove')
        .setDescription('Move a track position in queue')
        .addIntegerOption(opt =>
            opt.setName('from')
                .setDescription('Current position number of track in queue')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(opt =>
            opt.setName('to')
                .setDescription('Destination position number in queue')
                .setRequired(true)
                .setMinValue(1)
        ),

    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || player.queue.length === 0) {
            embed.setDescription(i18n.t(guildId, 'MOVE_EMPTY'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const fromPos = interaction.options.getInteger('from');
        const toPos = interaction.options.getInteger('to');

        if (fromPos > player.queue.length || toPos > player.queue.length) {
            embed.setDescription(i18n.t(guildId, 'MOVE_INVALID_POS', { count: player.queue.length }));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (fromPos === toPos) {
            embed.setDescription(i18n.t(guildId, 'MOVE_SAME_POS'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const track = player.queue[fromPos - 1];
        player.queue.splice(fromPos - 1, 1);
        player.queue.splice(toPos - 1, 0, track);

        embed.setDescription(i18n.t(guildId, 'MOVE_SUCCESS', {
            title: track.title,
            uri: track.uri,
            from: fromPos,
            to: toPos
        }));
        return interaction.reply({ embeds: [embed] });
    }
};
