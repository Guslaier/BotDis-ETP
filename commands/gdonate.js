const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const subscriptionManager = require('../src/billing/subscriptionManager');
const truemoneyGateway = require('../src/billing/truemoneyGateway');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gdonate')
        .setDescription('Server supporter status, perks, and donation portal')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Campaign code or TrueMoney gift voucher link (Optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('referral')
                .setDescription('Referral code REF-XXXXXX for bonus days (Optional)')
                .setRequired(false)
        ),

    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guildId || interaction.guild?.id;
        const guildName = interaction.guild?.name || 'Unknown Guild';
        const userId = interaction.user.id;

        const sub = subscriptionManager.getGuildSubscription(guildId, guildName);
        const isSupporter = subscriptionManager.isSupporter(guildId);
        const config = subscriptionManager.getConfig();

        const host = subscriptionManager.getPublicWebUrl();
        const donateUrl = `${host}/donate?guild=${guildId}&guildId=${guildId}&userId=${userId}`;

        const inputCode = interaction.options.getString('code');
        const referral = interaction.options.getString('referral');

        // If no code is provided, show server supporter status card with direct portal link
        if (!inputCode) {
            const botName = client.user?.username || 'GOOLIX';
            const embed = new EmbedBuilder()
                .setTitle('💖 สถานะผู้สนับสนุนเซิร์ฟเวอร์ (Server Supporter)')
                .setColor(isSupporter ? '#00FF88' : '#64748B')
                .addFields(
                    {
                        name: '🏰 เซิร์ฟเวอร์',
                        value: `**${guildName}** (\`${guildId}\`)`,
                        inline: false
                    },
                    {
                        name: '📊 ระดับสมาชิก',
                        value: isSupporter ? '💎 **SUPPORTER**' : '🆓 **ทั่วไป**',
                        inline: true
                    },
                    {
                        name: '⏱️ วันหมดอายุ',
                        value: isSupporter ? `<t:${Math.floor(sub.expiresAt / 1000)}:R>\n(<t:${Math.floor(sub.expiresAt / 1000)}:d>)` : 'ไม่มี (ใช้งานโหมดฟรี)',
                        inline: true
                    },
                    ...(sub.balanceBaht > 0 ? [{
                        name: '🏺 หลอดสะสมเศษซอง',
                        value: `สะสมแล้ว **${sub.balanceBaht} / 29 บาท** (ขาดอีก **${Math.max(0, 29 - sub.balanceBaht)} บาท** เพื่อปลดล็อก 30 วัน)`,
                        inline: true
                    }] : []),
                    {
                        name: '🎁 รหัสชวนเพื่อนประจำเซิร์ฟเวอร์',
                        value: (() => {
                            const refCodeStr = `\`${sub.referralCode}\` (ชวนสำเร็จ: **${sub.referralCount || 0} / ${config.maxReferralMonths || 6}** เซิร์ฟเวอร์)`;
                            const now = Date.now();
                            if (config.referralEnabled === false) {
                                return `${refCodeStr}\n⛔ **สถานะโปรโมชั่น:** ปิดรับสิทธิ์ชั่วคราว`;
                            }
                            if (config.referralExpiresAt && now > config.referralExpiresAt) {
                                return `${refCodeStr}\n⛔ **สถานะโปรโมชั่น:** หมดเขตแล้ว (ปิดรับสิทธิ์เมื่อ <t:${Math.floor(config.referralExpiresAt / 1000)}:f>)`;
                            }
                            if (config.referralExpiresAt) {
                                return `${refCodeStr}\n⏳ **เวลาปิดโปรโมชั่น:** <t:${Math.floor(config.referralExpiresAt / 1000)}:f> (<t:${Math.floor(config.referralExpiresAt / 1000)}:R>)`;
                            }
                            return `${refCodeStr}\n🟢 **สถานะโปรโมชั่น:** เปิดรับสิทธิ์ตลอดแคมเปญ`;
                        })(),
                        inline: false
                    },
                    {
                        name: '✨ สิทธิประโยชน์ผู้สนับสนุน (Supporter Perks)',
                        value: [
                            '⚡ **Priority Lane** — ช่องสัญญาณด่วน การันตีเข้าเล่นทันที ไม่ติดคิว',
                            '🎵 **Extended Queue** — คิวสูงสุด 50 เพลง & เพลย์ลิสต์ครั้งละ 25 เพลง',
                            '📻 **Extended Length** — สตรีมเพลงและคลิปขนาดยาวได้อย่างต่อเนื่อง (เกิน 30 นาที)',
                            '🔄 **Autoplay Engine** — ระบบเล่นเพลงอัตโนมัติเมื่อคิวหมด',
                            '🎧 **HQ Quality** — ถ่ายทอดเสียงคมชัดระดับ Opus 96k HQ'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({ text: `${botName} • High-Performance Audio Engine` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('💖 เปิดหน้าเว็บร่วมสนับสนุน / กรอกโค้ด')
                    .setStyle(ButtonStyle.Link)
                    .setURL(donateUrl)
            );

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        // If code is provided, process either TrueMoney voucher or campaign redemption code
        await interaction.deferReply();
        const cleanInput = inputCode.trim();

        if (cleanInput.startsWith('https://gift.truemoney.com')) {
            const isSandbox = (config.paymentMode === 'sandbox');
            const redeemResult = await truemoneyGateway.redeemVoucher(cleanInput, {
                ip: 'discord-client',
                guildId,
                isSandbox
            });

            const embed = new EmbedBuilder();
            if (!redeemResult.success) {
                embed.setColor('#EF4444')
                    .setTitle('❌ ทำรายการไม่สำเร็จ')
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
                bonusText = `\n🎁 **โบนัสพิเศษ:** เซิร์ฟเวอร์เพื่อนของคุณ (**${proc.referrerGuildName}**) และเซิร์ฟเวอร์นี้ ได้รับวันสนับสนุนฟรีเพิ่ม **+${proc.addedBonusDays || 7} วัน** เช่นกันครับ!`;
            } else if (referral && !proc.isSeasonActive) {
                bonusText = '\n⚠️ **หมายเหตุ:** รหัสชวนเพื่อนไม่ถูกคิดโบนัสเนื่องจากโปรโมชั่นหมดเขตหรือปิดรับสิทธิ์แล้วครับ';
            }

            if (proc.cyclesUnlocked > 0) {
                const remText = proc.currentBalance > 0
                    ? `\n💰 **คงเหลือเศษสะสม:** **${proc.currentBalance} บาท** (เก็บไว้ในหลอดสะสมสำหรับรอบหน้า)`
                    : '';
                embed.setColor('#00E676')
                    .setTitle('🎉 ขอบพระคุณสำหรับการร่วมสนับสนุน!')
                    .setDescription(`ระบบได้รับยอดสนับสนุน **${redeemResult.amount} บาท** เรียบร้อยแล้วครับ!\nปลดล็อก Supporter Perks ให้เซิร์ฟเวอร์ **${guildName}** เพิ่ม **+${proc.addedDays} วัน**${remText}${bonusText}`)
                    .setFooter({ text: 'ขอบคุณที่ร่วมเป็นกำลังสำคัญในการซัพพอร์ต GOOLIX นะ! 🟢⚡' });
            } else {
                embed.setColor('#38BDF8')
                    .setTitle('📥 ได้รับยอดสะสมเรียบร้อยแล้ว!')
                    .setDescription(`ระบบได้รับยอด **${redeemResult.amount} บาท** เข้าสู่หลอดสะสมของเซิร์ฟเวอร์ **${guildName}** เรียบร้อยแล้วครับ!\n\n📊 **สถานะหลอดสะสม:** สะสมแล้ว **${proc.currentBalance} / 29 บาท** (ขาดอีก **${proc.neededBaht} บาท** เพื่อปลดล็อก 30 วัน)\n\n*(ยอดสะสมมีอายุ 60 วันนับจากการเติมล่าสุด)*`)
                    .setFooter({ text: 'หยอดเพิ่มให้ครบ 29 บาท เพื่อปลดล็อก Supporter 30 วันทันที!' });
            }

            return interaction.followUp({ embeds: [embed] });
        }

        // Campaign Code or Gift Key
        const result = subscriptionManager.redeemCode(guildId, guildName, userId, cleanInput);
        const embed = new EmbedBuilder();
        if (result.success) {
            embed.setColor('#00E676')
                .setTitle('🎉 ปลดล็อกสิทธิ์สำเร็จ!')
                .setDescription(`เซิร์ฟเวอร์ **${guildName}** ได้รับสิทธิ์ผู้สนับสนุนจากรอบ **${result.campaignName}** เพิ่ม **+${result.addedDays} วัน** เรียบร้อยแล้วครับ!\n\n(สิทธิ์ในรอบนี้คงเหลือ: ${result.remainingClaims} เซิร์ฟเวอร์)`);
        } else {
            embed.setColor('#EF4444')
                .setTitle('❌ ใช้โค้ดไม่สำเร็จ')
                .setDescription(result.error || 'รหัสโค้ดไม่ถูกต้องหรือสิทธิ์เต็มแล้วครับ');
        }
        return interaction.followUp({ embeds: [embed] });
    }
};
