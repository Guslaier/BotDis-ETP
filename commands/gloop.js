const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'gloop',
        description: 'Set repeat loop mode for current track or queue',
        options: [
            {
                name: 'mode',
                type: 3, // STRING
                description: 'Select loop mode',
                required: true,
                choices: [
                    { name: 'Off (Disable Repeat)', value: 'none' },
                    { name: 'Track (Repeat Current Track)', value: 'track' },
                    { name: 'Queue (Repeat Entire Queue)', value: 'queue' }
                ]
            }
        ]
    },
    run: async (client, interaction, kazagumo) => {
        const player = kazagumo.players.get(interaction.guild.id);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player) {
            embed.setDescription('❌ ไม่มีคิวเพลงครับ');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const mode = interaction.options.getString('mode');
        player.setLoop(mode);

        let modeText = '❌ ปิดการวนลูปแล้วครับ';
        if (mode === 'track') modeText = '🔂 วนซ้ำเพลงปัจจุบัน (Repeat Track)';
        if (mode === 'queue') modeText = '🔁 วนซ้ำทั้งคิว (Repeat Queue)';

        embed.setDescription(`**${modeText}** 🎧`);
        return interaction.reply({ embeds: [embed] });
    }
};
