const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const subscriptionManager = require('../src/billing/subscriptionManager');
const truemoneyGateway = require('../src/billing/truemoneyGateway');

module.exports = {
 data: {
 name: 'gdonate',
 description: 'Server supporter perks, membership status, and donation',
 options: [
 {
 name: 'status',
 type: 1, // SUB_COMMAND
 description: 'Check server supporter status and referral code'
 },
 {
 name: 'support',
 type: 1, // SUB_COMMAND
 description: 'Support server via TrueMoney Wallet gift voucher',
 options: [
 {
 name: 'voucher',
 type: 3, // STRING
 description: 'TrueMoney Wallet voucher link or code',
 required: true
 },
 {
 name: 'referral',
 type: 3, // STRING
 description: 'Referral code (REF-XXXXXX) to extend bonus days',
 required: false
 }
 ]
 },
 {
 name: 'redeem',
 type: 1, // SUB_COMMAND
 description: 'Redeem Early-Bird campaign code or gift key',
 options: [
 {
 name: 'code',
 type: 3, // STRING
 description: 'Redemption code (e.g. GOOLIX-DROP1)',
 required: true
 }
 ]
 }
 ]
 },
 run: async (client, interaction, kazagumo) => {
 const subCommand = interaction.options.getSubcommand() || 'status';
 const guildId = interaction.guildId || interaction.guild?.id;
 const guildName = interaction.guild?.name || 'Unknown Guild';
 const userId = interaction.user.id;

 const sub = subscriptionManager.getGuildSubscription(guildId, guildName);
 const isSupporter = subscriptionManager.isSupporter(guildId);
 const config = subscriptionManager.getConfig();

 const host = subscriptionManager.getPublicWebUrl();
 const donateUrl = `${host}/donate?guild=${guildId}&guildId=${guildId}&userId=${userId}`;

 if (subCommand === 'status') {
 const botName = client.user?.username || 'GOOLIX';
 const embed = new EmbedBuilder()
 .setTitle(' สถานะผู้สนับสนุนเซิร์ฟเวอร์ (Server Supporter)')
 .setColor(isSupporter ? '#00FF88' : '#64748B')
 .addFields(
 {
 name: ' เซิร์ฟเวอร์',
 value: `**${guildName}** (\`${guildId}\`)`,
 inline: false
 },
 {
 name: ' ระดับสมาชิก',
 value: isSupporter ? ' **SUPPORTER**' : '🆓 **ทั่วไป**',
 inline: true
 },
 {
 name: ' วันหมดอายุ',
 value: isSupporter ? `<t:${Math.floor(sub.expiresAt / 1000)}:R>\n(<t:${Math.floor(sub.expiresAt / 1000)}:d>)` : 'ไม่มี (ใช้งานโหมดฟรี)',
 inline: true
 },
 {
 name: ' รหัสชวนเพื่อนประจำเซิร์ฟเวอร์',
 value: (() => {
 const refCodeStr = `\`${sub.referralCode}\` (ชวนสำเร็จ: **${sub.referralCount || 0} / ${config.maxReferralMonths || 6}** เซิร์ฟเวอร์)`;
 const now = Date.now();
 if (config.referralEnabled === false) {
 return `${refCodeStr}\n **สถานะโปรโมชั่น:** ปิดรับสิทธิ์ชั่วคราว`;
 }
 if (config.referralExpiresAt && now > config.referralExpiresAt) {
 return `${refCodeStr}\n **สถานะโปรโมชั่น:** หมดเขตแล้ว (ปิดรับสิทธิ์เมื่อ <t:${Math.floor(config.referralExpiresAt / 1000)}:f>)`;
 }
 if (config.referralExpiresAt) {
 return `${refCodeStr}\n **เวลาปิดโปรโมชั่น:** <t:${Math.floor(config.referralExpiresAt / 1000)}:f> (<t:${Math.floor(config.referralExpiresAt / 1000)}:R>)`;
 }
 return `${refCodeStr}\n **สถานะโปรโมชั่น:** เปิดรับสิทธิ์ตลอดแคมเปญ`;
 })(),
 inline: false
 },
 {
 name: ' สิทธิประโยชน์ผู้สนับสนุน (Supporter Perks)',
 value: [
 ' **Priority Lane** — ช่องสัญญาณด่วน การันตีเข้าเล่นทันที ไม่ติดคิว',
 ' **Extended Queue** — คิวสูงสุด 50 เพลง & เพลย์ลิสต์ครั้งละ 25 เพลง',
 ' **Unlimited Length** — สตรีมเพลงและคลิปยาวได้ไม่จำกัดความยาว',
 ' **Autoplay Engine** — ระบบเล่นเพลงอัตโนมัติเมื่อคิวหมด',
 ' **HQ Audio** — ถ่ายทอดเสียงคมชัดระดับ Opus 96k HQ'
 ].join('\n'),
 inline: false
 }
 )
 .setFooter({ text: `${botName} • High-Performance Audio Engine` });

 const row = new ActionRowBuilder().addComponents(
 new ButtonBuilder()
 .setLabel(' เปิดหน้าเว็บร่วมสนับสนุน / กรอกโค้ด')
 .setStyle(ButtonStyle.Link)
 .setURL(donateUrl)
 );

 return interaction.reply({ embeds: [embed], components: [row] });
 }

 if (subCommand === 'redeem') {
 await interaction.deferReply();
 const code = interaction.options.getString('code');
 const result = subscriptionManager.redeemCode(guildId, guildName, userId, code);

 const embed = new EmbedBuilder();
 if (result.success) {
 embed.setColor('#00E676')
 .setTitle(' ปลดล็อกสิทธิ์สำเร็จ!')
 .setDescription(`เซิร์ฟเวอร์ **${guildName}** ได้รับสิทธิ์ผู้สนับสนุนจากรอบ **${result.campaignName}** เพิ่ม **+${result.addedDays} วัน** เรียบร้อยแล้วครับ!\n\n(สิทธิ์ในรอบนี้คงเหลือ: ${result.remainingClaims} เซิร์ฟเวอร์)`);
 } else {
 embed.setColor('#EF4444')
 .setTitle(' ใช้โค้ดไม่สำเร็จ')
 .setDescription(result.error || 'รหัสโค้ดไม่ถูกต้องหรือสิทธิ์เต็มแล้วครับ');
 }
 return interaction.followUp({ embeds: [embed] });
 }

 if (subCommand === 'support') {
 await interaction.deferReply();
 const voucher = interaction.options.getString('voucher');
 const referral = interaction.options.getString('referral');

 const cleanVoucher = (voucher || '').trim();
 if (!cleanVoucher.startsWith('https://gift.truemoney.com')) {
 const result = subscriptionManager.redeemCode(guildId, guildName, userId, cleanVoucher);
 const embed = new EmbedBuilder();
 if (result.success) {
 embed.setColor('#00E676')
 .setTitle(' ปลดล็อกสิทธิ์สำเร็จ!')
 .setDescription(`เซิร์ฟเวอร์ **${guildName}** ได้รับสิทธิ์ผู้สนับสนุนจากรอบ **${result.campaignName}** เพิ่ม **+${result.addedDays} วัน** เรียบร้อยแล้วครับ!\n\n(สิทธิ์ในรอบนี้คงเหลือ: ${result.remainingClaims} เซิร์ฟเวอร์)`);
 } else {
 embed.setColor('#EF4444')
 .setTitle(' ใช้โค้ดไม่สำเร็จ')
 .setDescription(result.error || 'รหัสโค้ดไม่ถูกต้องหรือสิทธิ์เต็มแล้วครับ');
 }
 return interaction.followUp({ embeds: [embed] });
 }

 const isSandbox = (config.paymentMode === 'sandbox');
 const redeemResult = await truemoneyGateway.redeemVoucher(cleanVoucher, {
 ip: 'discord-client',
 guildId,
 isSandbox
 });

 const embed = new EmbedBuilder();
 if (!redeemResult.success) {
 embed.setColor('#EF4444')
 .setTitle(' ทำรายการไม่สำเร็จ')
 .setDescription(redeemResult.error || 'ไม่สามารถรับซองของขวัญได้ครับ');
 return interaction.followUp({ embeds: [embed] });
 }

 const proc = subscriptionManager.processDonationSuccess({
 guildId,
 guildName,
 userId,
 amountBaht: redeemResult.amount,
 voucherCode: redeemResult.voucherCode,
 referralCode: referral,
 isSandbox: redeemResult.isSandbox
 });

 let bonusText = '';
 if (proc.referralBonusAwarded) {
 bonusText = `\n **โบนัสพิเศษ:** เซิร์ฟเวอร์เพื่อนของคุณ (**${proc.referrerGuildName}**) และเซิร์ฟเวอร์นี้ ได้รับวันสนับสนุนฟรีเพิ่ม **+${proc.addedBonusDays || 7} วัน** เช่นกันครับ!`;
 } else if (referral && !proc.isSeasonActive) {
 bonusText = '\n **หมายเหตุ:** รหัสชวนเพื่อนไม่ถูกคิดโบนัสเนื่องจากโปรโมชั่นหมดเขตหรือปิดรับสิทธิ์แล้วครับ';
 }

 embed.setColor('#00E676')
 .setTitle(' ขอบพระคุณสำหรับการร่วมสนับสนุน!')
 .setDescription(`ระบบได้รับยอดสนับสนุน **${redeemResult.amount} บาท** เรียบร้อยแล้วครับ!\nปลดล็อก Supporter Perks ให้เซิร์ฟเวอร์ **${guildName}** เพิ่ม **+${proc.addedDays} วัน**${bonusText}`)
 .setFooter({ text: 'ขอบคุณที่ร่วมเป็นกำลังสำคัญในการซัพพอร์ต GOOLIX นะ! ' });

 return interaction.followUp({ embeds: [embed] });
 }
 }
};
