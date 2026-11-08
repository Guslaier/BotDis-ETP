const { EmbedBuilder } = require('discord.js');
const lyricsHelper = require('../src/helpers/lyricsHelper');
const featureManager = require('../src/helpers/featureManager');

module.exports = {
    data: {
        name: 'glyrics',
        description: 'Search and display lyrics for currently playing track',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const access = featureManager.checkAccess('lyrics', guildId);
        if (!access.allowed) {
            const isSupporterOnly = access.mode === 'supporter_only';
            const blockEmbed = new EmbedBuilder()
                .setColor(isSupporterOnly ? '#FF2E93' : '#EF4444')
                .setTitle(isSupporterOnly ? '💎 ฟังก์ชันสำหรับผู้สนับสนุน (Supporter Only)' : '⛔ ฟังก์ชันปิดปรับปรุงชั่วคราว')
                .setDescription(access.reason);
            return interaction.reply({ embeds: [blockEmbed], flags: 64 });
        }

        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing || !player.queue.current) {
            embed.setDescription('❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const track = player.queue.current;
        await interaction.deferReply();

        try {
            const data = await lyricsHelper.getLyrics(track);

            if (!data || !data.lyrics) {
                embed.setDescription(`❌ ขออภัยครับ หาเนื้อเพลงสำหรับ **${track.title}** ไม่เจอ`);
                return interaction.followUp({ embeds: [embed] });
            }

            let lyrics = data.lyrics;
            if (lyrics.length > 4000) {
                lyrics = lyrics.substring(0, 3995) + '...';
            }

            embed.setTitle(`🎤 เนื้อเพลง: ${data.title || track.title}`)
                 .setDescription(lyrics)
                 .setFooter({ text: `แหล่งที่มา: ${data.source}` });

            return interaction.followUp({ embeds: [embed] });

        } catch (error) {
            console.error('[LyricsCommand] Error:', error.message);
            embed.setDescription('❌ เกิดข้อผิดพลาดในการค้นหาเนื้อเพลงครับ');
            return interaction.followUp({ embeds: [embed] });
        }
    }
};
