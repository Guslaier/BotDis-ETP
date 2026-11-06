const { EmbedBuilder } = require('discord.js');
const subscriptionManager = require('../src/billing/subscriptionManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gfilter',
        description: 'ปรับแต่งโทนเสียง Equalizer (เฉพาะเซิร์ฟเวอร์ผู้สนับสนุน VIP)',
        options: [
            {
                name: 'mode',
                type: 3, // STRING
                description: 'เลือกโทนเสียงที่ต้องการ',
                required: true,
                choices: [
                    { name: 'ปิดเสียงปรุงแต่ง (Off - Original)', value: 'off' },
                    { name: 'เบสหนักแน่น (Bass Boost)', value: 'bassboost' },
                    { name: 'ไนท์คอร์ (Nightcore - Fast & Pitch)', value: 'nightcore' },
                    { name: 'โทนป็อปใส (Pop Vocal)', value: 'pop' },
                    { name: 'ฟังสบาย ผ่อนคลาย (Soft Relax)', value: 'soft' },
                    { name: 'เวเปอร์เวฟ (Vaporwave - Slowed)', value: 'vaporwave' }
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
