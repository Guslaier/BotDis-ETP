const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { formatDuration } = require('../src/helpers/musicCardHelper');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gbackward')
        .setDescription('Rewind playback by specified seconds')
        .addIntegerOption(opt =>
            opt.setName('seconds')
                .setDescription('Number of seconds to rewind (e.g. 10, 30)')
                .setRequired(true)
                .setMinValue(1)
        ),

    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing || !player.queue.current) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const track = player.queue.current;
        if (track.isStream) {
            embed.setDescription(i18n.t(guildId, 'CANNOT_SEEK_LIVE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const seconds = interaction.options.getInteger('seconds');
        const currentPos = player.position || 0;
        const newPos = Math.max(0, currentPos - (seconds * 1000));

        await player.seek(newPos);
        embed.setDescription(i18n.t(guildId, 'SEEK_BACKWARD_SUCCESS', {
            seconds,
            pos: formatDuration(newPos)
        }));
        return interaction.reply({ embeds: [embed] });
    }
};
