const fs = require('fs');
const path = require('path');
const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const ownerHelper = require('../src/helpers/ownerHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gupdate')
        .setDescription('Reload command modules and sync Slash Commands to Discord (Owner Only)')
        .setDefaultMemberPermissions(0),

    run: async (client, interaction, kazagumo) => {
        if (!ownerHelper.isOwner(interaction.user?.id)) {
            return interaction.reply({
                content: '❌ คำสั่งนี้สงวนสิทธิ์เฉพาะผู้พัฒนาบอท (Bot Owner Only) ครับ',
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder().setColor('#00FF88');

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const commandsPath = path.join(__dirname, '../commands');
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            
            const newCommandsData = [];
            client.commands.clear();
            
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                delete require.cache[require.resolve(filePath)]; // ล้างแคชเพื่อให้ดึงโค้ดล่าสุด
                
                const command = require(filePath);
                if ('data' in command && 'run' in command) {
                    client.commands.set(command.data.name, command);
                    newCommandsData.push(typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data);
                }
            }

            // อัปเดต Slash Commands ไปยัง Discord (Global + Guild ปัจจุบัน เพื่อความไวระดับ 0 วิ)
            await client.application.commands.set(newCommandsData);
            if (interaction.guild) {
                await interaction.guild.commands.set(newCommandsData);
            }

            embed.setDescription('✅ รีเฟรชและซิงก์คำสั่งบอทเรียบร้อยแล้วครับ ⚡');
            return interaction.followUp({ embeds: [embed] });
        } catch (error) {
            console.error('[gupdate] Sync error:', error);
            embed.setColor('#EF4444')
                .setDescription(`❌ เกิดข้อผิดพลาดในการอัปเดตระบบ: \`${error.message}\``);
            return interaction.followUp({ embeds: [embed] });
        }
    }
};
