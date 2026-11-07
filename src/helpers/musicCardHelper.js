const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ContainerBuilder, 
    SectionBuilder, 
    ThumbnailBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    MessageFlags 
} = require('discord.js');

function formatDuration(ms) {
    if (!ms || ms < 0 || isNaN(ms)) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const hours = Math.floor(totalSeconds / 3600);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function createProgressBar(currentMs, totalMs, barLength = 15) {
    if (!totalMs || totalMs <= 0 || isNaN(totalMs)) {
        return '━━━━━━━━━━━━━━━';
    }

    const ratio = Math.min(1, Math.max(0, currentMs / totalMs));
    const activeIndex = Math.round(ratio * barLength);

    let bar = '';
    for (let i = 0; i < barLength; i++) {
        if (i === activeIndex) {
            bar += '🔘';
        } else if (i < activeIndex) {
            bar += '━';
        } else {
            bar += '─';
        }
    }
    return bar;
}

const subscriptionManager = require('../billing/subscriptionManager');

function createNowPlayingCard(player, track, options = {}) {
    const isPreparing = !!options.isPreparing;
    const statusText = options.statusText || 'กำลังเตรียมสตรีมเสียง...';
    const isPaused = isPreparing ? false : !!player.paused;
    const currentPosition = isPreparing ? 0 : (player.position || 0);
    const totalDuration = track?.length || 0;
    const isStream = track?.isStream || false;

    const timeCurrent = isPreparing ? '00:00' : formatDuration(currentPosition);
    const timeTotal = isStream ? '🔴 LIVE' : (totalDuration > 0 ? formatDuration(totalDuration) : '--:--');
    const progressVisual = isPreparing 
        ? '⏳ ━━━━━━━━━━━━━━' 
        : (isStream ? '🔴 ━━━━━━━━━━━━━━' : createProgressBar(currentPosition, totalDuration));

    const voiceChannel = player.manager.client.channels.cache.get(player.voiceId);
    const channelName = voiceChannel ? voiceChannel.name : 'Voice Channel';
    const membersCount = voiceChannel ? voiceChannel.members.filter(m => !m.user.bot).size : 1;

    let sourceBadge = '🔴 นกแดง';
    if (track?.realSource) {
        if (track.realSource.includes('Bypass')) {
            sourceBadge = '🟠 เมฆส้ม (Bypass)';
        } else if (track.realSource.includes('SoundCloud')) {
            sourceBadge = '🟠 เมฆส้ม';
        } else if (track.realSource.includes('Spotify')) {
            sourceBadge = '🟢 นกเขียว';
        } else {
            sourceBadge = '🔴 นกแดง';
        }
    } else if (track?.uri && track.uri.includes('soundcloud.com')) {
        sourceBadge = '🟠 เมฆส้ม';
    } else if (track?.uri && track.uri.includes('spotify.com')) {
        sourceBadge = '🟢 นกเขียว';
    }

    const isSupporter = subscriptionManager.isSupporter(player.guildId);
    const bitrateBadge = isPreparing ? '⚡ Buffering' : (isSupporter ? '⚡ 96k Supporter' : '📻 64k Standard');

    let loopBadge = '🔁 Off';
    if (player.loop === 'track') loopBadge = '🔂 Track';
    else if (player.loop === 'queue') loopBadge = '🔁 Queue';

    const volBadge = `🔊 ${player.volume || 100}%`;
    const filterBadge = (!isPreparing && player.audioFilter && player.audioFilter !== 'off') ? `  \`🎛️ ${player.audioFilter}\`` : '';
    const requesterTag = track?.requester ? `  •  👤 <@${track.requester.id || track.requester}>` : '';
    const safeTitle = track?.title || 'Unknown Title';
    const safeAuthor = track?.author || 'Unknown Artist';

    const embedColor = isPreparing ? '#FFA500' : (isSupporter ? '#00FF88' : '#00B0FF');
    const stageTitle = isPreparing ? 'Switching Track ⏳' : 'Cosmic Stage 🟢';

    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({
            name: `${player.manager.client.user.username}  •  ${stageTitle}`,
            iconURL: player.manager.client.user.displayAvatarURL()
        })
        .setTitle(safeTitle)
        .setURL(track?.uri || 'https://discord.com')
        .setDescription(
            `**${safeAuthor}**${requesterTag}\n\n` +
            (isPreparing ? `\`⏳ ${statusText}\`  \`⚡ Buffering...\`\n\n` : `\`${sourceBadge}\`  \`${bitrateBadge}\`  \`${loopBadge}\`  \`${volBadge}\`${filterBadge}\n\n`) +
            `\`${timeCurrent}\`  ${progressVisual}  \`${timeTotal}\``
        )
        .setFooter({
            text: `🔊 #${channelName}  •  👥 ${membersCount} listening`
        });

    if (track?.thumbnail) {
        embed.setThumbnail(track.thumbnail);
    }

    const hasPrev = !!(player.queue.previous || (player.previousTracks && player.previousTracks.length > 0));

    // Row 1: Playback & Seek Controls (Previous, Rewind -10s, Play/Pause, Forward +10s, Skip)
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_previous')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasPrev),
        new ButtonBuilder()
            .setCustomId('music_backward')
            .setEmoji('⏪')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isStream || isPreparing),
        new ButtonBuilder()
            .setCustomId('music_pause_resume')
            .setEmoji(isPreparing ? '⏳' : (isPaused ? '▶️' : '⏸️'))
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
            .setDisabled(isPreparing),
        new ButtonBuilder()
            .setCustomId('music_forward')
            .setEmoji('⏩')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isStream || isPreparing),
        new ButtonBuilder()
            .setCustomId('music_skip')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary)
    );

    // Row 2: Library & Features (Shuffle, Loop, Queue, Lyrics, Favorites)
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_shuffle')
            .setEmoji('🔀')
            .setLabel('Shuffle')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isPreparing),
        new ButtonBuilder()
            .setCustomId('music_loop')
            .setEmoji(player.loop === 'track' ? '🔂' : '🔁')
            .setLabel('Loop')
            .setStyle(player.loop !== 'none' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(isPreparing),
        new ButtonBuilder()
            .setCustomId('music_queue')
            .setEmoji('📋')
            .setLabel('Queue')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_lyrics')
            .setEmoji('📄')
            .setLabel('Lyrics')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_favorite')
            .setEmoji('💖')
            .setLabel('Favorites')
            .setStyle(ButtonStyle.Secondary)
    );

    // Row 3: Quick Controls inside container (Add Song, Playlist, Volume, Autoplay)
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_add_song')
            .setEmoji('➕')
            .setLabel('ขอเพลง')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('music_add_playlist')
            .setEmoji('📑')
            .setLabel('เพลย์ลิสต์')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_volume')
            .setEmoji('🔊')
            .setLabel('Volume')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isPreparing),
        new ButtonBuilder()
            .setCustomId('music_autoplay')
            .setEmoji('📻')
            .setLabel(player.autoplay ? 'Autoplay On' : 'Autoplay Off')
            .setStyle(player.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    // Row 4: Controls outside container (Close App / Stop Player)
    const rowOutside = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_stop')
            .setEmoji('🛑')
            .setLabel('ปิดแอป')
            .setStyle(ButtonStyle.Danger)
    );

    const isLegacy = (process.env.CARD_STYLE === 'legacy');
    if (isLegacy) {
        return {
            embeds: [embed],
            components: [row1, row2, row3, rowOutside]
        };
    }

    // Modern Discord Components V2: Container layout (Accent colored bar enclosing all text & buttons)
    const accentColorInt = isPreparing ? 0xFFA500 : (isSupporter ? 0x00FF88 : 0x00B0FF);
    const contentMarkdown = isPreparing
        ? `### ⏳ ${player.manager.client.user.username} • Switching Track\n` +
          `**${safeTitle}**\n\n` +
          `\`⏳ ${statusText}\`  \`⚡ Buffering...\`\n\n` +
          `\`${timeCurrent}\`  ${progressVisual}  \`${timeTotal}\`\n\n` +
          `*🔊 #${channelName}  •  👥 ${membersCount} listening*`
        : `### [${safeTitle}](${track?.uri || 'https://discord.com'})\n` +
          `**${safeAuthor}**${requesterTag}\n\n` +
          `\`${sourceBadge}\`  \`${bitrateBadge}\`  \`${loopBadge}\`  \`${volBadge}\`${filterBadge}\n\n` +
          `\`${timeCurrent}\`  ${progressVisual}  \`${timeTotal}\`\n\n` +
          `*🔊 #${channelName}  •  👥 ${membersCount} listening*`;

    const section = new SectionBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(contentMarkdown)
    );

    if (track?.thumbnail && typeof track.thumbnail === 'string' && track.thumbnail.startsWith('http')) {
        try {
            section.setThumbnailAccessory(new ThumbnailBuilder().setURL(track.thumbnail));
        } catch {}
    }

    const container = new ContainerBuilder()
        .setAccentColor(accentColorInt)
        .addSectionComponents(section)
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(row1, row2, row3);

    return {
        embeds: [],
        components: [container, rowOutside],
        flags: [MessageFlags.IsComponentsV2]
    };
}

function createPreparingCard(player, track, customStatus = 'กำลังเตรียมเพลงถัดไป...') {
    return createNowPlayingCard(player, track, { isPreparing: true, statusText: customStatus });
}

module.exports = {
    createNowPlayingCard,
    createPreparingCard,
    formatDuration,
    createProgressBar
};

