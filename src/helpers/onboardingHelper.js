const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, MessageFlags } = require('discord.js');
const settingsManager = require('./settingsManager');

class OnboardingHelper {
    findWelcomeChannel(guild) {
        if (!guild || !guild.channels) return null;

        const me = guild.members?.me;
        if (!me) return null;

        const requiredPerms = [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks
        ];

        // 1. Try systemChannel
        if (guild.systemChannel) {
            const perms = guild.systemChannel.permissionsFor(me);
            if (perms && perms.has(requiredPerms)) {
                return guild.systemChannel;
            }
        }

        // 2. Try common general/chat channels
        const preferredNames = ['general', 'chat', 'bot', 'commands', 'เพลง', 'บอท', 'พูดคุย', 'main'];
        const textChannels = guild.channels.cache.filter(c => 
            c.type === ChannelType.GuildText && 
            c.permissionsFor(me)?.has(requiredPerms)
        );

        for (const name of preferredNames) {
            const found = textChannels.find(c => c.name.toLowerCase().includes(name));
            if (found) return found;
        }

        // 3. First accessible text channel
        return textChannels.first() || null;
    }

    createWelcomeCard(client, guild) {
        const botName = client.user?.username || 'GOOLIX';
        const publicPort = process.env.PUBLIC_WEB_PORT || '11901';
        const host = process.env.PUBLIC_WEB_URL || `http://${process.env.PUBLIC_IP || '15.235.164.106'}:${publicPort}`;
        const donateUrl = `${host}/donate?guildId=${guild.id}`;

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(`🎉 ยินดีต้อนรับสู่ ${botName} — ระบบเปิดเพลงคุณภาพสูง!`)
            .setDescription(`สวัสดีชาว **${guild.name}**! ขอบคุณที่เลือกใช้งานบอทเพลงคุณภาพสตูดิโอ (Opus 96k) เบสแน่น เสียงคมชัด พร้อมระบบคิวและออโต้เพลย์อัจฉริยะ 🎧🟢\n\nโปรดเลือก **ภาษาการใช้งาน** ของเซิร์ฟเวอร์ และดูสิทธิประโยชน์ผู้สนับสนุนด้านล่างได้เลยค่ะ`)
            .setThumbnail(client.user?.displayAvatarURL() || null)
            .addFields(
                {
                    name: '🌐 1. เลือกภาษาการใช้งาน (Select Language)',
                    value: 'กดปุ่มด้านล่างเพื่อตั้งค่าภาษาของบอทในเซิร์ฟเวอร์นี้ (เปลี่ยนภายหลังได้ด้วย `/glang`)\n• **ไทย (TH)** หรือ **English (EN)**',
                    inline: false
                },
                {
                    name: '🎵 2. คำสั่งเริ่มต้นใช้งาน (Quick Start)',
                    value: [
                        '• `/gplay <เพลง/ลิงก์>` — เปิดเพลงทันใจ (YouTube / SoundCloud / Spotify)',
                        '• `/gvolume <0-150>` — ปรับระดับเสียงเพลงแบบ Real-time',
                        '• `/gnowplaying` — แผงควบคุมและดูข้อมูลเพลงที่กำลังเล่น',
                        '• `/ghelp` — ดูรายการคำสั่งทั้งหมดของบอท'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💖 3. สิทธิ์พิเศษผู้สนับสนุน (VIP Supporter Perks)',
                    value: [
                        '⚡ **Priority Lane** — ช่องสัญญาณด่วน การันตีเข้าเล่นทันที ไม่ติดคิว',
                        '🎵 **Extended Queue** — คิวสูงสุด 50 เพลง & เพลย์ลิสต์ 25 เพลง',
                        '📻 **Unlimited Stream** — สตรีมเพลงและคลิปยาวได้ไม่จำกัดเวลา',
                        '🎛️ **Audio FX** — ปรับแต่งเสียง Equalizer (`/gfilter` BassBoost ฯลฯ)',
                        '🔄 **Autoplay Engine** — ระบบเปิดเพลงต่อเนื่องอัตโนมัติ',
                        '🎧 **Studio Quality** — ถ่ายทอดเสียงคมชัดระดับ Opus 96k Studio HQ'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: `${botName} • High-Performance Audio Engine | สนับสนุนเริ่มต้นเพียง 29฿/เดือน` });

        const langRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('welcome_lang_th')
                .setLabel('🇹🇭 ภาษาไทย (Thai)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('welcome_lang_en')
                .setLabel('🇬🇧 English (EN)')
                .setStyle(ButtonStyle.Primary)
        );

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('💖 ร่วมสนับสนุน (VIP Supporter)')
                .setStyle(ButtonStyle.Link)
                .setURL(donateUrl),
            new ButtonBuilder()
                .setCustomId('welcome_help_guide')
                .setLabel('📖 คู่มือคำสั่ง (Quick Guide)')
                .setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [embed], components: [langRow, actionRow] };
    }

    async handleGuildCreate(client, guild) {
        try {
            console.log(`[GuildJoin] Bot joined new guild: ${guild.name} (${guild.id}) - Members: ${guild.memberCount}`);
            
            // Wait 1.5s for guild permissions & channels cache to settle
            await new Promise(r => setTimeout(r, 1500));

            const channel = this.findWelcomeChannel(guild);
            if (!channel) {
                console.warn(`[GuildJoin] No suitable text channel found to send welcome message in: ${guild.name} (${guild.id})`);
                return;
            }

            const card = this.createWelcomeCard(client, guild);
            await channel.send(card);
            console.log(`[GuildJoin] Welcome card sent to #${channel.name} in ${guild.name} (${guild.id})`);
        } catch (err) {
            console.error(`[GuildJoin] Error sending welcome card in ${guild?.name}:`, err.message);
        }
    }

    async handleButton(interaction, client) {
        const { customId, guildId } = interaction;
        if (!customId.startsWith('welcome_')) return false;

        if (customId === 'welcome_lang_th') {
            settingsManager.setGuildLanguage(guildId, 'th');
            await interaction.reply({
                content: '🇹🇭 ตั้งค่าภาษาของบอทในเซิร์ฟเวอร์นี้เป็น **ภาษาไทย (TH)** เรียบร้อยแล้วค่ะ!\nเริ่มฟังเพลงได้ทันทีโดยพิมพ์คำสั่ง `/gplay` 🎶🟢',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
            return true;
        }

        if (customId === 'welcome_lang_en') {
            settingsManager.setGuildLanguage(guildId, 'en');
            await interaction.reply({
                content: '🇬🇧 Bot language for this server has been set to **English (EN)**!\nGet started by typing `/gplay` to play any song 🎶🟢',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
            return true;
        }

        if (customId === 'welcome_help_guide') {
            const currentLang = settingsManager.getGuildLanguage(guildId);
            const isEn = currentLang === 'en';
            const guideEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle(isEn ? '📖 Quick Command Guide' : '📖 คู่มือคำสั่งใช้งานเบื้องต้น')
                .setDescription(isEn 
                    ? 'Here are the primary commands to control your music experience:' 
                    : 'คำสั่งหลักในการเปิดและควบคุมเพลง:')
                .addFields(
                    {
                        name: isEn ? '🎵 Playback Controls' : '🎵 ควบคุมการเล่นเพลง',
                        value: [
                            '`/gplay <song>` — Play music from YouTube, SoundCloud, or Spotify',
                            '`/gpause` & `/gresume` — Pause or resume track',
                            '`/gskip` & `/gprevious` — Skip to next or previous track',
                            '`/gstop` — Stop playback and leave voice channel',
                            '`/gqueue` — View current playlist queue'
                        ].join('\n')
                    },
                    {
                        name: isEn ? '🎛️ Audio & Stage Management' : '🎛️ ปรับแต่งเสียง & ระบบ',
                        value: [
                            '`/gvolume <0-150>` — Adjust stage volume',
                            '`/gfilter` — Equalizer & BassBoost (Supporter VIP)',
                            '`/gautoplay` — Toggle auto-queuing similar tracks',
                            '`/gnowplaying` — Open interactive stage dashboard',
                            '`/glang` — Switch server language anytime'
                        ].join('\n')
                    }
                )
                .setFooter({ text: 'Type /ghelp for complete documentation.' });

            await interaction.reply({
                embeds: [guideEmbed],
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
            return true;
        }

        return false;
    }
}

module.exports = new OnboardingHelper();
