const dbManager = require('../database/dbManager');
const subscriptionManager = require('../billing/subscriptionManager');

const DEFAULT_FEATURES = {
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
    lyrics: {
        id: 'lyrics',
        name: 'Lyrics Search',
        command: '/glyrics',
        description: 'Online synchronized and plain text song lyrics retrieval',
        mode: 'all',
        customMessage: ''
    },
    seek: {
        id: 'seek',
        name: 'Playback Scrubbing & Seek',
        command: '/gseek, /gforward, /gbackward',
        description: 'Jump to specific track timestamp and fast-forward or rewind audio playback',
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
            const fallbackMsg = `ฟังก์ชัน **${feat.name}** (${feat.command}) ปิดปรับปรุงชั่วคราวเพื่อรักษาเสถียรภาพระบบครับ`;
            return {
                allowed: false,
                mode: 'disabled',
                reason: feat.customMessage ? feat.customMessage : fallbackMsg
            };
        }

        if (feat.mode === 'supporter_only') {
            const isSupporter = subscriptionManager.isSupporter(guildId);
            if (!isSupporter) {
                const fallbackMsg = `ฟังก์ชัน **${feat.name}** (${feat.command}) เปิดให้ใช้งานเฉพาะเซิร์ฟเวอร์ผู้สนับสนุน (Supporter VIP) เท่านั้นครับ\n\nพิมพ์ \`/gdonate\` เพื่อดูรายละเอียดการร่วมสนับสนุนเริ่มต้นเพียง 29 บาท/เดือน`;
                return {
                    allowed: false,
                    mode: 'supporter_only',
                    reason: feat.customMessage ? feat.customMessage : fallbackMsg
                };
            }
        }

        return { allowed: true, mode: feat.mode };
    }
}

module.exports = new FeatureManager();
