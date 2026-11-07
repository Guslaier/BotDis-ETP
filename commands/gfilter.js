const { EmbedBuilder } = require('discord.js');
const subscriptionManager = require('../src/billing/subscriptionManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gfilter',
        description: 'Apply audio Equalizer and tone filters (VIP Supporter)',
        options: [
            {
                name: 'mode',
                type: 3, // STRING
                description: 'Select audio equalizer preset',
                required: true,
                choices: [
                    { name: 'Off (Original Sound)', value: 'off' },
                    { name: 'Bass Boost (Deep Bass)', value: 'bassboost' },
                    { name: 'Nightcore (Fast & Pitch)', value: 'nightcore' },
                    { name: 'Pop Vocal (Clear Voices)', value: 'pop' },
                    { name: 'Soft Relax (Warm Acoustic)', value: 'soft' },
                    { name: 'Vaporwave (Slowed & Reverb)', value: 'vaporwave' }
                ]
            }
        ]
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const isSupporter = subscriptionManager.isSupporter(guildId);
        const embed = new EmbedBuilder();

        if (!isSupporter) {
            subscriptionManager.setGuildAudioFilter(guildId, 'off');
            const player = kazagumo.players.get(guildId);
            if (player) {
                player.audioFilter = 'off';
                if (player.playing && player.position !== undefined) {
                    try { player.seek(player.position); } catch {}
                }
            }
            embed.setColor('#FF2E93')
                .setTitle('💎 Supporter Feature')
                .setDescription(i18n.t(guildId, 'FILTER_VIP_ONLY'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const mode = interaction.options.getString('mode') || 'off';
        subscriptionManager.setGuildAudioFilter(guildId, mode);

        const player = kazagumo.players.get(guildId);
        if (player) {
            player.audioFilter = mode;
            // If playing, re-seek at current position to apply filter in real-time
            if (player.playing && player.position !== undefined) {
                try {
                    player.seek(player.position);
                } catch {}
            }
        }

        const modeNames = {
            off: 'Off (Original)',
            bassboost: 'Bass Boost 💥',
            nightcore: 'Nightcore ⚡',
            pop: 'Pop Vocal 🎤',
            soft: 'Soft Relax 🍃',
            vaporwave: 'Vaporwave 🌊'
        };

        embed.setColor('#00FF88')
            .setTitle('🎛️ Equalizer Configured')
            .setDescription(i18n.t(guildId, 'FILTER_CHANGED', { filter: modeNames[mode] || mode }));

        return interaction.reply({ embeds: [embed] });
    }
};
