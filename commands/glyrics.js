const { EmbedBuilder } = require('discord.js');
const lyricsHelper = require('../src/helpers/lyricsHelper');

module.exports = {
    data: {
        name: 'glyrics',
        description: 'Search and display lyrics for currently playing track',
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
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
