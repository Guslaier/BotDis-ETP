const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gstats')
        .setDescription('View bot statistics, active servers, listeners, and uptime'),

    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild?.id;
        const isEn = settingsManager.getGuildLanguage(guildId) === 'en';

        const totalSeconds = Math.floor(process.uptime());
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const uptimeStr = isEn
            ? `${days}d ${hours}h ${minutes}m ${seconds}s`
            : `${days} วัน ${hours} ชม. ${minutes} นาที ${seconds} วิ`;

        const totalGuilds = client.guilds.cache.size;
        const activePlayers = kazagumo?.players?.size || 0;

        // Calculate total non-bot listeners across all playing voice channels
        let totalListeners = 0;
        if (kazagumo?.players) {
            for (const player of kazagumo.players.values()) {
                if (player.voiceId) {
                    const voiceChannel = client.channels.cache.get(player.voiceId);
                    if (voiceChannel && voiceChannel.members) {
                        totalListeners += voiceChannel.members.filter(m => !m.user.bot).size;
                    }
                }
            }
        }

        const wsPing = client.ws?.ping ?? 0;

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(isEn ? '📊 GOOLIX System Statistics' : '📊 ข้อมูลสถิติการใช้งาน GOOLIX')
            .setDescription(isEn
                ? 'High-performance audio companion powering Discord communities with pristine sound.'
                : 'บอทเพลงคุณภาพสูง ขับเคลื่อนเสียงระดับ HQ สำหรับคอมมูนิตี้ Discord ทุกเซิร์ฟเวอร์')
            .addFields(
                {
                    name: isEn ? '🏰 Total Servers' : '🏰 เซิร์ฟเวอร์ทั้งหมด',
                    value: isEn ? `\`${totalGuilds.toLocaleString()} Servers\`` : `\`${totalGuilds.toLocaleString()} เซิร์ฟเวอร์\``,
                    inline: true
                },
                {
                    name: isEn ? '🎶 Active Rooms' : '🎶 ห้องที่กำลังเล่นเพลง',
                    value: isEn ? `\`${activePlayers.toLocaleString()} Rooms\`` : `\`${activePlayers.toLocaleString()} ห้อง\``,
                    inline: true
                },
                {
                    name: isEn ? '👥 Total Listeners' : '👥 ผู้ฟังทั้งหมด',
                    value: isEn ? `\`${totalListeners.toLocaleString()} Members\`` : `\`${totalListeners.toLocaleString()} คน\``,
                    inline: true
                },
                {
                    name: isEn ? '⏱️ Uptime' : '⏱️ เวลาทำงานต่อเนื่อง',
                    value: `\`${uptimeStr}\``,
                    inline: true
                },
                {
                    name: isEn ? '⚡ Gateway Ping' : '⚡ ค่าความหน่วง (Latency)',
                    value: `\`${wsPing}ms\``,
                    inline: true
                },
                {
                    name: isEn ? '🎧 Audio Quality' : '🎧 คุณภาพเสียง',
                    value: '`Opus 96k HQ (Direct)`',
                    inline: true
                }
            )
            .setFooter({
                text: 'GOOLIX High-Fidelity Audio Engine 🟢'
            });

        return interaction.reply({ embeds: [embed] });
    }
};
