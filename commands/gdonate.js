const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const subscriptionManager = require('../src/billing/subscriptionManager');
const truemoneyGateway = require('../src/billing/truemoneyGateway');

module.exports = {
    data: {
        name: 'gdonate',
        description: 'สนับสนุนค่าเซิร์ฟเวอร์ & ตรวจสอบสถานะ Supporter',
        options: [
            {
                name: 'status',
                type: 1, // SUB_COMMAND
                description: 'ตรวจสอบสถานะผู้สนับสนุน และรหัสชวนเพื่อนของเซิร์ฟเวอร์นี้'
            },
            {
                name: 'support',
                type: 1, // SUB_COMMAND
                description: 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์ผ่านซองของขวัญ TrueMoney Wallet',
                options: [
                    {
                        name: 'voucher',
                        type: 3, // STRING
                        description: 'ลิงก์ซองของขวัญอั่งเปา TrueMoney Wallet หรือรหัสซอง',
                        required: true
                    },
                    {
                        name: 'referral',
                        type: 3, // STRING
                        description: 'โค้ดชวนเพื่อน (REF-XXXXXX) เพื่อช่วยต่อวันฟรีให้เพื่อน',
                        required: false
                    }
                ]
            },
            {
                name: 'redeem',
                type: 1, // SUB_COMMAND
                description: 'กรอกโค้ดแคมเปญ Early-Bird หรือโค้ดรับสิทธิ์ฟรี',
                options: [
                    {
                        name: 'code',
                        type: 3, // STRING
                        description: 'รหัสโค้ด เช่น GOOLIX-DROP1',
                        required: true
                    }
                ]
            }
        ]
    },
    run: async (client, interaction, kazagumo) => {
        const subCommand = interaction.options.getSubcommand() || 'status';
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        const sub = subscriptionManager.getGuildSubscription(guildId, guildName);
        const isSupporter = subscriptionManager.isSupporter(guildId);
        const config = subscriptionManager.getConfig();

        const publicPort = process.env.PUBLIC_WEB_PORT || '11901';
        const host = process.env.PUBLIC_WEB_URL || `http://${process.env.PUBLIC_IP || '15.235.164.106'}:${publicPort}`;
        const donateUrl = `${host}/donate?guildId=${guildId}&userId=${userId}`;

        if (subCommand === 'status') {
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
                        value: isSupporter ? '💎 **VIP SUPPORTER**' : '🆓 **Standard (Free Tier)**',
                        inline: true
                    },
                    {
                        name: '⏱️ วันหมดอายุ',
                        value: isSupporter ? `<t:${Math.floor(sub.expiresAt / 1000)}:R>\n(<t:${Math.floor(sub.expiresAt / 1000)}:d>)` : 'ไม่มี (ใช้งานโหมดฟรี)',
                        inline: true
                    },
                    {
                        name: '🎁 รหัสชวนเพื่อนประจำเซิร์ฟเวอร์',
                        value: `\`${sub.referralCode}\` (ชวนสำเร็จ: **${sub.referralCount || 0}** เซิร์ฟเวอร์)`,
                        inline: false
                    },
                    {
                        name: '✨ สิทธิประโยชน์ผู้สนับสนุน (VIP Perks)',
                        value: [
                            '⚡ **Priority Lane** — ช่องสัญญาณด่วน การันตีเข้าเล่นทันที ไม่ติดคิว',
                            '🎵 **Extended Queue** — คิวสูงสุด 50 เพลง & เพลย์ลิสต์ครั้งละ 25 เพลง',
                            '📻 **Unlimited Length** — สตรีมเพลงและคลิปยาวได้ไม่จำกัดความยาว',
                            '🎛️ **Audio FX** — ปลดล็อกตัวปรับแต่งเสียง `/gfilter` BassBoost ฯลฯ',
                            '🔄 **Autoplay Engine** — ระบบเล่นเพลงอัตโนมัติเมื่อคิวหมด',
                            '🎧 **Studio Quality** — ถ่ายทอดเสียงคมชัดระดับ Opus 96k Studio HQ'
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

        if (subCommand === 'redeem') {
            await interaction.deferReply();
            const code = interaction.options.getString('code');
            const result = subscriptionManager.redeemCode(guildId, guildName, userId, code);

            const embed = new EmbedBuilder();
            if (result.success) {
                embed.setColor('#00E676')
                    .setTitle('🎉 ปลดล็อกสิทธิ์สำเร็จ!')
                    .setDescription(`เซิร์ฟเวอร์ **${guildName}** ได้รับสิทธิ์ผู้สนับสนุนจากรอบ **${result.campaignName}** เพิ่ม **+${result.addedDays} วัน** เรียบร้อยแล้วค่ะ!\n\n(สิทธิ์ในรอบนี้คงเหลือ: ${result.remainingClaims} เซิร์ฟเวอร์)`);
            } else {
                embed.setColor('#EF4444')
                    .setTitle('❌ ใช้โค้ดไม่สำเร็จ')
                    .setDescription(result.error || 'รหัสโค้ดไม่ถูกต้องหรือสิทธิ์เต็มแล้วค่ะ');
            }
            return interaction.followUp({ embeds: [embed] });
        }

        if (subCommand === 'support') {
            await interaction.deferReply();
            const voucher = interaction.options.getString('voucher');
            const referral = interaction.options.getString('referral');

            const isSandbox = (config.paymentMode === 'sandbox');
            const redeemResult = await truemoneyGateway.redeemVoucher(voucher, {
                ip: 'discord-client',
                guildId,
                isSandbox
            });

            const embed = new EmbedBuilder();
            if (!redeemResult.success) {
                embed.setColor('#EF4444')
                    .setTitle('❌ ทำรายการไม่สำเร็จ')
                    .setDescription(redeemResult.error || 'ไม่สามารถรับซองของขวัญได้ค่ะ');
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
                bonusText = `\n🎁 **โบนัสพิเศษ:** เซิร์ฟเวอร์เพื่อนของคุณ (**${proc.referrerGuildName}**) ได้รับวันสนับสนุนฟรี **+30 วัน** เช่นกันค่ะ!`;
            }

            embed.setColor('#00E676')
                .setTitle('🎉 ขอบพระคุณสำหรับการร่วมสนับสนุน!')
                .setDescription(`ระบบได้รับยอดสนับสนุน **${redeemResult.amount} บาท** เรียบร้อยแล้วค่ะ!\nปลดล็อก Supporter Perks ให้เซิร์ฟเวอร์ **${guildName}** เพิ่ม **+${proc.addedDays} วัน**${bonusText}`)
                .setFooter({ text: 'ขอบคุณที่ร่วมเป็นกำลังสำคัญในการซัพพอร์ต GOOLIX นะ! 🟢⚡' });

            return interaction.followUp({ embeds: [embed] });
        }
    }
};
