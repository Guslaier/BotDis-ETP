const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const favoriteManager = require('../src/helpers/favoriteManager');
const settingsManager = require('../src/helpers/settingsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gfav')
        .setDescription('Manage your favorite tracks (Favorites)')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Save currently playing track to your favorites')
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View all your saved favorite tracks')
        )
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Load and play all your favorite tracks')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a track from your favorites list')
                .addIntegerOption(opt =>
                    opt.setName('number')
                        .setDescription('Position number in your favorites list to remove')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    run: async (client, interaction, kazagumo) => {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (sub === 'add') {
            const player = kazagumo.players.get(interaction.guild.id);
            if (!player || !player.playing || !player.queue.current) {
                embed.setDescription('❌ ไม่มีเพลงที่กำลังเล่นอยู่ตอนนี้ครับ เปิดเพลงก่อนแล้วค่อยกดบันทึกนะ');
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            const track = player.queue.current;
            const added = favoriteManager.addFavorite(userId, track);
            if (added) {
                embed.setDescription(`💖 บันทึกเพลง **${track.title}** ลงในรายการเพลงโปรดของคุณเรียบร้อยแล้วครับ! ✨`);
            } else {
                embed.setDescription(`ℹ️ เพลง **${track.title}** มีอยู่ในรายการโปรดของคุณอยู่แล้วครับ`);
            }
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (sub === 'list') {
            const favorites = favoriteManager.getFavorites(userId);
            if (!favorites || favorites.length === 0) {
                embed.setDescription('❌ คุณยังไม่มีเพลงโปรดครับ ลองฟังเพลงแล้วกดปุ่ม 💖 หรือใช้ `/gfav add` ดูนะ');
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            embed.setTitle(`💖 รายการเพลงโปรดของคุณ (${favorites.length} เพลง)`);
            let desc = '';
            favorites.slice(0, 15).forEach((item, index) => {
                desc += `**${index + 1}.** [${item.title}](${item.uri}) - *${item.author}*\n`;
            });
            if (favorites.length > 15) {
                desc += `\n*...และอีก ${favorites.length - 15} เพลง*`;
            }
            desc += '\n\n💡 *พิมพ์ `/gfav play` เพื่อเล่นเพลงโปรดทั้งหมดเข้าคิวได้เลยครับ!*';
            embed.setDescription(desc);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (sub === 'remove') {
            const index = interaction.options.getInteger('number');
            const favorites = favoriteManager.getFavorites(userId);
            if (!favorites || favorites.length === 0) {
                embed.setDescription('❌ คุณยังไม่มีรายการเพลงโปรดครับ');
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            if (index < 1 || index > favorites.length) {
                embed.setDescription(`❌ ลำดับไม่ถูกต้องครับ คุณมีเพลงโปรดทั้งหมด **${favorites.length}** เพลง`);
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            const target = favorites[index - 1];
            favoriteManager.removeFavorite(userId, target.identifier || target.uri);
            embed.setDescription(`🗑️ ลบเพลง **${target.title}** ออกจากรายการเพลงโปรดเรียบร้อยแล้วครับ!`);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (sub === 'play') {
            const voiceChannel = interaction.member?.voice?.channel;
            if (!voiceChannel) {
                embed.setDescription('❌ ต้องเข้าห้องเสียงก่อนนะ เดี๋ยว GOOLIX เหงาแย่เลย! 🔊');
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            const favorites = favoriteManager.getFavorites(userId);
            if (!favorites || favorites.length === 0) {
                embed.setDescription('❌ ยังไม่มีเพลงในรายการโปรดให้เปิดครับ ลองเพิ่มเพลงก่อนนะ 💖');
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            await interaction.deferReply();

            let player = kazagumo.players.get(interaction.guild.id);
            if (!player) {
                player = await kazagumo.createPlayer({
                    guildId: interaction.guild.id,
                    textId: interaction.channel.id,
                    voiceId: voiceChannel.id,
                    volume: settingsManager.getGuildVolume(interaction.guild.id)
                });
            }

            let loadedCount = 0;
            for (const fav of favorites) {
                const searchRes = await kazagumo.search(fav.uri || `${fav.title} ${fav.author}`, {
                    requester: interaction.user
                });
                if (searchRes && searchRes.tracks.length > 0) {
                    player.queue.add(searchRes.tracks[0]);
                    loadedCount++;
                }
            }

            embed.setDescription(`💖 เพิ่มเพลงโปรด **${loadedCount}** เพลงลงในคิวเรียบร้อยแล้วครับ! ปาร์ตี้เริ่มได้เลย! ⚡`);
            await interaction.followUp({ embeds: [embed] });

            if (!player.playing && !player._starting && !player.paused) {
                try {
                    await player.play();
                } catch (err) {
                    console.error('[gfav play] Play error:', err.message);
                }
            }
        }
    }
};

