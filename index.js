require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Options, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const QueueManager = require('./src/QueueManager');
const cacheManager = require('./src/CacheManager');
const { createNowPlayingCard, createPreparingCard } = require('./src/helpers/musicCardHelper');
const favoriteManager = require('./src/helpers/favoriteManager');
const AdminServer = require('./src/web/AdminServer');
const subscriptionManager = require('./src/billing/subscriptionManager');
const i18n = require('./src/helpers/i18nHelper');
const onboardingHelper = require('./src/helpers/onboardingHelper');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ],
    makeCache: Options.cacheWithLimits({
        ApplicationCommandManager: 0,
        BaseGuildEmojiManager: 0,
        GuildBanManager: 0,
        GuildInviteManager: 0,
        GuildStickerManager: 0,
        GuildScheduledEventManager: 0,
        MessageManager: 0,
        PresenceManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        StageInstanceManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0
    }),
    sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: {
            interval: 300,
            lifetime: 60
        }
    }
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsData = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'run' in command) {
        client.commands.set(command.data.name, command);
        commandsData.push(typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "run" property.`);
    }
}

// สร้าง Audio Engine และ QueueManager
const kazagumo = new QueueManager(client);

// Event เมื่อกำลังเตรียมโหลดเพลงถัดไป
kazagumo.on("playerPrepare", async (player, track) => {
    if (!player || player._destroyed || !player.connection) return;
    if (!player.nowPlayingMessage) return;

    try {
        const prepCard = createNowPlayingCard(player, track, { isPreparing: true, statusText: 'กำลังเตรียมสตรีมเสียง...' });
        await player.nowPlayingMessage.edit(prepCard).catch(() => {});
    } catch {}
});

// Event เมื่อเริ่มเล่นเพลง
kazagumo.on("playerStart", async (player, track) => {
    if (!player || player._destroyed || !player.connection) return;
    console.log(`[Player] 🎧 Now Playing: "${track?.title}" | Real Source: ${track?.realSource || (track?.uri?.includes('soundcloud.com') ? 'SoundCloud' : 'YouTube')}`);
    if (!player.textId) return;
    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;

    try {
        const cardData = createNowPlayingCard(player, track);
        if (player.nowPlayingMessage) {
            try {
                await player.nowPlayingMessage.edit(cardData);
                return;
            } catch {
                player.nowPlayingMessage = null;
            }
        }
        const msg = await channel.send(cardData);
        player.nowPlayingMessage = msg;
    } catch (err) {
        console.error('[playerStart] Error sending now playing card:', err.message);
    }
});

// Event เมื่อเพลงติดขัด
kazagumo.on("playerStuck", (player, track, threshold) => {
    console.warn(`⚠️ Player stuck on track: ${track?.title} (threshold: ${threshold}ms)`);
});

// Event เมื่อเกิดข้อผิดพลาดในการเล่นเพลง
kazagumo.on("playerException", (player, track, exception) => {
    const errorMsg = exception?.message || (typeof exception === 'string' ? exception : 'Unknown Error');
    const trackTitle = track?.title || 'Unknown Track';
    console.error(`❌ Player exception on track "${trackTitle}":`, errorMsg);

    if (!player.textId) return;
    const channel = client.channels.cache.get(player.textId);
    if (channel) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`❌ ไม่สามารถโหลดเพลง **${trackTitle}** ได้ค่ะ ขอข้ามไปเพลงถัดไปนะคะ 🥺\n\`${errorMsg}\``);
        channel.send({ embeds: [embed] }).catch(() => { });
    }
});

// Event เมื่อเพลงจบ
kazagumo.on("playerEnd", (player, track) => {
    console.log(`ℹ️ Player ended track: ${track?.title || 'Track'}`);
    if (global.gc) global.gc();
});

// Event เมื่อคิวหมด
kazagumo.on("playerEmpty", player => {
    if (!player.textId) return;
    const channel = client.channels.cache.get(player.textId);
    if (channel) {
        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setDescription(i18n.t(player.guildId, 'QUEUE_EMPTY'));
        channel.send({ embeds: [embed] }).catch(() => { });
    }
    player.destroy();
    if (global.gc) global.gc();
});

client.on('clientReady', async () => {
    console.log(`✅ Logged in as ${client.user.tag} (GOOLIX Ultra-Light Engine)!`);

    // Try setting Discord bot username to GOOLIX if different
    if (client.user.username !== 'GOOLIX') {
        client.user.setUsername('GOOLIX').catch(err => {
            console.log(`[Username] Note: Discord username can be changed in Discord Dev Portal if rate-limited: ${err.message}`);
        });
    }

    // Clean old cache at startup and sweep every 15 minutes (max 50MB quota)
    cacheManager.cleanOldCache(2);
    setInterval(() => {
        cacheManager.cleanOldCache(2);
        if (global.gc) global.gc();
    }, 15 * 60 * 1000).unref();

    try {
        await client.application.commands.set(commandsData);
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    // Start Web Admin & Donation Portal if enabled (default true)
    if (process.env.ENABLE_WEB_ADMIN !== 'false') {
        const webPort = parseInt(process.env.WEB_PORT || '3000', 10);
        const adminServer = new AdminServer(client, kazagumo, { port: webPort });
        adminServer.start();
    }

    // Start 60s Heartbeat Sweep worker (idle cleaner, slot guard, expiration notice, 04:00 AM updater)
    subscriptionManager.startHeartbeatSweep(client, kazagumo);
});

client.on('guildCreate', async guild => {
    await onboardingHelper.handleGuildCreate(client, guild);
});

client.on('guildDelete', guild => {
    console.log(`[GuildLeave] Bot removed from guild: ${guild.name} (${guild.id})`);
});

client.on('guildUnavailable', guild => {
    console.warn(`[GuildUnavailable] Guild is unavailable: ${guild.name} (${guild.id})`);
});

client.on('interactionCreate', async interaction => {
    // 0. Guild Ban Guard
    if (interaction.guildId) {
        const banManager = require('./src/moderation/banManager');
        const banInfo = banManager.getBanInfo(interaction.guildId);
        if (banInfo) {
            const timeStr = banInfo.isPermanent ? 'ถาวร (Permanent)' : `<t:${Math.floor(banInfo.expiresAt / 1000)}:R> (<t:${Math.floor(banInfo.expiresAt / 1000)}:f>)`;
            const banEmbed = new EmbedBuilder()
                .setColor('#EF4444')
                .setTitle('⛔ เซิร์ฟเวอร์นี้ถูกระงับการใช้งาน (BANNED)')
                .setDescription(`เซิร์ฟเวอร์นี้ถูกแบนจากระบบ GOOLIX ชั่วคราวหรือถาวร\n\n**เหตุผล:** ${banInfo.reason || 'ละเมิดข้อกำหนดการใช้งาน'}\n**ระยะเวลา:** ${timeStr}\n\nหากคิดว่านี่คือข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบค่ะ`);
            return interaction.reply({ embeds: [banEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }

    // 1. Handle interactive buttons (Onboarding & Music Player)
    if (interaction.isButton()) {
        const customId = interaction.customId;
        if (customId.startsWith('welcome_')) {
            return onboardingHelper.handleButton(interaction, client);
        }
        if (!customId.startsWith('music_') && !customId.startsWith('vol_')) return;

        const player = kazagumo.players.get(interaction.guildId);
        if (!player || (!player.playing && !player._starting && !player._actionDebounceTimer) || !player.queue.current) {
            if (customId.startsWith('music_')) {
                try {
                    await interaction.message.delete();
                } catch {
                    await interaction.message.edit({ components: [] }).catch(() => {});
                }
                return interaction.reply({
                    content: '🗑️ ตรวจพบการ์ดเพลงที่หมดอายุ/หยุดเล่นแล้ว ระบบลบการ์ดทิ้งให้เรียบร้อยค่ะ!',
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
            return interaction.reply({
                content: '❌ ไม่มีเพลงที่กำลังเล่นอยู่ตอนนี้ค่ะ',
                flags: MessageFlags.Ephemeral
            });
        }

        // Always bind interaction message as the active now playing card
        if (customId.startsWith('music_')) {
            player.nowPlayingMessage = interaction.message;
        }

        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceId) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'VOICE_SAME_REQUIRED'),
                flags: MessageFlags.Ephemeral
            });
        }

        switch (customId) {
            case 'music_shuffle': {
                player.queue.shuffle();
                return interaction.deferUpdate();
            }
            case 'music_previous': {
                const now = Date.now();
                if (player._lastPrevAction && now - player._lastPrevAction < 1000) {
                    return interaction.deferUpdate();
                }
                player._lastPrevAction = now;
                if (!player.queue.previous && (!player.previousTracks || player.previousTracks.length === 0)) {
                    return interaction.deferUpdate();
                }
                player.playPrevious();
                if (player.queue.current) {
                    const prepCard = createNowPlayingCard(player, player.queue.current, { isPreparing: true, statusText: 'กำลังย้อนกลับไปเพลงก่อนหน้า...' });
                    try {
                        return await interaction.update(prepCard);
                    } catch {}
                }
                return interaction.deferUpdate();
            }
            case 'music_backward': {
                const track = player.queue.current;
                if (!track) return interaction.deferUpdate();
                if (track.isStream) {
                    return interaction.reply({
                        content: i18n.t(interaction.guildId, 'CANNOT_SEEK_LIVE'),
                        flags: MessageFlags.Ephemeral
                    });
                }
                await interaction.deferUpdate();
                await player.seekBy(-10000);
                if (player.nowPlayingMessage) {
                    try {
                        const cardData = createNowPlayingCard(player, track);
                        await player.nowPlayingMessage.edit(cardData).catch(() => {});
                    } catch {}
                }
                return;
            }
            case 'music_forward': {
                const track = player.queue.current;
                if (!track) return interaction.deferUpdate();
                if (track.isStream) {
                    return interaction.reply({
                        content: i18n.t(interaction.guildId, 'CANNOT_SEEK_LIVE'),
                        flags: MessageFlags.Ephemeral
                    });
                }
                await interaction.deferUpdate();
                await player.seekBy(10000);
                if (player.nowPlayingMessage) {
                    try {
                        const cardData = createNowPlayingCard(player, track);
                        await player.nowPlayingMessage.edit(cardData).catch(() => {});
                    } catch {}
                }
                return;
            }
            case 'music_pause_resume': {
                player.pause(!player.paused);
                try {
                    const cardData = createNowPlayingCard(player, player.queue.current);
                    return await interaction.update(cardData);
                } catch {
                    return interaction.deferUpdate();
                }
            }
            case 'music_skip': {
                const now = Date.now();
                if (player._lastSkipAction && now - player._lastSkipAction < 1000) {
                    return interaction.deferUpdate();
                }
                player._lastSkipAction = now;
                player.skip();
                if (player.queue.current) {
                    const prepCard = createNowPlayingCard(player, player.queue.current, { isPreparing: true, statusText: 'กำลังข้ามเพลง...' });
                    try {
                        return await interaction.update(prepCard);
                    } catch {}
                }
                return interaction.deferUpdate();
            }
            case 'music_loop': {
                player.cycleLoop();
                try {
                    const cardData = createNowPlayingCard(player, player.queue.current);
                    return await interaction.update(cardData);
                } catch {
                    return interaction.deferUpdate();
                }
            }
            case 'music_autoplay': {
                const isSupporter = subscriptionManager.isSupporter(player.guildId);
                if (!isSupporter) {
                    player.autoplay = false;
                    const settingsManager = require('./src/helpers/settingsManager');
                    settingsManager.setGuildAutoplay(player.guildId, false);
                    if (player.nowPlayingMessage && player.queue?.current) {
                        try {
                            const cardData = createNowPlayingCard(player, player.queue.current);
                            await player.nowPlayingMessage.edit(cardData).catch(() => {});
                        } catch {}
                    }
                    return interaction.reply({
                        content: i18n.t(player.guildId, 'AUTOPLAY_VIP_ONLY'),
                        flags: MessageFlags.Ephemeral
                    });
                }
                player.autoplay = !player.autoplay;
                const settingsManager = require('./src/helpers/settingsManager');
                settingsManager.setGuildAutoplay(player.guildId, player.autoplay);
                try {
                    const cardData = createNowPlayingCard(player, player.queue.current);
                    return await interaction.update(cardData);
                } catch {
                    return interaction.deferUpdate();
                }
            }
            case 'music_queue': {
                const queue = player.queue;
                const embed = new EmbedBuilder().setColor('#FF69B4');
                const currentTitle = queue.current?.title || 'Unknown';
                let desc = `**🎧 กำลังเล่น:** [${currentTitle}](${queue.current?.uri})\n\n`;
                if (queue.length === 0) {
                    desc += 'ไม่มีเพลงรอในคิวแล้วค่ะ สั่งเพลงเพิ่มได้เลยน้า~';
                } else {
                    desc += `**คิวรอเล่น (${queue.length} เพลง):**\n`;
                    const preview = queue.slice(0, 10);
                    preview.forEach((t, i) => {
                        desc += `**${i + 1}.** [${t.title}](${t.uri}) - <@${t.requester.id}>\n`;
                    });
                    if (queue.length > 10) {
                        desc += `*...และอีก ${queue.length - 10} เพลง*`;
                    }
                }
                embed.setTitle('📋 คิวเพลงปัจจุบัน').setDescription(desc);
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            case 'music_lyrics': {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const track = player.queue.current;
                const lyricsHelper = require('./src/helpers/lyricsHelper');
                const data = await lyricsHelper.getLyrics(track);

                if (!data || !data.lyrics) {
                    return interaction.followUp({
                        content: `❌ หาเนื้อเพลงสำหรับ **${track.title}** ไม่เจอเลยค่ะ 🥺`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                let text = data.lyrics;
                if (text.length > 4000) text = text.slice(0, 3995) + '...';

                const embed = new EmbedBuilder()
                    .setColor('#FF69B4')
                    .setTitle(`🎤 เนื้อเพลง: ${data.title || track.title}`)
                    .setDescription(text)
                    .setFooter({ text: `แหล่งที่มา: ${data.source} 💋` });

                return interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            case 'music_favorite': {
                const track = player.queue.current;
                const added = favoriteManager.addFavorite(interaction.user.id, track);
                if (added) {
                    return interaction.reply({
                        content: `💖 บันทึกเพลง **${track.title}** ลงในรายการเพลงโปรดของคุณแล้วค่ะ! เรียกฟังได้ด้วย \`/gfav play\``,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    return interaction.reply({
                        content: `ℹ️ เพลง **${track.title}** อยู่ในรายการเพลงโปรดของคุณอยู่แล้วค่ะ!`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
            case 'music_volume': {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('vol_30').setLabel('30%').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('vol_60').setLabel('60%').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('vol_100').setLabel('100%').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('vol_130').setLabel('130%').setStyle(ButtonStyle.Danger)
                );
                return interaction.reply({
                    content: `🔊 เลือกระดับเสียงด่วนที่ต้องการปรับ (ปัจจุบัน: **${player.volume}%**):`,
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
            }
            case 'music_stop': {
                await interaction.reply({
                    content: '🛑 ปิดแอปและออกจากห้องเสียงเรียบร้อยแล้วค่ะ! ไว้มาฟังเพลงด้วยกันใหม่น้า 👋💕',
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
                try {
                    await interaction.message?.delete().catch(() => {});
                } catch {}
                player.destroy();
                return;
            }
            case 'vol_30':
            case 'vol_60':
            case 'vol_100':
            case 'vol_130': {
                const volNum = parseInt(customId.replace('vol_', ''), 10);
                player.setVolume(volNum);
                if (player.nowPlayingMessage) {
                    try {
                        const cardData = createNowPlayingCard(player, player.queue.current);
                        await player.nowPlayingMessage.edit(cardData).catch(() => {});
                    } catch {}
                }
                return interaction.update({
                    content: `🔊 ปรับและบันทึกระดับเสียงเป็น **${volNum}%** เรียบร้อยค่ะ! (ระบบจำค่านี้ไว้ใช้ตลอด)`,
                    components: []
                });
            }
        }
    }

    // 2. Handle Slash Commands
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inGuild()) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#FF69B4').setDescription('❌ อ๊ะๆ! ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้นนะคะที่รัก 💕')],
            flags: MessageFlags.Ephemeral
        });
    }
    if (!interaction.guild) {
        console.error(`[GuildCache] Bot is not in guild ${interaction.guildId} — interaction received from guild the bot has left or cannot access.`);
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#FF69B4').setDescription('❌ บอทไม่อยู่ในเซิร์ฟเวอร์นี้แล้วค่ะ กรุณาเชิญบอทใหม่ด้วยนะคะ 🥺')],
            flags: MessageFlags.Ephemeral
        });
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    console.log(`[Interaction] /${interaction.commandName} | User: ${interaction.user.tag} (${interaction.user.id}) | Guild: "${interaction.guild?.name || interaction.guildId}"`);

    try {
        await command.run(client, interaction, kazagumo);
    } catch (error) {
        console.error(error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setDescription('❌ ว้าย! มีข้อผิดพลาดนิดหน่อยตอนรันคำสั่งนี้ค่ะ ขออภัยด้วยนะคะ 🥺');
            
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
});

// Auto-disconnect when no non-bot members remain in the bot's voice channel
client.on('voiceStateUpdate', (oldState, newState) => {
    // If the bot itself was disconnected from voice channel
    if (oldState.id === client.user.id && !newState.channelId) {
        const guild = oldState.guild;
        if (guild) {
            const player = kazagumo.getPlayer(guild.id);
            if (player) {
                console.log(`[Player] Bot disconnected from voice channel in ${guild.name} (${guild.id}), destroying player.`);
                player.destroy();
            }
        }
        return;
    }

    if (oldState.id === client.user.id || newState.id === client.user.id) return;

    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const player = kazagumo.getPlayer(guild.id);
    if (!player || !player.voiceId) return;

    if (oldState.channelId !== player.voiceId && newState.channelId !== player.voiceId) return;

    const channel = guild.channels.cache.get(player.voiceId);
    if (!channel) return;

    // Filter out bots and member who left
    const nonBotMembers = channel.members.filter(m => !m.user.bot && (newState.channelId === player.voiceId || m.id !== oldState.id));
    if (nonBotMembers.size === 0) {
        console.log(`[Player] No members left in voice channel, disconnecting from ${guild.name} (${guild.id})`);
        player.destroy();
    }
});

// --- Startup Checklist ---
async function runStartupCheck() {
    console.log('\n--- 🚀 [GOOLIX] Startup Checklist ---');
    let allGood = true;

    // 1. Check Token
    if (!process.env.DISCORD_TOKEN) {
        console.log('❌ [Environment] DISCORD_TOKEN is missing in .env!');
        allGood = false;
    } else {
        console.log('✅ [Environment] DISCORD_TOKEN found.');
    }

    // 2. Check yt-dlp
    const ytDlpPath = path.join(__dirname, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    if (fs.existsSync(ytDlpPath)) {
        if (process.platform !== 'win32') {
            try { fs.chmodSync(ytDlpPath, 0o755); } catch {}
        }
        console.log('✅ [yt-dlp] Binary found.');
    } else {
        console.log('❌ [yt-dlp] Binary is missing at bin/yt-dlp!');
        allGood = false;
    }

    // 3. Initialize & Check Proxy with Auto-Recovery Health Monitor & Smart Pool
    const proxyManager = require('./src/helpers/proxyManager');
    await proxyManager.init();
    const pStatus = proxyManager.getStatus();
    if (pStatus.configured) {
        console.log(`✅ [Proxy] Smart Pool Active (${pStatus.activeCount} online | Best: ${pStatus.url} [${pStatus.bestLatency}])`);
    } else {
        console.log('ℹ️ [Proxy] Smart Pool standby / Direct mode. (Auto-refill running in background)');
    }

    // 4. Check YouTube Auth & Anti-Bot Status (Fast 8s diagnostic)
    const cookiesPath = path.join(__dirname, 'cookies.txt');
    if (fs.existsSync(cookiesPath)) {
        console.log('✅ [Cookies] cookies.txt found.');
    } else {
        console.log('ℹ️ [Cookies] cookies.txt not found. (SoundCloud & oEmbed fallback will be used if YouTube restricts IP)');
    }

    // 5. Check FFmpeg binary
    if (fs.existsSync(cacheManager.ffmpegPath)) {
        console.log(`✅ [FFmpeg] FFmpeg binary is ready: ${cacheManager.ffmpegPath}`);
    } else {
        console.log(`ℹ️ [FFmpeg] System/bundle FFmpeg path: ${cacheManager.ffmpegPath} (will be prepared automatically if needed)`);
    }

    // 6. Check Commands
    if (commandsData && commandsData.length > 0) {
        console.log(`✅ [Commands] Loaded ${commandsData.length} commands successfully.`);
    } else {
        console.log('❌ [Commands] No commands found or loaded!');
        allGood = false;
    }

    // 7. Initialize YouTube Circuit Breaker (Probe in background)
    const youtubeCircuit = require('./src/helpers/youtubeCircuit');
    youtubeCircuit.startProbe(ytDlpPath, () => proxyManager.getNetworkArgString());

    console.log('--------------------------------------\n');
    return allGood;
}

(async () => {
    const isReady = await runStartupCheck();
    if (!isReady) {
        console.error("❌ บอทไม่สามารถเริ่มทำงานได้เนื่องจากระบบหลักหรือไฟล์สำคัญขาดหาย กรุณาเช็ค Log ด้านบนครับ");
        process.exit(1);
    }
    client.login(process.env.DISCORD_TOKEN);
})();
