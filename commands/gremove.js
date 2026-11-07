const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gremove',
        description: 'Remove a track from queue by position number',
        options: [
            {
                name: 'position',
                type: 4, // INTEGER
                description: 'Queue position number of the track to remove',
                required: true,
            },
        ],
    },
    run: async (client, interaction, kazagumo) => {
        const position = interaction.options.getInteger('position');
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription('❌ ไม่มีคิวเพลงค่ะ! จะให้ดีเจลบอะไรเอ่ย? 🥺');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        
        if (position < 1 || position > player.queue.length) {
            embed.setDescription(`❌ เอ๊ะๆ! ระบุลำดับคิวผิดรึเปล่าคะ ในคิวมีแค่ ${player.queue.length} เพลงเองน้า~ 🧐`);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const removedTrack = player.queue.remove(position - 1);
        if (!removedTrack) {
            embed.setDescription('❌ ไม่สามารถลบเพลงออกจากคิวได้ค่ะ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        embed.setDescription(`🗑️ ชึบ! ลบเพลง **${removedTrack.title}** ออกจากคิวให้แล้วค่ะ ตามใจคนฟังสุดๆ ✂️💕`);
        return interaction.reply({ embeds: [embed] });
    }
};
