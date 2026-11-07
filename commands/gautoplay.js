const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const subscriptionManager = require('../src/billing/subscriptionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gautoplay')
        .setDescription('Toggle smart continuous autoplay when queue ends (VIP Supporter)'),

    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const isSupporter = subscriptionManager.isSupporter(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!isSupporter) {
            settingsManager.setGuildAutoplay(guildId, false);
            const player = kazagumo.players.get(guildId);
            if (player) {
                player.autoplay = false;
                player._preloadedAutoplayTrack = null;
                if (player._autoplayPreloadTimer) {
                    clearTimeout(player._autoplayPreloadTimer);
                    player._autoplayPreloadTimer = null;
                }
            }
            embed.setColor('#FF2E93')
                .setTitle('💎 ฟีเจอร์สำหรับผู้สนับสนุนเซิร์ฟเวอร์')
                .setDescription('ระบบเล่นเพลงต่อเนื่องอัตโนมัติ (Autoplay) สงวนไว้สำหรับเซิร์ฟเวอร์ **Supporter (VIP)** ค่ะ!\n\nพิมพ์ `/gdonate` เพื่อดูรายละเอียดการร่วมสนับสนุนค่าเซิร์ฟเวอร์เริ่มต้นเพียง **29฿/เดือน** นะคะ~ 💖');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const player = kazagumo.players.get(guildId);

        let newStatus;
        if (player) {
            player.autoplay = !player.autoplay;
            newStatus = player.autoplay;
            settingsManager.setGuildAutoplay(player.guildId, newStatus);
            if (player.nowPlayingMessage && player.queue?.current) {
                try {
                    const { createNowPlayingCard } = require('../src/helpers/musicCardHelper');
                    const cardData = createNowPlayingCard(player, player.queue.current);
                    await player.nowPlayingMessage.edit(cardData).catch(() => {});
                } catch {}
            }
        } else {
            const current = settingsManager.getGuildAutoplay(guildId);
            newStatus = settingsManager.setGuildAutoplay(guildId, !current);
        }

        const statusText = newStatus ? 'เปิดใช้งาน (Enabled) 🟢' : 'ปิดใช้งาน (Disabled) 🔴';
        embed.setDescription(`🎲 **ระบบเล่นเพลงต่อเนื่อง (Autoplay):** ${statusText}\n\n${newStatus ? 'เมื่อเพลงในคิวหมด ดีเจจะเลือกเพลงที่คล้ายกันมาเล่นต่อให้อัตโนมัติค่ะ ปาร์ตี้ไม่มีสะดุดแน่นอน! (ระบบจำค่านี้ไว้ถาวร) 💃✨' : 'เมื่อเพลงในคิวหมด บอทจะหยุดเล่นเพลงตามปกติค่ะ'}`);
        return interaction.reply({ embeds: [embed] });
    }
};
