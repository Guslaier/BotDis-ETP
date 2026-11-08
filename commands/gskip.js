const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gskip',
        description: 'Skip currently playing track to the next one',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || (!player.playing && !player._starting)) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.skip();
        const nextTitle = player.queue.current?.title || (i18n.isEn(guildId) ? 'Next Track' : 'เพลงถัดไป');
        embed.setDescription(i18n.t(guildId, 'SKIPPED', { title: nextTitle }));
        return interaction.reply({ embeds: [embed] });
    }
};
