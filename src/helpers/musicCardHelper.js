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
const settingsManager = require('./settingsManager');
const i18n = require('./i18nHelper');
const featureManager = require('./featureManager');

function createNowPlayingCard(player, track, options = {}) {
    const guildId = player.guildId;
    const isPreparing = !!options.isPreparing;
    const statusText = options.statusText || i18n.t(guildId, 'CARD_PREPARING_STREAM');
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
    const listeningText = i18n.t(guildId, 'CARD_LISTENING', { count: membersCount });

    let sourceBadge = '🔴 YouTube';
    if (track?.realSource) {
        if (track.realSource.includes('Bypass')) {
            sourceBadge = '🟠 SoundCloud (Bypass)';
        } else if (track.realSource.includes('SoundCloud')) {
            sourceBadge = '🟠 SoundCloud';
        } else if (track.realSource.includes('Spotify')) {
            sourceBadge = '🟢 Spotify';
        } else {
            sourceBadge = '🔴 YouTube';
        }
    } else if (track?.uri && track.uri.includes('soundcloud.com')) {
        sourceBadge = '🟠 SoundCloud';
    } else if (track?.uri && track.uri.includes('spotify.com')) {
        sourceBadge = '🟢 Spotify';
    }

    const tierConfig = subscriptionManager.getTierConfig(guildId);
    const isSupporter = tierConfig.isSupporter;
    const isBetaTrial = tierConfig.plan === 'BETA_TRIAL';
    const bufferText = `⚡ ${i18n.t(guildId, 'CARD_BUFFERING')}`;
    const bitrateBadge = isPreparing 
        ? bufferText 
        : (isBetaTrial 
            ? `⚡ ${i18n.t(guildId, 'CARD_SUPPORTER_TIER')} [✦ Beta Trial]` 
            : (isSupporter ? `⚡ ${i18n.t(guildId, 'CARD_SUPPORTER_TIER')}` : `📻 ${i18n.t(guildId, 'CARD_STANDARD_TIER')}`));

    let loopBadge = `🔁 ${i18n.t(guildId, 'CARD_LOOP_OFF')}`;
    if (player.loop === 'track') loopBadge = `🔂 ${i18n.t(guildId, 'CARD_LOOP_TRACK')}`;
    else if (player.loop === 'queue') loopBadge = `🔁 ${i18n.t(guildId, 'CARD_LOOP_QUEUE')}`;

    const volBadge = `🔊 ${player.volume || 100}%`;
    const filterBadge = (!isPreparing && player.audioFilter && player.audioFilter !== 'off') ? `  \`🎛️ ${player.audioFilter}\`` : '';
    const requesterTag = track?.requester ? `  •  👤 <@${track.requester.id || track.requester}>` : '';
    const safeTitle = track?.title || 'Unknown Title';
    const safeAuthor = track?.author || 'Unknown Artist';

    const embedColor = isPreparing ? '#FFA500' : (isSupporter ? '#00FF88' : '#00B0FF');
    const stageTitle = isPreparing ? i18n.t(guildId, 'CARD_SWITCHING_STAGE') : i18n.t(guildId, 'CARD_STAGE_TITLE');

    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({
            name: `${player.manager.client.user.username}  •  ${stageTitle}`,
            iconURL: player.manager.client.user.displayAvatarURL()
        })
        .setTitle(safeTitle)
        .setURL((track?.realSource?.includes('Bypass') && track?.fallbackUri) ? track.fallbackUri : (track?.uri || 'https://discord.com'))
        .setDescription(
            `**${safeAuthor}**${requesterTag}\n\n` +
            (isPreparing ? `\`⏳ ${statusText}\`  \`${bufferText}\`\n\n` : `\`${sourceBadge}\`  \`${bitrateBadge}\`  \`${loopBadge}\`  \`${volBadge}\`${filterBadge}\n\n`) +
            `\`${timeCurrent}\`  ${progressVisual}  \`${timeTotal}\``
        )
        .setFooter({
            text: `🔊 #${channelName}  •  👥 ${listeningText}`
        });

    if (track?.thumbnail) {
        embed.setThumbnail(track.thumbnail);
    }

    const hasPrev = !!(player.queue.previous || (player.previousTracks && player.previousTracks.length > 0));

    const features = featureManager.getFeatures();
    const seekFeature = features.seek;
    const seekEnabled = seekFeature && seekFeature.mode !== 'disabled';
    const seekAccess = featureManager.checkAccess('seek', guildId);

    // Row 1: Playback Controls (Previous, Rewind -10s [if seek enabled], Play/Pause, Forward +10s [if seek enabled], Skip)
    const row1Components = [
        new ButtonBuilder()
            .setCustomId('music_previous')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasPrev)
    ];

    if (seekEnabled) {
        row1Components.push(
            new ButtonBuilder()
                .setCustomId('music_backward')
                .setEmoji('⏪')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!seekAccess.allowed || isStream || isPreparing)
        );
    }

    row1Components.push(
        new ButtonBuilder()
            .setCustomId('music_pause_resume')
            .setEmoji(isPreparing ? '⏳' : (isPaused ? '▶️' : '⏸️'))
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
            .setDisabled(isPreparing)
    );

    if (seekEnabled) {
        row1Components.push(
            new ButtonBuilder()
                .setCustomId('music_forward')
                .setEmoji('⏩')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!seekAccess.allowed || isStream || isPreparing)
        );
    }

    row1Components.push(
        new ButtonBuilder()
            .setCustomId('music_skip')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary)
    );

    const row1 = new ActionRowBuilder().addComponents(row1Components);

    // Row 2: Library & Features (Shuffle, Loop, Queue, Lyrics, Favorites)
    const shuffleDisabled = isPreparing || features.shuffle?.mode === 'disabled';
    const loopDisabled = isPreparing || features.loop?.mode === 'disabled';
    const lyricsDisabled = features.lyrics?.mode === 'disabled';
    const favDisabled = features.favorite?.mode === 'disabled';

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_shuffle')
            .setEmoji('🔀')
            .setLabel(i18n.t(guildId, 'BTN_SHUFFLE'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(shuffleDisabled),
        new ButtonBuilder()
            .setCustomId('music_loop')
            .setEmoji(player.loop === 'track' ? '🔂' : '🔁')
            .setLabel(i18n.t(guildId, 'BTN_LOOP'))
            .setStyle(player.loop !== 'none' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(loopDisabled),
        new ButtonBuilder()
            .setCustomId('music_queue')
            .setEmoji('📋')
            .setLabel(i18n.t(guildId, 'BTN_QUEUE'))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_lyrics')
            .setEmoji('📄')
            .setLabel(i18n.t(guildId, 'BTN_LYRICS'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(lyricsDisabled),
        new ButtonBuilder()
            .setCustomId('music_favorite')
            .setEmoji('💖')
            .setLabel(i18n.t(guildId, 'BTN_FAVORITES'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(favDisabled)
    );

    // Row 3: Quick Controls inside container (Add Song, Playlist, Volume, Autoplay)
    const playlistDisabled = features.playlist?.mode === 'disabled';
    const volumeDisabled = isPreparing || features.volume?.mode === 'disabled';
    const autoplayDisabled = features.autoplay?.mode === 'disabled';

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_add_song')
            .setEmoji('➕')
            .setLabel(i18n.t(guildId, 'BTN_REQUEST_SONG'))
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('music_add_playlist')
            .setEmoji('📑')
            .setLabel(i18n.t(guildId, 'BTN_PLAYLIST'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(playlistDisabled),
        new ButtonBuilder()
            .setCustomId('music_volume')
            .setEmoji('🔊')
            .setLabel(i18n.t(guildId, 'BTN_VOLUME'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(volumeDisabled),
        new ButtonBuilder()
            .setCustomId('music_autoplay')
            .setEmoji('📻')
            .setLabel(player.autoplay ? i18n.t(guildId, 'BTN_AUTOPLAY_ON') : i18n.t(guildId, 'BTN_AUTOPLAY_OFF'))
            .setStyle(player.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(autoplayDisabled)
    );

    const notifDisabled = (player.disableNotifications !== undefined)
        ? Boolean(player.disableNotifications)
        : !settingsManager.getGuildNotifications(guildId);

    // Row 4: Controls outside container (Close App / Stop Player, Toggle Notifications)
    const rowOutside = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_stop')
            .setEmoji('🛑')
            .setLabel(i18n.t(guildId, 'BTN_STOP'))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('music_toggle_notifications')
            .setEmoji(notifDisabled ? '🔔' : '🔕')
            .setLabel(notifDisabled ? i18n.t(guildId, 'BTN_NOTIFICATIONS_ON') : i18n.t(guildId, 'BTN_NOTIFICATIONS_OFF'))
            .setStyle(notifDisabled ? ButtonStyle.Success : ButtonStyle.Secondary)
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
        ? `### ⏳ ${player.manager.client.user.username} • ${stageTitle}\n` +
          `**${safeTitle}**\n\n` +
          `\`⏳ ${statusText}\`  \`${bufferText}\`\n\n` +
          `\`${timeCurrent}\`  ${progressVisual}  \`${timeTotal}\`\n\n` +
          `*🔊 #${channelName}  •  👥 ${listeningText}*`
        : `### [${safeTitle}](${track?.uri || 'https://discord.com'})\n` +
          `**${safeAuthor}**${requesterTag}\n\n` +
          `\`${sourceBadge}\`  \`${bitrateBadge}\`  \`${loopBadge}\`  \`${volBadge}\`${filterBadge}\n\n` +
          `\`${timeCurrent}\`  ${progressVisual}  \`${timeTotal}\`\n\n` +
          `*🔊 #${channelName}  •  👥 ${listeningText}*`;

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

function createPreparingCard(player, track, customStatus = null) {
    const statusText = customStatus || i18n.t(player?.guildId, 'STATUS_PREPARING_NEXT');
    return createNowPlayingCard(player, track, { isPreparing: true, statusText });
}

module.exports = {
    createNowPlayingCard,
    createPreparingCard,
    formatDuration,
    createProgressBar
};

