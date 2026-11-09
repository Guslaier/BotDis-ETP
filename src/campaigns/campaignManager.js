const crypto = require('crypto');
const dbManager = require('../database/dbManager');

class CampaignManager {
    constructor() {
        this._initDefaultCampaign();
    }

    _initDefaultCampaign() {
        const campaigns = dbManager.get('systemCampaigns') || {};
        if (Object.keys(campaigns).length === 0) {
            const now = Date.now();
            const defaultId = 'beta-launch-7d';
            const defaultCampaign = {
                id: defaultId,
                name: 'GOOLIX Grand Launch Beta (7 Days Free Supporter)',
                isActive: true,
                startsAt: now,
                endsAt: now + (7 * 24 * 3600 * 1000),
                perks: {
                    grantSupporterToAll: true,
                    maxConcurrentRooms: 50
                },
                topupPolicy: {
                    allowTopup: true,
                    expiryPolicy: 'deferred_stack', // 'deferred_stack' | 'fixed_target' | 'standard'
                    fixedTargetDate: null,
                    maxAccumulatedDays: 37
                },
                announcement: {
                    badgeText: '✦ BETA LAUNCH',
                    bannerTitle: '✦ GOOLIX ฉลองเปิดตัว! ปลดล็อก SUPPORTER ให้ลองฟรีทุกเซิร์ฟ',
                    bannerSubtitle: 'มาเปิดให้ลองของจริงกันก่อน! จัดเต็ม หน้า UI คุมเพลงสวยๆ กดง่ายไม่ต้องพิมพ์คำสั่งบ่อย, อัดคิวเพลงยาวๆ, แล้วก็ เล่นตรงจากลิงก์ 100% เพลงไม่เพี้ยน ไม่สลับเวอร์ชัน แน่นอน ฟังฟรีได้เลย 7 วันเต็ม',
                    infoPoints: [
                        'จำกัด 50 ห้องพร้อมกันนะ: ช่วงนี้เปิดเพื่อเทสระบบ ดูว่าเซิร์ฟรับไหวแค่ไหน เลยจำกัดให้เปิดพร้อมกันได้มากสุด 50 ห้อง ณ ช่วงเวลานั้น ถ้าเต็มอาจจะต้องรอคิวแป๊บนึง',
                        'ครบ 7 วันแล้วเป็นไงต่อ?: ระบบจะเปิดห้องสายฟรีให้ใช้งานตามปกติ ส่วนสิทธิ์ SUPPORTER กับช่อง Priority ลัดคิว จะกลับไปเป็นของคนที่ร่วมโดเนทช่วยค่าเซิร์ฟตามเดิม',
                        'ช่วยกันดันได้นะ: ถ้าชอบบอทตัวนี้ แล้วมีคนช่วยโดเนทซัพพอร์ตมากพอจนเซิร์ฟเวอร์อยู่รอด เดี๋ยวเราเอาเงินไปเปิดโหนดเพิ่ม แล้วขยายห้องให้สายฟรีได้ฟังกันเยอะขึ้นอีกแน่นอน!'
                    ],
                    showCountdown: true
                },
                createdAt: now,
                updatedAt: now
            };
            dbManager.set('systemCampaigns', defaultId, defaultCampaign);
        }
    }

    getAllCampaigns() {
        const raw = dbManager.get('systemCampaigns') || {};
        return Object.values(raw).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    getCampaign(id) {
        if (!id) return null;
        const raw = dbManager.get('systemCampaigns') || {};
        return raw[id] || null;
    }

    getActiveCampaign() {
        const campaigns = this.getAllCampaigns();
        const now = Date.now();
        // Priority: isActive and within startsAt..endsAt
        const active = campaigns.find(c => c.isActive && now >= c.startsAt && now <= c.endsAt);
        return active || null;
    }

    createCampaign(data) {
        const now = Date.now();
        const id = data.id && typeof data.id === 'string' && data.id.trim()
            ? data.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
            : `camp-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

        const campaign = {
            id,
            name: data.name || 'New Campaign',
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
            startsAt: data.startsAt ? Number(data.startsAt) : now,
            endsAt: data.endsAt ? Number(data.endsAt) : now + (7 * 24 * 3600 * 1000),
            perks: {
                grantSupporterToAll: Boolean(data.perks?.grantSupporterToAll),
                maxConcurrentRooms: Number(data.perks?.maxConcurrentRooms) || 50
            },
            topupPolicy: {
                allowTopup: data.topupPolicy?.allowTopup !== false,
                expiryPolicy: data.topupPolicy?.expiryPolicy || 'deferred_stack',
                fixedTargetDate: data.topupPolicy?.fixedTargetDate ? Number(data.topupPolicy.fixedTargetDate) : null,
                maxAccumulatedDays: Number(data.topupPolicy?.maxAccumulatedDays) || 37
            },
            announcement: {
                badgeText: data.announcement?.badgeText || '✦ CAMPAIGN',
                bannerTitle: data.announcement?.bannerTitle || '',
                bannerSubtitle: data.announcement?.bannerSubtitle || '',
                infoPoints: Array.isArray(data.announcement?.infoPoints) ? data.announcement.infoPoints : [],
                showCountdown: data.announcement?.showCountdown !== false
            },
            createdAt: now,
            updatedAt: now
        };

        dbManager.set('systemCampaigns', id, campaign);
        return campaign;
    }

    updateCampaign(id, data) {
        const existing = this.getCampaign(id);
        if (!existing) return null;

        const now = Date.now();
        const updated = {
            ...existing,
            name: data.name !== undefined ? data.name : existing.name,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
            startsAt: data.startsAt !== undefined ? Number(data.startsAt) : existing.startsAt,
            endsAt: data.endsAt !== undefined ? Number(data.endsAt) : existing.endsAt,
            perks: {
                grantSupporterToAll: data.perks?.grantSupporterToAll !== undefined
                    ? Boolean(data.perks.grantSupporterToAll)
                    : existing.perks?.grantSupporterToAll,
                maxConcurrentRooms: data.perks?.maxConcurrentRooms !== undefined
                    ? Number(data.perks.maxConcurrentRooms)
                    : (existing.perks?.maxConcurrentRooms || 50)
            },
            topupPolicy: {
                allowTopup: data.topupPolicy?.allowTopup !== undefined
                    ? Boolean(data.topupPolicy.allowTopup)
                    : existing.topupPolicy?.allowTopup,
                expiryPolicy: data.topupPolicy?.expiryPolicy || existing.topupPolicy?.expiryPolicy || 'deferred_stack',
                fixedTargetDate: data.topupPolicy?.fixedTargetDate !== undefined
                    ? (data.topupPolicy.fixedTargetDate ? Number(data.topupPolicy.fixedTargetDate) : null)
                    : existing.topupPolicy?.fixedTargetDate,
                maxAccumulatedDays: data.topupPolicy?.maxAccumulatedDays !== undefined
                    ? Number(data.topupPolicy.maxAccumulatedDays)
                    : (existing.topupPolicy?.maxAccumulatedDays || 37)
            },
            announcement: {
                badgeText: data.announcement?.badgeText !== undefined
                    ? data.announcement.badgeText
                    : (existing.announcement?.badgeText || '✦ CAMPAIGN'),
                bannerTitle: data.announcement?.bannerTitle !== undefined
                    ? data.announcement.bannerTitle
                    : existing.announcement?.bannerTitle,
                bannerSubtitle: data.announcement?.bannerSubtitle !== undefined
                    ? data.announcement.bannerSubtitle
                    : existing.announcement?.bannerSubtitle,
                infoPoints: Array.isArray(data.announcement?.infoPoints)
                    ? data.announcement.infoPoints
                    : (existing.announcement?.infoPoints || []),
                showCountdown: data.announcement?.showCountdown !== undefined
                    ? Boolean(data.announcement.showCountdown)
                    : existing.announcement?.showCountdown
            },
            updatedAt: now
        };

        dbManager.set('systemCampaigns', id, updated);
        return updated;
    }

    toggleCampaign(id, isActive) {
        const campaign = this.getCampaign(id);
        if (!campaign) return null;
        campaign.isActive = isActive !== undefined ? Boolean(isActive) : !campaign.isActive;
        campaign.updatedAt = Date.now();
        dbManager.set('systemCampaigns', id, campaign);
        return campaign;
    }

    deleteCampaign(id) {
        const campaign = this.getCampaign(id);
        if (!campaign) return false;
        dbManager.delete('systemCampaigns', id);
        return true;
    }

    /**
     * Calculates new expiration timestamp based on active campaign policy
     * @param {number} currentExpiresAt Current guild expiresAt timestamp
     * @param {number} cycleCount Number of 30-day cycles being added
     * @param {number} now Current timestamp
     */
    calculateNewExpiry(currentExpiresAt, cycleCount = 1, now = Date.now()) {
        const active = this.getActiveCampaign();
        const cycleDaysMs = cycleCount * 30 * 24 * 3600 * 1000;

        if (!active || !active.topupPolicy) {
            // Standard stacking
            const base = (currentExpiresAt && currentExpiresAt > now) ? currentExpiresAt : now;
            return base + cycleDaysMs;
        }

        const policy = active.topupPolicy.expiryPolicy || 'deferred_stack';

        if (policy === 'deferred_stack') {
            // Start stacking from the end of the campaign, or currentExpiresAt, whichever is further
            const base = Math.max(active.endsAt || now, currentExpiresAt > now ? currentExpiresAt : now);
            let targetExpiry = base + cycleDaysMs;
            if (active.topupPolicy.maxAccumulatedDays) {
                const maxCap = now + (active.topupPolicy.maxAccumulatedDays * 24 * 3600 * 1000);
                if (targetExpiry > maxCap) targetExpiry = maxCap;
            }
            return targetExpiry;
        }

        if (policy === 'fixed_target') {
            // Snap to designated target date or campaign end date
            return active.topupPolicy.fixedTargetDate || active.endsAt;
        }

        // Default standard
        const base = (currentExpiresAt && currentExpiresAt > now) ? currentExpiresAt : now;
        return base + cycleDaysMs;
    }
}

module.exports = new CampaignManager();
