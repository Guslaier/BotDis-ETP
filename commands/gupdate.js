const fs = require('fs');
const path = require('path');
const { EmbedBuilder, SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const ownerHelper = require('../src/helpers/ownerHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gupdate')
        .setDescription('Reload command modules and sync Slash Commands to Discord (Server Owner / Bot Owner)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    run: async (client, interaction, kazagumo) => {
        if (!ownerHelper.canUpdateCommands(interaction)) {
            return interaction.reply({
                content: '❌ คำสั่งนี้สงวนสิทธิ์เฉพาะเจ้าของเซิร์ฟเวอร์ (Server Owner) หรือผู้พัฒนาบอท (Bot Owner) ครับ',
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

            const isBotOwner = ownerHelper.isOwner(interaction.user?.id);
            if (isBotOwner) {
                await client.application.commands.set(newCommandsData);
            }
            if (interaction.guild) {
                await interaction.guild.commands.set(newCommandsData);
            }

            const targetDesc = isBotOwner 
                ? '✅ รีเฟรชและซิงก์คำสั่งบอททั่วโลก (Global & Guild) เรียบร้อยแล้วครับ ⚡'
                : '✅ รีเฟรชและซิงก์คำสั่งบอทสำหรับเซิร์ฟเวอร์นี้เรียบร้อยแล้วครับ ⚡';

            embed.setDescription(targetDesc);
            return interaction.followUp({ embeds: [embed] });
        } catch (error) {
            console.error('[gupdate] Sync error:', error);
            embed.setColor('#EF4444')
                .setDescription(`❌ เกิดข้อผิดพลาดในการอัปเดตระบบ: \`${error.message}\``);
            return interaction.followUp({ embeds: [embed] });
        }
    }
};
