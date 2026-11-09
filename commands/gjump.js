const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gjump',
        description: 'Move a track in queue to play next up (Priority Jump)',
        options: [
            {
                name: 'position',
                type: 4, // INTEGER
                description: 'Queue position number of the track to jump',
                required: true,
            },
        ],
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const featureManager = require('../src/helpers/featureManager');
        const access = featureManager.checkAccess('queue_control', guildId);
        if (!access.allowed) {
            const isSupporterOnly = access.mode === 'supporter_only';
            const blockEmbed = new EmbedBuilder()
                .setColor(isSupporterOnly ? '#FF2E93' : '#EF4444')
                .setTitle(access.title || (isSupporterOnly ? i18n.t(guildId, 'FEATURE_SUPPORTER_TITLE') : i18n.t(guildId, 'FEATURE_MAINTENANCE_TITLE')))
                .setDescription(access.reason);
            return interaction.reply({ embeds: [blockEmbed], flags: 64 });
        }

        const position = interaction.options.getInteger('position');
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing) {
            embed.setDescription(i18n.t(guildId, 'NO_PLAYING_TRACK'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (player.queue.length === 0) {
            embed.setDescription(i18n.t(guildId, 'JUMP_NO_TRACKS'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (position < 1 || position > player.queue.length) {
            embed.setDescription(i18n.t(guildId, 'INVALID_QUEUE_POS', { max: player.queue.length }));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const trackToJump = player.queue.remove(position - 1);
        if (!trackToJump) {
            embed.setDescription(i18n.t(guildId, 'JUMP_FAIL'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.queue.unshift(trackToJump);

        embed.setDescription(i18n.t(guildId, 'JUMP_SUCCESS', { title: trackToJump.title }));
        return interaction.reply({ embeds: [embed] });
    }
};
