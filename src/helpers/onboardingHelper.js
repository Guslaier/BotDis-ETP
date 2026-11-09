const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, MessageFlags } = require('discord.js');
const settingsManager = require('./settingsManager');
const subscriptionManager = require('../billing/subscriptionManager');

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
        const host = subscriptionManager.getPublicWebUrl();
        const donateUrl = `${host}/donate?guild=${guild.id}&guildId=${guild.id}`;

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(`🎉 Welcome to ${botName}! • ยินดีต้อนรับสู่ ${botName}!`)
            .setDescription(`Hello **${guild.name}**! Thank you for inviting **${botName}** — your high-performance, HQ (Opus 96k) music companion.\n\nสวัสดีทุกคนใน **${guild.name}**! ขอบคุณที่เลือกใช้บริการบอทเพลงคุณภาพระดับ HQ (Opus 96k) เบสแน่น เสียงคมชัด พร้อมระบบคิวเพลงและออโต้เพลย์อัจฉริยะ 🎧🟢\n\n**Select your preferred server language below / เลือกภาษาที่ต้องการใช้งานด้านล่าง:**`)
            .setThumbnail(client.user?.displayAvatarURL() || null)
            .addFields(
                {
                    name: '🌐 1. Language Configuration / ตั้งค่าภาษา',
                    value: [
                        'Click below to set the bot communication language:',
                        'กดปุ่มด้านล่างเพื่อเลือกภาษาที่บอทจะใช้สื่อสารในเซิร์ฟเวอร์นี้ (เปลี่ยนได้ตลอดด้วย `/glang`):',
                        '• **🇬🇧 English (EN)** หรือ **🇹🇭 ภาษาไทย (TH)**'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎵 2. Quick Start / คำสั่งเริ่มต้น',
                    value: [
                        '• `/gplay <song/URL>` — Play music from YouTube, SoundCloud, or Spotify',
                        '• `/gvolume <0-150>` — Adjust stage volume in real-time',
                        '• `/gnowplaying` — Interactive playback dashboard',
                        '• `/ghelp` — Complete commands documentation'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💎 3. Supporter Perks / สิทธิพิเศษผู้สนับสนุน',
                    value: [
                        '⚡ **Priority Lane** — Instant stream slot, no waiting in line',
                        '🎵 **Extended Queue** — Up to 50 songs & 25 playlist items',
                        '📻 **Unlimited Stream** — Stream tracks and live broadcasts without length limits',
                        '🔄 **Autoplay Engine** — Automatic continuous music streaming',
                        '🎧 **HQ Quality** — Pristine Opus 96k HQ audio'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: `${botName} • High-Performance Audio Engine | Support starts at 29฿/month` });

        const langRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('welcome_lang_en')
                .setLabel('🇬🇧 English (EN)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('welcome_lang_th')
                .setLabel('🇹🇭 ภาษาไทย (Thai)')
                .setStyle(ButtonStyle.Success)
        );

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('💖 Supporter Portal')
                .setStyle(ButtonStyle.Link)
                .setURL(donateUrl),
            new ButtonBuilder()
                .setCustomId('welcome_help_guide')
                .setLabel('📖 Quick Commands Guide')
                .setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [embed], components: [langRow, actionRow] };
    }

    async handleGuildCreate(client, guild) {
        try {
            console.log(`[GuildJoin] Bot joined new guild: ${guild.name} (${guild.id}) - Locale: ${guild.preferredLocale || 'unknown'}`);
            
            // Auto-detect initial language if not already configured
            const settings = settingsManager.getGuildSettings(guild.id);
            if (!settings.language) {
                const autoLang = (guild.preferredLocale && guild.preferredLocale.toLowerCase().startsWith('th')) ? 'th' : 'en';
                settingsManager.setGuildLanguage(guild.id, autoLang);
                console.log(`[GuildJoin] Auto-detected language for ${guild.name}: ${autoLang}`);
            }

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
                content: '🇹🇭 ตั้งค่าภาษาของบอทในเซิร์ฟเวอร์นี้เป็น **ภาษาไทย (TH)** เรียบร้อยแล้วครับ!\nเริ่มฟังเพลงได้ทันทีโดยพิมพ์คำสั่ง `/gplay` 🎶🟢',
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
                            '`/gfilter` — Equalizer & BassBoost (Supporter)',
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
