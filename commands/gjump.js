const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gjump',
        description: 'Move a track in queue to play next up (Priority Jump)',
        options: [
            {
                name: 'position',
                type: 4, // INTEGER
                description: 'Queue position number of the track to jump',
                required: true,
            },
        ],
    },
    run: async (client, interaction, kazagumo) => {
        const position = interaction.options.getInteger('position');
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || !player.playing) {
            embed.setDescription('❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (player.queue.length === 0) {
            embed.setDescription('❌ คิวเพลงว่างเปล่าครับ ไม่มีเพลงให้แซงคิว');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        if (position < 1 || position > player.queue.length) {
            embed.setDescription(`❌ ระบุลำดับคิวไม่ถูกต้องครับ ต้องอยู่ระหว่าง 1 ถึง ${player.queue.length}`);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const trackToJump = player.queue.remove(position - 1);
        if (!trackToJump) {
            embed.setDescription('❌ ไม่สามารถดึงเพลงออกจากคิวได้ครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        player.queue.unshift(trackToJump);

        embed.setDescription(`⬆️ Priority Jump! ดันเพลง **${trackToJump.title}** แซงคิวขึ้นมาเป็นเพลงถัดไปเรียบร้อยครับ ⚡`);
        return interaction.reply({ embeds: [embed] });
    }
};
