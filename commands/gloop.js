const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gloop',
        description: 'Set repeat loop mode for current track or queue',
        options: [
            {
                name: 'mode',
                type: 3, // STRING
                description: 'Select loop mode',
                required: true,
                choices: [
                    { name: 'Off (Disable Repeat)', value: 'none' },
                    { name: 'Track (Repeat Current Track)', value: 'track' },
                    { name: 'Queue (Repeat Entire Queue)', value: 'queue' }
                ]
            }
        ]
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const featureManager = require('../src/helpers/featureManager');
        const access = featureManager.checkAccess('loop', guildId);
        if (!access.allowed) {
            const isSupporterOnly = access.mode === 'supporter_only';
            const blockEmbed = new EmbedBuilder()
                .setColor(isSupporterOnly ? '#FF2E93' : '#EF4444')
                .setTitle(access.title || (isSupporterOnly ? i18n.t(guildId, 'FEATURE_SUPPORTER_TITLE') : i18n.t(guildId, 'FEATURE_MAINTENANCE_TITLE')))
                .setDescription(access.reason);
            return interaction.reply({ embeds: [blockEmbed], flags: 64 });
        }

        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription(i18n.t(guildId, 'NO_QUEUE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const mode = interaction.options.getString('mode');
        player.setLoop(mode);

        let modeText = i18n.t(guildId, 'LOOP_NONE');
        if (mode === 'track') modeText = i18n.t(guildId, 'LOOP_TRACK');
        if (mode === 'queue') modeText = i18n.t(guildId, 'LOOP_QUEUE');

        embed.setDescription(`**${modeText}** 🎧`);
        return interaction.reply({ embeds: [embed] });
    }
};
