require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Options, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const QueueManager = require('./src/QueueManager');
const cacheManager = require('./src/CacheManager');
const { createNowPlayingCard, createPreparingCard } = require('./src/helpers/musicCardHelper');
const favoriteManager = require('./src/helpers/favoriteManager');
const AdminServer = require('./src/web/AdminServer');
const subscriptionManager = require('./src/billing/subscriptionManager');
const settingsManager = require('./src/helpers/settingsManager');
const i18n = require('./src/helpers/i18nHelper');
const onboardingHelper = require('./src/helpers/onboardingHelper');
const featureManager = require('./src/helpers/featureManager');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
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

// Smart Auto-Reposition functions for Now Playing Card
async function repositionNowPlayingCard(player) {
    if (!player || player._destroyed || !player.connection) return;
    if (!player.playing || !player.queue?.current) return;
    if (player._repositioning) return;
    player._repositioning = true;

    try {
        if (player._repositionTimeout) {
            clearTimeout(player._repositionTimeout);
            player._repositionTimeout = null;
        }

        if (!player.textId) return;
        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        const track = player.queue.current;
        if (!track) return;

        // Delete previous card to avoid duplicate/floating cards
        if (player.nowPlayingMessage) {
            try {
                await player.nowPlayingMessage.delete().catch(() => {});
            } catch {}
            player.nowPlayingMessage = null;
        }

        const cardData = createNowPlayingCard(player, track);
        const newMsg = await channel.send(cardData);
        player.nowPlayingMessage = newMsg;
        player.messagesSinceCard = 0;
        player.lastRepositionAt = Date.now();
    } catch (err) {
        console.error('[RepositionCard] Error:', err.message);
    } finally {
        player._repositioning = false;
    }
}

function scheduleReposition(player) {
    if (!player || !player.playing || !player.queue?.current) return;
    const notifDisabled = (player.disableNotifications !== undefined)
        ? Boolean(player.disableNotifications)
        : !settingsManager.getGuildNotifications(player.guildId);
    if (notifDisabled) return;
    if (player._repositionTimeout) return;

    const now = Date.now();
    const elapsed = now - (player.lastRepositionAt || 0);
    const delay = Math.max(0, 15000 - elapsed);

    if (delay === 0) {
        repositionNowPlayingCard(player);
    } else {
        player._repositionTimeout = setTimeout(() => {
            player._repositionTimeout = null;
            if (player && player.playing && player.queue?.current && (player.messagesSinceCard || 0) >= 3) {
                repositionNowPlayingCard(player);
            }
        }, delay);
    }
}

// Event เมื่อเริ่มเล่นเพลง
kazagumo.on("playerStart", async (player, track) => {
    if (!player || player._destroyed || !player.connection) return;
    console.log(`[Player] 🎧 Now Playing: "${track?.title}" | Real Source: ${track?.realSource || (track?.uri?.includes('soundcloud.com') ? 'SoundCloud' : 'YouTube')}`);
    if (!player.textId) return;
    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;

    try {
        if (player._repositionTimeout) {
            clearTimeout(player._repositionTimeout);
            player._repositionTimeout = null;
        }

        const notifDisabled = (player.disableNotifications !== undefined)
            ? Boolean(player.disableNotifications)
            : !settingsManager.getGuildNotifications(player.guildId);

        // If notifications are disabled and we already have an active card, edit it silently in-place without triggering a new message notification
        if (notifDisabled && player.nowPlayingMessage) {
            try {
                const cardData = createNowPlayingCard(player, track);
                await player.nowPlayingMessage.edit(cardData);
                player.messagesSinceCard = 0;
                player.lastRepositionAt = Date.now();
                return;
            } catch (editErr) {
                // If message edit fails (e.g. deleted), fall through to send fresh card
            }
        }

        // Delete previous card so the new track card is always at the bottom of the chat
        if (player.nowPlayingMessage) {
            try {
                await player.nowPlayingMessage.delete().catch(() => {});
            } catch {}
            player.nowPlayingMessage = null;
        }

        const cardData = createNowPlayingCard(player, track);
        const msg = await channel.send(cardData);
        player.nowPlayingMessage = msg;
        player.messagesSinceCard = 0;
        player.lastRepositionAt = Date.now();
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
            .setDescription(`❌ ไม่สามารถโหลดเพลง **${trackTitle}** ได้ครับ ขอข้ามไปเพลงถัดไป\n\`${errorMsg}\``);
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
    if (player._repositionTimeout) {
        clearTimeout(player._repositionTimeout);
        player._repositionTimeout = null;
    }
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

    // Clean old cache at startup and sweep periodically (uses CACHE_MAX_AGE_HOURS from .env)
    cacheManager.cleanOldCache();
    setInterval(() => {
        cacheManager.cleanOldCache();
        if (global.gc) global.gc();
    }, 15 * 60 * 1000).unref();

    try {
        await client.application.commands.set(commandsData);
        console.log('✅ Successfully reloaded application (/) commands.');

        // Clean up lingering duplicate guild-level commands from previous gupdate calls
        for (const guild of client.guilds.cache.values()) {
            try {
                const guildCmds = await guild.commands.fetch();
                if (guildCmds && guildCmds.size > 0) {
                    await guild.commands.set([]);
                    console.log(`[Commands] Purged ${guildCmds.size} duplicate guild-level commands from: ${guild.name} (${guild.id})`);
                }
            } catch (err) {
                // Ignore missing permissions in specific guilds
            }
        }
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

// Smart Auto-Reposition trigger on channel chat & commands
client.on('messageCreate', async message => {
    if (!message.guildId) return;
    const player = kazagumo.players.get(message.guildId);
    if (!player || !player.playing || !player.queue?.current) return;
    if (player.textId !== message.channelId) return;
    if (player.nowPlayingMessage && message.id === player.nowPlayingMessage.id) return;

    player.messagesSinceCard = (player.messagesSinceCard || 0) + 1;
    if (player.messagesSinceCard >= 3) {
        scheduleReposition(player);
    }
});

client.on('interactionCreate', async interaction => {
    // 0. Guild Ban Guard (Bypassed for Bot Owners)
    if (interaction.guildId) {
        const ownerHelper = require('./src/helpers/ownerHelper');
        if (!ownerHelper.isOwner(interaction.user?.id)) {
            const banManager = require('./src/moderation/banManager');
            const banInfo = banManager.getBanInfo(interaction.guildId);
            if (banInfo) {
                const timeStr = banInfo.isPermanent ? 'ถาวร (Permanent)' : `<t:${Math.floor(banInfo.expiresAt / 1000)}:R> (<t:${Math.floor(banInfo.expiresAt / 1000)}:f>)`;
                const banEmbed = new EmbedBuilder()
                    .setColor('#EF4444')
                    .setTitle('⛔ เซิร์ฟเวอร์นี้ถูกระงับการใช้งาน (BANNED)')
                    .setDescription(`เซิร์ฟเวอร์นี้ถูกแบนจากระบบ GOOLIX ชั่วคราวหรือถาวร\n\n**เหตุผล:** ${banInfo.reason || 'ละเมิดข้อกำหนดการใช้งาน'}\n**ระยะเวลา:** ${timeStr}\n\nหากคิดว่านี่คือข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบครับ`);
                return interaction.reply({ embeds: [banEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
            }
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
                    content: i18n.t(interaction.guildId, 'STALE_CARD_REMOVED'),
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'NO_PLAYING_TRACK'),
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
                const shuffleAccess = featureManager.checkAccess('shuffle', interaction.guildId);
                if (!shuffleAccess.allowed) {
                    return interaction.reply({
                        content: shuffleAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
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
                    const prepCard = createNowPlayingCard(player, player.queue.current, { isPreparing: true, statusText: i18n.t(interaction.guildId, 'STATUS_REPLAY_PREV') });
                    try {
                        return await interaction.update(prepCard);
                    } catch {}
                }
                return interaction.deferUpdate();
            }
            case 'music_backward': {
                const seekAccess = featureManager.checkAccess('seek', interaction.guildId);
                if (!seekAccess.allowed) {
                    return interaction.reply({
                        content: seekAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
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
                const seekAccess = featureManager.checkAccess('seek', interaction.guildId);
                if (!seekAccess.allowed) {
                    return interaction.reply({
                        content: seekAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
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
                    const prepCard = createNowPlayingCard(player, player.queue.current, { isPreparing: true, statusText: i18n.t(interaction.guildId, 'STATUS_SKIPPING') });
                    try {
                        return await interaction.update(prepCard);
                    } catch {}
                }
                return interaction.deferUpdate();
            }
            case 'music_loop': {
                const loopAccess = featureManager.checkAccess('loop', interaction.guildId);
                if (!loopAccess.allowed) {
                    return interaction.reply({
                        content: loopAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
                player.cycleLoop();
                try {
                    const cardData = createNowPlayingCard(player, player.queue.current);
                    return await interaction.update(cardData);
                } catch {
                    return interaction.deferUpdate();
                }
            }
            case 'music_autoplay': {
                const autoplayAccess = featureManager.checkAccess('autoplay', player.guildId);
                if (!autoplayAccess.allowed) {
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
                        content: autoplayAccess.reason,
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
                const guildId = interaction.guildId;
                const isEn = i18n.isEn(guildId);
                const queue = player.queue;
                const embed = new EmbedBuilder().setColor('#FF69B4');
                const currentTitle = queue.current?.title || 'Unknown';
                let desc = `**🎧 ${isEn ? 'Now Playing:' : 'กำลังเล่น:'}** [${currentTitle}](${queue.current?.uri})\n\n`;
                if (queue.length === 0) {
                    desc += isEn ? 'No upcoming tracks in queue! Feel free to request more songs 🎶' : 'ไม่มีเพลงรอในคิวแล้วครับ สั่งเพลงเพิ่มได้เลย! 🎶';
                } else {
                    desc += `**${isEn ? `Upcoming Queue (${queue.length} songs):` : `คิวรอเล่น (${queue.length} เพลง):`}**\n`;
                    const preview = queue.slice(0, 10);
                    preview.forEach((t, i) => {
                        desc += `**${i + 1}.** [${t.title}](${t.uri}) - <@${t.requester.id}>\n`;
                    });
                    if (queue.length > 10) {
                        desc += `*...${isEn ? `and ${queue.length - 10} more songs` : `และอีก ${queue.length - 10} เพลง`}*`;
                    }
                }
                embed.setTitle(isEn ? '📋 Current Music Queue' : '📋 คิวเพลงปัจจุบัน').setDescription(desc);
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            case 'music_lyrics': {
                const guildId = interaction.guildId;
                const lyricsAccess = featureManager.checkAccess('lyrics', guildId);
                if (!lyricsAccess.allowed) {
                    return interaction.reply({
                        content: lyricsAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const track = player.queue.current;
                const lyricsHelper = require('./src/helpers/lyricsHelper');
                const data = await lyricsHelper.getLyrics(track);

                if (!data || !data.lyrics) {
                    return interaction.followUp({
                        content: i18n.t(guildId, 'LYRICS_NOT_FOUND', { title: track.title }),
                        flags: MessageFlags.Ephemeral
                    });
                }

                let text = data.lyrics;
                if (text.length > 4000) text = text.slice(0, 3995) + '...';

                const embed = new EmbedBuilder()
                    .setColor('#FF69B4')
                    .setTitle(i18n.t(guildId, 'LYRICS_TITLE', { title: data.title || track.title }))
                    .setDescription(text)
                    .setFooter({ text: i18n.t(guildId, 'LYRICS_SOURCE', { source: data.source }) });

                return interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            case 'music_favorite': {
                const guildId = interaction.guildId;
                const favAccess = featureManager.checkAccess('favorite', guildId);
                if (!favAccess.allowed) {
                    return interaction.reply({
                        content: favAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
                const track = player.queue.current;
                const added = favoriteManager.addFavorite(interaction.user.id, track);
                if (added) {
                    return interaction.reply({
                        content: i18n.t(guildId, 'FAV_ADDED', { title: track.title }),
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    return interaction.reply({
                        content: i18n.t(guildId, 'FAV_ALREADY_EXISTS', { title: track.title }),
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
            case 'music_volume': {
                const guildId = interaction.guildId;
                const volAccess = featureManager.checkAccess('volume', guildId);
                if (!volAccess.allowed) {
                    return interaction.reply({
                        content: volAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('vol_30').setLabel('30%').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('vol_60').setLabel('60%').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('vol_100').setLabel('100%').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('vol_130').setLabel('130%').setStyle(ButtonStyle.Danger)
                );
                return interaction.reply({
                    content: i18n.t(guildId, 'VOLUME_SELECT_TITLE', { volume: player.volume || 100 }),
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
            }
            case 'music_stop': {
                const guildId = interaction.guildId;
                await interaction.reply({
                    content: i18n.t(guildId, 'STOPPED'),
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
                try {
                    await interaction.message?.delete().catch(() => {});
                } catch {}
                player.destroy();
                return;
            }
            case 'music_toggle_notifications': {
                const guildId = interaction.guildId;
                const currentDisabled = (player.disableNotifications !== undefined)
                    ? Boolean(player.disableNotifications)
                    : !settingsManager.getGuildNotifications(guildId);

                const nextDisabled = !currentDisabled;
                player.disableNotifications = nextDisabled;
                settingsManager.setGuildNotifications(guildId, !nextDisabled);

                await interaction.reply({
                    content: nextDisabled
                        ? i18n.t(guildId, 'NOTIF_OFF_SUCCESS')
                        : i18n.t(guildId, 'NOTIF_ON_SUCCESS'),
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});

                if (player.nowPlayingMessage && player.queue?.current) {
                    try {
                        const cardData = createNowPlayingCard(player, player.queue.current);
                        await player.nowPlayingMessage.edit(cardData).catch(() => {});
                    } catch (err) {
                        console.error('[music_toggle_notifications] Card update error:', err.message);
                    }
                }
                return;
            }
            case 'music_add_song': {
                const guildId = interaction.guildId;
                try {
                    const modal = new ModalBuilder()
                        .setCustomId('modal_add_song')
                        .setTitle(i18n.t(guildId, 'MODAL_SONG_TITLE'));

                    const songInput = new TextInputBuilder()
                        .setCustomId('song_query')
                        .setLabel(i18n.t(guildId, 'MODAL_SONG_LABEL'))
                        .setPlaceholder(i18n.t(guildId, 'MODAL_SONG_PLACEHOLDER'))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(songInput));
                    return await interaction.showModal(modal);
                } catch (err) {
                    console.error('[music_add_song] Modal error:', err);
                    if (!interaction.replied && !interaction.deferred) {
                        return interaction.reply({ content: i18n.t(guildId, 'GENERIC_ERROR'), flags: MessageFlags.Ephemeral }).catch(() => {});
                    }
                }
                return;
            }
            case 'music_add_playlist': {
                const guildId = interaction.guildId;
                const plAccess = featureManager.checkAccess('playlist', guildId);
                if (!plAccess.allowed) {
                    return interaction.reply({
                        content: plAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
                try {
                    const modal = new ModalBuilder()
                        .setCustomId('modal_add_playlist')
                        .setTitle(i18n.t(guildId, 'MODAL_PLAYLIST_TITLE'));

                    const plInput = new TextInputBuilder()
                        .setCustomId('playlist_query')
                        .setLabel(i18n.t(guildId, 'MODAL_PLAYLIST_LABEL'))
                        .setPlaceholder(i18n.t(guildId, 'MODAL_PLAYLIST_PLACEHOLDER'))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(plInput));
                    return await interaction.showModal(modal);
                } catch (err) {
                    console.error('[music_add_playlist] Modal error:', err);
                    if (!interaction.replied && !interaction.deferred) {
                        return interaction.reply({ content: i18n.t(guildId, 'GENERIC_ERROR'), flags: MessageFlags.Ephemeral }).catch(() => {});
                    }
                }
                return;
            }
            case 'vol_30':
            case 'vol_60':
            case 'vol_100':
            case 'vol_130': {
                const volAccess = featureManager.checkAccess('volume', interaction.guildId);
                if (!volAccess.allowed) {
                    return interaction.reply({
                        content: volAccess.reason,
                        flags: MessageFlags.Ephemeral
                    });
                }
                const volNum = parseInt(customId.replace('vol_', ''), 10);
                player.setVolume(volNum);
                if (player.nowPlayingMessage) {
                    try {
                        const cardData = createNowPlayingCard(player, player.queue.current);
                        await player.nowPlayingMessage.edit(cardData).catch(() => {});
                    } catch {}
                }
                return interaction.update({
                    content: `🔊 ปรับและบันทึกระดับเสียงเป็น **${volNum}%** เรียบร้อยแล้วครับ! (ระบบจำค่านี้ไว้ใช้ตลอด)`,
                    components: []
                });
            }
        }
    }

    // 1.5 Handle Modal Submissions (Add Song & Add Playlist)
    if (interaction.isModalSubmit()) {
        const modalId = interaction.customId;
        if (modalId === 'modal_add_song' || modalId === 'modal_add_playlist') {
            const voiceChannel = interaction.member?.voice?.channel;
            const guildId = interaction.guildId;

            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor('#EF4444').setDescription(i18n.t(guildId, 'VOICE_JOIN_REQUIRED'))],
                    flags: MessageFlags.Ephemeral
                });
            }

            const host = subscriptionManager.getPublicWebUrl();
            const donateUrl = `${host}/donate?guild=${guildId}&guildId=${guildId}&userId=${interaction.user.id}`;
            const donateRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(i18n.t(guildId, 'DONATE_BTN_LABEL'))
                    .setStyle(ButtonStyle.Link)
                    .setURL(donateUrl)
            );

            // Slot Guard Check
            const slotCheck = subscriptionManager.checkStreamSlot(guildId, kazagumo, client);
            if (!slotCheck.allowed) {
                const embed = new EmbedBuilder()
                    .setColor('#FFD600')
                    .setTitle(i18n.t(guildId, 'SLOTS_FULL_TITLE'))
                    .setDescription(slotCheck.message);
                return interaction.reply({ embeds: [embed], components: [donateRow], flags: MessageFlags.Ephemeral });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            if (modalId === 'modal_add_playlist') {
                const plAccess = featureManager.checkAccess('playlist', guildId);
                if (!plAccess.allowed) {
                    return interaction.followUp({ content: plAccess.reason, flags: MessageFlags.Ephemeral });
                }
            }

            const query = modalId === 'modal_add_song'
                ? interaction.fields.getTextInputValue('song_query')
                : interaction.fields.getTextInputValue('playlist_query');

            if (!query || !query.trim()) {
                return interaction.followUp({ content: i18n.t(guildId, 'SPECIFY_QUERY'), flags: MessageFlags.Ephemeral });
            }

            const settingsManager = require('./src/helpers/settingsManager');
            const tierConfig = subscriptionManager.getTierConfig(guildId);

            let player = kazagumo.players.get(guildId);
            if (!player) {
                player = await kazagumo.createPlayer({
                    guildId: guildId,
                    textId: interaction.channelId,
                    voiceId: voiceChannel.id,
                    volume: settingsManager.getGuildVolume(guildId)
                });
            }

            if (player.queue.length >= tierConfig.maxQueue) {
                const embed = new EmbedBuilder()
                    .setColor('#EF4444')
                    .setTitle(i18n.t(guildId, 'QUEUE_LIMIT_TITLE'))
                    .setDescription(i18n.t(guildId, 'QUEUE_LIMIT_FREE'));
                return interaction.followUp({ embeds: [embed], components: [donateRow], flags: MessageFlags.Ephemeral });
            }

            const forcePlaylist = (modalId === 'modal_add_playlist');
            const result = await kazagumo.search(query.trim(), {
                requester: interaction.user,
                forcePlaylist
            });

            if (!result || !result.tracks || !result.tracks.length) {
                return interaction.followUp({ content: i18n.t(guildId, 'TRACK_NOT_FOUND'), flags: MessageFlags.Ephemeral });
            }

            const embed = new EmbedBuilder().setColor('#00FF88');

            if (result.type === 'PLAYLIST') {
                const addedTracks = [];
                let skippedOver30Min = 0;

                for (const track of result.tracks) {
                    if (player.queue.length + addedTracks.length >= tierConfig.maxQueue) break;
                    if (!tierConfig.isSupporter && (track.duration > 1800 || track.isStream)) {
                        skippedOver30Min++;
                        continue;
                    }
                    addedTracks.push(track);
                    player.queue.add(track);
                }

                let msg = `📋 **${result.playlistName || 'Playlist'}**\n\n${i18n.t(guildId, 'PLAYLIST_ADDED')} (${addedTracks.length} tracks)`;
                if (skippedOver30Min > 0) {
                    msg += `\n*(Skipped ${skippedOver30Min} tracks > 30 mins for Free Tier)*`;
                }
                embed.setDescription(msg);
                await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                const track = result.tracks[0];
                if (!tierConfig.isSupporter && (track.duration > 1800 || track.isStream)) {
                    const durationMin = Math.floor((track.duration || 0) / 60);
                    embed.setColor('#FFD600')
                        .setTitle(i18n.t(guildId, 'SONG_TOO_LONG_TITLE'))
                        .setDescription(i18n.t(guildId, 'SONG_TOO_LONG', { duration: `${durationMin} min` }));
                    return interaction.followUp({ embeds: [embed], components: [donateRow], flags: MessageFlags.Ephemeral });
                }

                player.queue.add(track);
                const isPlaying = (player.playing || player._starting);
                const msgKey = !isPlaying ? 'NOW_PLAYING' : 'ADDED_QUEUE';
                embed.setDescription(`🎵 **${track.title}**\n\n${i18n.t(guildId, msgKey)}`);
                await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            if (!player.playing && !player._starting && !player.paused) {
                try {
                    await player.play();
                } catch (error) {
                    console.error('[Modal Play] Play error:', error.message);
                }
            }
            return;
        }
    }

    // 2. Handle Slash Commands
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inGuild()) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#FF69B4').setDescription(i18n.t(null, 'GUILD_ONLY'))],
            flags: MessageFlags.Ephemeral
        });
    }
    if (!interaction.guild) {
        console.error(`[GuildCache] Bot is not in guild ${interaction.guildId} — interaction received from guild the bot has left or cannot access.`);
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor('#FF69B4').setDescription(i18n.t(interaction.guildId, 'BOT_NOT_IN_GUILD'))],
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
            .setDescription('❌ เกิดข้อผิดพลาดในการรันคำสั่งนี้ครับ ขออภัยด้วยครับ');
            
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
