const dbManager = require('../database/dbManager');
const subscriptionManager = require('../billing/subscriptionManager');
const i18n = require('./i18nHelper');

const DEFAULT_FEATURES = {
    seek: {
        id: 'seek',
        name: 'Playback Scrubbing & Seek',
        command: '/gseek, /gforward, /gbackward',
        description: 'Jump to specific track timestamp and fast-forward or rewind audio playback',
        mode: 'disabled', // Disabled for cluster CPU savings & 0 broken pipe crashes
        customMessage: 'ฟังก์ชันกรอเพลงปิดปรับปรุงชั่วคราวเพื่อเสถียรภาพสูงสุดของระบบ (Playback seek is disabled for cluster stability)'
    },
    filter: {
        id: 'filter',
        name: 'Audio Equalizer & Filter',
        command: '/gfilter',
        description: 'DSP audio equalizer presets and acoustic tone processing (Bass Boost, Nightcore, etc.)',
        mode: 'supporter_only', // 'all' | 'supporter_only' | 'disabled'
        customMessage: ''
    },
    autoplay: {
        id: 'autoplay',
        name: 'Autoplay Engine',
        command: '/gautoplay',
        description: 'Autonomous continuous smart track queueing when playlist reaches end',
        mode: 'supporter_only',
        customMessage: ''
    },
    volume: {
        id: 'volume',
        name: 'Volume Adjustment',
        command: '/gvolume',
        description: 'Digital audio volume gain amplification and attenuation (0-150%)',
        mode: 'all',
        customMessage: ''
    },
    loop: {
        id: 'loop',
        name: 'Track & Queue Loop',
        command: '/gloop',
        description: 'Repeat single track or infinite cyclic playback for queue',
        mode: 'all',
        customMessage: ''
    },
    shuffle: {
        id: 'shuffle',
        name: 'Queue Shuffle',
        command: '/gshuffle',
        description: 'Randomize and permute order of queued tracks',
        mode: 'all',
        customMessage: ''
    },
    lyrics: {
        id: 'lyrics',
        name: 'Lyrics Search',
        command: '/glyrics',
        description: 'Online synchronized and plain text song lyrics retrieval',
        mode: 'all',
        customMessage: ''
    },
    playlist: {
        id: 'playlist',
        name: 'Playlist Loading',
        command: '/gplaylist',
        description: 'Batch enqueue YouTube/SoundCloud public music playlists into queue',
        mode: 'all',
        customMessage: ''
    },
    favorite: {
        id: 'favorite',
        name: 'Personal Favorites',
        command: '/gfav',
        description: 'User-saved custom song bookmarks and instant playlist recalls',
        mode: 'all',
        customMessage: ''
    },
    queue_control: {
        id: 'queue_control',
        name: 'Advanced Queue Operations',
        command: '/gjump, /gmove, /gremove, /gclear',
        description: 'Reorder, jump to song, delete track index, or purge current song queue',
        mode: 'all',
        customMessage: ''
    }
};

class FeatureManager {
    getFeatures() {
        const stored = dbManager.get('featureFlags', 'config') || {};
        const result = {};

        for (const [key, defaultCfg] of Object.entries(DEFAULT_FEATURES)) {
            result[key] = {
                ...defaultCfg,
                ...(stored[key] || {})
            };
        }

        return result;
    }

    updateFeatures(updates = {}) {
        const current = this.getFeatures();
        const newConfig = {};

        for (const [key, val] of Object.entries(updates)) {
            if (current[key] && val && typeof val === 'object') {
                newConfig[key] = {
                    ...current[key],
                    mode: ['all', 'supporter_only', 'disabled'].includes(val.mode) ? val.mode : current[key].mode,
                    customMessage: typeof val.customMessage === 'string' ? val.customMessage.trim() : ''
                };
            }
        }

        // Preserve any feature not included in the update payload
        for (const [key, val] of Object.entries(current)) {
            if (!newConfig[key]) {
                newConfig[key] = val;
            }
        }

        dbManager.set('featureFlags', 'config', newConfig);
        dbManager.save('featureFlags');
        return newConfig;
    }

    checkAccess(featureKey, guildId) {
        const features = this.getFeatures();
        const feat = features[featureKey] || DEFAULT_FEATURES[featureKey];

        if (!feat) {
            return { allowed: true, mode: 'all' };
        }

        if (feat.mode === 'disabled') {
            const fallbackMsg = i18n.t(guildId, 'FEATURE_MAINTENANCE_DESC', { name: feat.name, command: feat.command });
            return {
                allowed: false,
                mode: 'disabled',
                title: i18n.t(guildId, 'FEATURE_MAINTENANCE_TITLE'),
                reason: feat.customMessage ? feat.customMessage : fallbackMsg
            };
        }

        if (feat.mode === 'supporter_only') {
            const isSupporter = subscriptionManager.isSupporter(guildId);
            if (!isSupporter) {
                const fallbackMsg = i18n.t(guildId, 'FEATURE_SUPPORTER_DESC', { name: feat.name, command: feat.command });
                return {
                    allowed: false,
                    mode: 'supporter_only',
                    title: i18n.t(guildId, 'FEATURE_SUPPORTER_TITLE'),
                    reason: feat.customMessage ? feat.customMessage : fallbackMsg
                };
            }
        }

        return { allowed: true, mode: feat.mode };
    }
}

module.exports = new FeatureManager();
