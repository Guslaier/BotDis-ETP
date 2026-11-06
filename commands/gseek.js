const { EmbedBuilder } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gseek',
        description: 'กรอเพลงไปยังเวลาที่กำหนด (เช่น 01:30 หรือ 90)',
        options: [
            {
                name: 'time',
                type: 3, // STRING
                description: 'เวลาที่ต้องการกรอไป (เช่น 01:30 หรือระบุเป็นวินาที)',
                required: true,
            },
        ],
    },
    run: async (client, interaction, kazagumo) => {
        const timeInput = interaction.options.getString('time');
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing) {
            embed.setDescription('❌ ไม่มีเพลงที่กำลังเล่นอยู่ค่ะ! จะให้ดีเจกรอความเหงาเหรอคะ? 🥺');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        let timeMs = 0;
        if (timeInput.includes(':')) {
            const parts = timeInput.split(':').map(Number);
            if (parts.length === 2) {
                // MM:SS
                timeMs = (parts[0] * 60 + parts[1]) * 1000;
            } else if (parts.length === 3) {
                // HH:MM:SS
                timeMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
            }
        } else {
            timeMs = Number(timeInput) * 1000;
        }

        if (isNaN(timeMs) || timeMs < 0) {
            embed.setDescription('❌ รูปแบบเวลาไม่ถูกต้อง! ลองพิมพ์แบบ 01:30 หรือใส่เป็นตัวเลขวินาทีดูนะ 🧐');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (player.queue.current.length > 0 && timeMs > player.queue.current.length) {
            embed.setDescription(i18n.t(interaction.guild.id, 'SEEK_TOO_FAR'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        await interaction.deferReply();
        await player.seek(timeMs);
        embed.setDescription(`⏩ วาร์ปไปที่เวลา **${timeInput}** ให้เรียบร้อย! 🎶🟢`);
        return interaction.followUp({ embeds: [embed] });
    }
};
