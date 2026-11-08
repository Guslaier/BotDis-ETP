const fs = require('fs');
const path = require('path');
const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
 data: {
 name: 'gupdate',
 description: 'Reload command modules and sync Slash Commands to Discord'
 },
 run: async (client, interaction, kazagumo) => {
 const embed = new EmbedBuilder().setColor('#FF69B4');

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

 embed.setDescription(' รีเฟรชคำสั่งเรียบร้อยแล้วครับ สมาชิกทุกคนสามารถใช้งานคำสั่งล่าสุดได้ทันที ');
 return interaction.followUp({ embeds: [embed] });
 } catch (error) {
 console.error(error);
 embed.setDescription(' เกิดข้อผิดพลาดในการอัปเดตระบบ ลองตรวจสอบ Console อีกครั้งครับ');
 return interaction.followUp({ embeds: [embed] });
 }
 }
};
