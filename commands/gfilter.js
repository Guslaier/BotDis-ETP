const { EmbedBuilder } = require('discord.js');
const subscriptionManager = require('../src/billing/subscriptionManager');

module.exports = {
    data: {
        name: 'gfilter',
        description: 'ปรับแต่งโทนเสียง Equalizer (เฉพาะเซิร์ฟเวอร์ผู้สนับสนุน)',
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
            embed.setColor('#FF2E93')
                .setTitle('💎 ฟีเจอร์สำหรับผู้สนับสนุนเซิร์ฟเวอร์')
                .setDescription('ระบบปรับแต่งโทนเสียง Equalizer สงวนไว้สำหรับเซิร์ฟเวอร์ **Supporter (VIP)** ค่ะ!\n\nพิมพ์ `/gdonate` เพื่อดูรายละเอียดการร่วมสนับสนุนค่าเซิร์ฟเวอร์เริ่มต้นเพียง **29฿/เดือน** นะคะ~ 💖');
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
            off: 'ปิดเสียงปรุงแต่ง (Original)',
            bassboost: 'เบสหนักแน่น (Bass Boost)',
            nightcore: 'ไนท์คอร์ (Nightcore)',
            pop: 'โทนป็อปใส (Pop Vocal)',
            soft: 'ฟังสบาย ผ่อนคลาย (Soft)',
            vaporwave: 'เวเปอร์เวฟ (Vaporwave)'
        };

        embed.setColor('#00E676')
            .setTitle('🎛️ ตั้งค่าโทนเสียง Equalizer เรียบร้อย!')
            .setDescription(`เปลี่ยนโทนเสียงของเซิร์ฟเวอร์เป็น: **${modeNames[mode] || mode}**\n*(มีผลทันทีกับเพลงที่กำลังเล่นและเพลงถัดไปค่ะ)*`);

        return interaction.reply({ embeds: [embed] });
    }
};
