const EventEmitter = require('events');
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const dbManager = require('../database/dbManager');

class SubscriptionManager extends EventEmitter {
    constructor() {
        super();
        this._initDefaultConfig();
        this._sweepTimer = null;
        this._lastYtDlpUpdateDay = -1;
    }

    _initDefaultConfig() {
        const existing = dbManager.get('billingConfig', 'config') || {};
        const defaults = {
            paymentMode: process.env.PAYMENT_MODE || 'sandbox', // 'sandbox' | 'production'
            price30Days: parseInt(process.env.PRICE_30_DAYS || '29', 10),
            maxFreeStreams: parseInt(process.env.MAX_FREE_STREAMS || '6', 10),
            maxTotalStreams: parseInt(process.env.MAX_TOTAL_STREAMS || '12', 10),
            maxReferralMonths: parseInt(process.env.MAX_REFERRAL_MONTHS || '6', 10),
            phoneNumber: process.env.TMW_PHONE_NUMBER || '',
            publicWebUrl: process.env.PUBLIC_WEB_URL || '',
            referralEnabled: true,
            referralMinTopup: 29,
            referralRewardDays: 7,
            referralExpiresAt: null
        };
        for (const [k, v] of Object.entries(defaults)) {
            if (existing[k] === undefined) {
                existing[k] = v;
            }
        }
        dbManager.set('billingConfig', 'config', existing);
    }

    getConfig() {
        return dbManager.get('billingConfig', 'config') || {};
    }

    updateConfig(newConfig) {
        const current = this.getConfig();
        const merged = { ...current, ...newConfig };
        dbManager.set('billingConfig', 'config', merged);
        return merged;
    }

    getPublicWebUrl() {
        const config = this.getConfig();
        if (config.publicWebUrl && typeof config.publicWebUrl === 'string' && config.publicWebUrl.trim()) {
            return config.publicWebUrl.trim().replace(/\/+$/, '');
        }
        if (process.env.PUBLIC_WEB_URL) {
            return process.env.PUBLIC_WEB_URL.trim().replace(/\/+$/, '');
        }
        const publicPort = process.env.PUBLIC_WEB_PORT || '11901';
        return `http://${process.env.PUBLIC_IP || '15.235.164.106'}:${publicPort}`;
    }

    canAcceptTopup(guildId) {
        if (!guildId) return { allowed: false, error: 'กรุณาระบุรหัสเซิร์ฟเวอร์ครับ' };
        const sub = this.getGuildSubscription(guildId);
        const campaignManager = require('../campaigns/campaignManager');
        const activeCamp = campaignManager.getActiveCampaign();
        const now = Date.now();

        const maxAccumulatedDays = activeCamp?.topupPolicy?.maxAccumulatedDays || 90;
        const maxAdvanceDays = activeCamp ? Math.max(7, maxAccumulatedDays - 30) : 60;

        if (activeCamp?.topupPolicy && activeCamp.topupPolicy.allowTopup === false) {
            return {
                allowed: false,
                remainingDays: 0,
                maxDays: maxAdvanceDays,
                maxAccumulatedDays,
                error: 'ระบบปิดรับการสนับสนุนชั่วคราวระหว่างช่วงแคมเปญครับ'
            };
        }

        if (sub && sub.plan === 'SUPPORTER' && sub.expiresAt > now) {
            const remainingDays = Math.ceil((sub.expiresAt - now) / (24 * 3600 * 1000));
            if (remainingDays > maxAdvanceDays) {
                return {
                    allowed: false,
                    remainingDays,
                    maxDays: maxAdvanceDays,
                    maxAccumulatedDays,
                    error: activeCamp
                        ? `ขณะนี้อยู่ในช่วงทดสอบระบบ (${activeCamp.name}) เซิร์ฟเวอร์นี้มีสิทธิ์ใช้งานอยู่แล้ว จึงจำกัดการสนับสนุนล่วงหน้าสูงสุดไม่เกิน ${maxAccumulatedDays} วัน เพื่อไม่ให้เกิดภาระผูกพันระยะยาว โดยจะเปิดรับรอบใหม่เมื่อวันคงเหลือต่ำกว่า ${maxAdvanceDays} วัน`
                        : `เซิร์ฟเวอร์นี้มีวันใช้งานคงเหลือเกิน ${maxAdvanceDays} วันแล้ว (เหลือ ${remainingDays} วัน) จะสามารถเติมรอบใหม่ได้เมื่อวันคงเหลือต่ำกว่า ${maxAdvanceDays} วัน`
                };
            }
            return { allowed: true, remainingDays, maxDays: maxAdvanceDays, maxAccumulatedDays };
        }
        return { allowed: true, remainingDays: 0, maxDays: maxAdvanceDays, maxAccumulatedDays };
    }

    _generateReferralCode(guildId) {
        const hash = crypto.createHash('md5').update(`ref:${guildId}`).digest('hex').slice(0, 6).toUpperCase();
        return `REF-${hash}`;
    }

    getGuildSubscription(guildId, guildName = '') {
        if (!guildId) return null;
        const subs = dbManager.get('subscriptions') || {};
        let sub = subs[guildId];

        if (!sub) {
            sub = {
                guildId,
                guildName: guildName || 'Unknown Server',
                plan: 'FREE',
                source: 'FREE',
                expiresAt: 0,
                earlyBirdUsed: false,
                referralCode: this._generateReferralCode(guildId),
                referredByGuildId: null,
                referralRewardTriggered: false,
                referralCount: 0,
                referralBonusMonths: 0,
                cumulativePaidBaht: 0,
                balanceBaht: 0,
                lastDepositAt: null,
                audioFilter: 'off',
                warned3Days: false,
                updatedAt: Date.now()
            };
            dbManager.set('subscriptions', guildId, sub);
        } else if (!sub.referralCode) {
            sub.referralCode = this._generateReferralCode(guildId);
            dbManager.set('subscriptions', guildId, sub);
        }

        if (sub.balanceBaht > 0 && sub.lastDepositAt) {
            const POT_INACTIVITY_LIMIT_MS = 60 * 24 * 3600 * 1000;
            if (Date.now() - sub.lastDepositAt > POT_INACTIVITY_LIMIT_MS) {
                sub.balanceBaht = 0;
                dbManager.set('subscriptions', guildId, sub);
            }
        }

        if (guildName && sub.guildName !== guildName) {
            sub.guildName = guildName;
            dbManager.set('subscriptions', guildId, sub);
        }

        return sub;
    }

    isSupporter(guildId) {
        const campaignManager = require('../campaigns/campaignManager');
        const activeCamp = campaignManager.getActiveCampaign();
        if (activeCamp?.perks?.grantSupporterToAll) {
            return true;
        }

        const sub = this.getGuildSubscription(guildId);
        if (!sub) return false;
        if (sub.plan === 'SUPPORTER' && sub.expiresAt > Date.now()) {
            return true;
        }
        if (sub.plan === 'SUPPORTER' && sub.expiresAt <= Date.now()) {
            // Expired, auto-downgrade
            sub.plan = 'FREE';
            sub.audioFilter = 'off';
            dbManager.set('subscriptions', guildId, sub);
        }
        return false;
    }

    getTierConfig(guildId) {
        const supporter = this.isSupporter(guildId);
        const sub = this.getGuildSubscription(guildId);
        const campaignManager = require('../campaigns/campaignManager');
        const activeCamp = campaignManager.getActiveCampaign();
        const isTrialCampaign = Boolean(activeCamp?.perks?.grantSupporterToAll && (!sub || sub.plan !== 'SUPPORTER' || sub.expiresAt <= Date.now()));

        return {
            isSupporter: supporter,
            plan: supporter ? (isTrialCampaign ? 'BETA_TRIAL' : 'SUPPORTER') : 'FREE',
            campaignName: isTrialCampaign ? activeCamp.name : null,
            campaignEndsAt: isTrialCampaign ? activeCamp.endsAt : null,
            expiresAt: sub ? sub.expiresAt : 0,
            referralCode: sub ? sub.referralCode : '',
            audioFilter: (supporter && sub) ? (sub.audioFilter || 'off') : 'off',
            maxQueue: supporter ? 100 : 15,
            maxPlaylistTracks: supporter ? 25 : 5,
            maxSongDuration: supporter ? Infinity : 600, // 10 minutes for free
            bitrate: supporter ? '96k' : '64k',
            allowAutoplay: supporter,
            allowFilter: supporter
        };
    }

    setGuildAudioFilter(guildId, filter) {
        if (!this.isSupporter(guildId)) return 'off';
        const sub = this.getGuildSubscription(guildId);
        if (!sub) return 'off';
        sub.audioFilter = filter || 'off';
        dbManager.set('subscriptions', guildId, sub);
        return sub.audioFilter;
    }

    downgradeGuildToFree(guildId, kazagumo = null) {
        const sub = this.getGuildSubscription(guildId);
        if (sub) {
            sub.plan = 'FREE';
            sub.audioFilter = 'off';
            sub.updatedAt = Date.now();
            dbManager.set('subscriptions', guildId, sub);
        }

        const settingsManager = require('../helpers/settingsManager');
        settingsManager.setGuildAutoplay(guildId, false);

        if (kazagumo && kazagumo.players) {
            const player = kazagumo.players.get(guildId);
            if (player) {
                if (typeof player.enforceTierLimits === 'function') {
                    player.enforceTierLimits();
                }
                if (player.nowPlayingMessage && player.queue?.current) {
                    try {
                        const { createNowPlayingCard } = require('../helpers/musicCardHelper');
                        const cardData = createNowPlayingCard(player, player.queue.current);
                        player.nowPlayingMessage.edit(cardData).catch(() => {});
                    } catch {}
                }
            }
        }
        console.log(`[SubscriptionManager] Enforced FREE downgrade on guild ${guildId} (Supporter features stripped).`);
    }

    /**
     * Stateless Live Scan of Active Voice Streams across all guilds.
     */
    getLiveStreamStats(kazagumo, client) {
        if (!kazagumo || !kazagumo.players) {
            return { total: 0, free: 0, supporter: 0 };
        }

        let total = 0;
        let free = 0;
        let supporter = 0;

        for (const [guildId, player] of kazagumo.players.entries()) {
            if (player && player.connection && !player._destroyed) {
                total++;
                if (this.isSupporter(guildId)) {
                    supporter++;
                } else {
                    free++;
                }
            }
        }

        return { total, free, supporter };
    }

    /**
     * Checks if guild is allowed to start playing music based on slot quotas.
     */
    checkStreamSlot(guildId, kazagumo, client) {
        const banManager = require('../moderation/banManager');
        const banInfo = banManager.getBanInfo(guildId);
        if (banInfo) {
            const timeStr = banInfo.isPermanent ? 'ถาวร (Permanent)' : `เหลือ ${Math.max(1, Math.ceil((banInfo.expiresAt - Date.now()) / (24 * 3600 * 1000)))} วัน`;
            return {
                allowed: false,
                reason: 'GUILD_BANNED',
                message: `เซิร์ฟเวอร์นี้ถูกระงับการใช้งาน (${timeStr}) เนื่องจาก: ${banInfo.reason}`
            };
        }

        const config = this.getConfig();
        const campaignManager = require('../campaigns/campaignManager');
        const activeCamp = campaignManager.getActiveCampaign();

        const maxFree = config.maxFreeStreams || 6;
        let maxTotal = config.maxTotalStreams || 12;
        if (activeCamp?.perks?.maxConcurrentRooms) {
            maxTotal = activeCamp.perks.maxConcurrentRooms;
        }

        const isSupporter = this.isSupporter(guildId);
        const stats = this.getLiveStreamStats(kazagumo, client);

        if (isSupporter) {
            if (stats.total >= maxTotal) {
                return {
                    allowed: false,
                    reason: 'CLUSTER_FULL',
                    message: activeCamp?.perks?.grantSupporterToAll
                        ? `ขณะนี้มีห้องเปิดใช้งานครบโควตาทดสอบ ${maxTotal} ห้องพร้อมกันแล้ว กรุณารอสักครู่แล้วลองใหม่อีกครั้งครับ`
                        : 'ขณะนี้ช่องสัญญาณเซิร์ฟเวอร์เต็มชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้งครับ'
                };
            }
            return { allowed: true, slotType: 'SUPPORTER_PRIORITY' };
        }

        // Free tier checks
        if (stats.total >= maxTotal) {
            return {
                allowed: false,
                reason: 'CLUSTER_FULL',
                message: 'ขณะนี้ช่องสัญญาณเซิร์ฟเวอร์เต็มชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้งครับ'
            };
        }

        if (stats.free >= maxFree) {
            return {
                allowed: false,
                reason: 'FREE_SLOTS_FULL',
                current: stats.free,
                max: maxFree,
                message: `ขณะนี้ช่องสัญญาณทั่วไปเต็มแล้ว (${stats.free}/${maxFree} ห้อง) — ร่วมสนับสนุนเซิร์ฟเวอร์เพื่อเข้าใช้ช่องทางด่วนได้ทันทีครับ!`
            };
        }

        return { allowed: true, slotType: 'FREE_SLOT' };
    }

    /**
     * Process a verified donation from TrueMoney or Sandbox.
     */
    processDonationSuccess(params) {
        const {
            guildId,
            guildName,
            userId,
            amountBaht,
            voucherCode,
            referralCode,
            isSandbox
        } = params;

        const config = this.getConfig();
        const price30Days = config.price30Days || 29;
        const maxReferralMonths = config.maxReferralMonths || 6;
        const referralEnabled = config.referralEnabled !== false;
        const referralMinTopup = typeof config.referralMinTopup === 'number' ? config.referralMinTopup : 29;
        const referralRewardDays = typeof config.referralRewardDays === 'number' ? config.referralRewardDays : 7;
        const referralExpiresAt = config.referralExpiresAt || null;

        const sub = this.getGuildSubscription(guildId, guildName);
        const now = Date.now();

        // Check pot inactivity (60 days)
        const POT_INACTIVITY_LIMIT_MS = 60 * 24 * 3600 * 1000;
        if (sub.balanceBaht > 0 && sub.lastDepositAt && (now - sub.lastDepositAt > POT_INACTIVITY_LIMIT_MS)) {
            sub.balanceBaht = 0;
        }

        const previousBalance = sub.balanceBaht || 0;
        const totalAvailable = previousBalance + amountBaht;
        const PRICE_PER_CYCLE = price30Days;
        const cyclesUnlocked = Math.floor(totalAvailable / PRICE_PER_CYCLE);
        const remainingBalance = totalAvailable % PRICE_PER_CYCLE;
        const addedDays = cyclesUnlocked * 30;
        const addedMs = addedDays * 24 * 3600 * 1000;

        sub.balanceBaht = remainingBalance;
        sub.lastDepositAt = now;
        sub.cumulativePaidBaht = (sub.cumulativePaidBaht || 0) + amountBaht;
        sub.updatedAt = now;

        if (cyclesUnlocked > 0) {
            const campaignManager = require('../campaigns/campaignManager');
            sub.expiresAt = campaignManager.calculateNewExpiry(sub.expiresAt, cyclesUnlocked, now);
            sub.plan = 'SUPPORTER';
            sub.source = isSandbox ? 'SANDBOX_DONATION' : 'DONATION';
            sub.warned3Days = false;
        }

        let referralBonusAwarded = false;
        let referrerGuildName = '';
        let referrerGuildId = null;

        // Referral handling
        const isSeasonActive = referralEnabled && (!referralExpiresAt || now <= referralExpiresAt);
        let referrer = null;
        const cleanRef = (referralCode || '').trim().toUpperCase();
        const allSubs = dbManager.get('subscriptions') || {};

        if (cleanRef) {
            referrer = Object.values(allSubs).find(s => s.referralCode === cleanRef);
        } else if (sub.referredByGuildId) {
            referrer = allSubs[sub.referredByGuildId];
        }

        // Enforce anti-farming & anti-self referral:
        // Must have valid referralCode, amountBaht >= 29, cleanRef !== sub.referralCode, referrer !== targetGuild
        const minReferralThreshold = Math.max(29, referralMinTopup);
        if (isSeasonActive && referrer && referrer.guildId !== guildId && cleanRef && cleanRef !== sub.referralCode) {
            sub.referredByGuildId = referrer.guildId;
            referrerGuildId = referrer.guildId;
            referrerGuildName = referrer.guildName;

            // Enforce minimum 29 THB threshold before awarding referral bonus days
            if (!sub.referralRewardTriggered && amountBaht >= minReferralThreshold && sub.cumulativePaidBaht >= minReferralThreshold) {
                if ((referrer.referralBonusMonths || 0) < maxReferralMonths) {
                    const bonusDays = referralRewardDays || 7;
                    const refBonusMs = bonusDays * 24 * 3600 * 1000;

                    // 1) Add bonus days to Referrer Guild
                    if (referrer.plan === 'SUPPORTER' && referrer.expiresAt > now) {
                        referrer.expiresAt += refBonusMs;
                    } else {
                        referrer.expiresAt = now + refBonusMs;
                    }
                    if (referrer.expiresAt > now + maxDurationMs) {
                        referrer.expiresAt = now + maxDurationMs;
                    }
                    referrer.plan = 'SUPPORTER';
                    referrer.referralBonusMonths = (referrer.referralBonusMonths || 0) + 1;
                    referrer.referralCount = (referrer.referralCount || 0) + 1;
                    referrer.updatedAt = now;
                    dbManager.set('subscriptions', referrer.guildId, referrer);

                    // 2) Add bonus days to Target Guild (+7 days / bonusDays)
                    sub.expiresAt += refBonusMs;
                    if (sub.expiresAt > now + maxDurationMs) {
                        sub.expiresAt = now + maxDurationMs;
                    }

                    sub.referralRewardTriggered = true;
                    referralBonusAwarded = true;
                }
            }
        }

        dbManager.set('subscriptions', guildId, sub);

        // Record transaction
        const txId = `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const transaction = {
            id: txId,
            guildId,
            guildName: sub.guildName,
            userId,
            amountBaht,
            addedDays,
            cyclesUnlocked,
            currentBalance: remainingBalance,
            voucherCode,
            referralCode: cleanRef || null,
            referralBonusAwarded,
            referrerGuildId,
            isSandbox: Boolean(isSandbox),
            timestamp: now
        };
        dbManager.set('transactions', txId, transaction);

        this.emit('donationSuccess', {
            guildId,
            sub,
            transaction,
            amountBaht,
            addedDays,
            cyclesUnlocked,
            currentBalance: remainingBalance,
            neededBaht: Math.max(0, PRICE_PER_CYCLE - remainingBalance),
            previousBalance,
            isSeasonActive: Boolean(isSeasonActive),
            referralBonusAwarded,
            addedBonusDays: referralBonusAwarded ? (referralRewardDays || 7) : 0,
            referrerGuildName
        });

        return {
            success: true,
            sub,
            transaction,
            amountBaht,
            addedDays,
            cyclesUnlocked,
            currentBalance: remainingBalance,
            neededBaht: Math.max(0, PRICE_PER_CYCLE - remainingBalance),
            previousBalance,
            isSeasonActive: Boolean(isSeasonActive),
            referralBonusAwarded,
            addedBonusDays: referralBonusAwarded ? (referralRewardDays || 7) : 0,
            referrerGuildName
        };
    }

    /**
     * Redeem Early-Bird batch drop or License key.
     */
    redeemCode(guildId, guildName, userId, code) {
        if (!code || typeof code !== 'string') {
            return { success: false, error: 'กรุณาระบุรหัสโค้ดครับ' };
        }

        const cleanCode = code.trim().toUpperCase();
        const campaigns = dbManager.get('campaigns') || {};
        const campaign = campaigns[cleanCode];

        if (!campaign) {
            return { success: false, error: 'ไม่พบรหัสโค้ดนี้ หรือโค้ดหมดอายุแล้วครับ' };
        }

        if (campaign.expiresAt && Date.now() > campaign.expiresAt) {
            return { success: false, error: 'แคมเปญนี้หมดอายุระยะเวลารับสิทธิ์แล้วครับ' };
        }

        const sub = this.getGuildSubscription(guildId, guildName);

        if (campaign.type === 'EARLY_BIRD') {
            if (sub.earlyBirdUsed) {
                return { success: false, error: 'เซิร์ฟเวอร์นี้เคยรับสิทธิ์ Early-Bird ไปแล้วครับ (จำกัด 1 สิทธิ์ต่อเซิร์ฟเวอร์)' };
            }
            if (Array.isArray(campaign.claimedGuilds) && campaign.claimedGuilds.some(c => c.guildId === guildId)) {
                return { success: false, error: 'เซิร์ฟเวอร์นี้เคยรับสิทธิ์จากโค้ดแคมเปญนี้ไปแล้วครับ (จำกัด 1 สิทธิ์ต่อเซิร์ฟเวอร์)' };
            }
            if (campaign.claimedCount >= campaign.maxClaims) {
                return { success: false, error: `สิทธิ์สำหรับรอบ ${campaign.name} เต็มแล้วครับ (${campaign.claimedCount}/${campaign.maxClaims})` };
            }

            const now = Date.now();
            const addedDays = campaign.days || 30;
            const addedMs = addedDays * 24 * 3600 * 1000;

            if (sub.plan === 'SUPPORTER' && sub.expiresAt > now) {
                sub.expiresAt += addedMs;
            } else {
                sub.expiresAt = now + addedMs;
            }

            // Lock maximum accumulated subscription ceiling to 365 days
            const MAX_ACCUMULATED_DAYS = 365;
            const maxDurationMs = MAX_ACCUMULATED_DAYS * 24 * 3600 * 1000;
            if (sub.expiresAt > now + maxDurationMs) {
                sub.expiresAt = now + maxDurationMs;
            }

            sub.plan = 'SUPPORTER';
            sub.source = 'EARLY_BIRD';
            sub.earlyBirdUsed = true;
            sub.warned3Days = false;
            sub.updatedAt = now;

            campaign.claimedCount++;
            if (!Array.isArray(campaign.claimedGuilds)) campaign.claimedGuilds = [];
            campaign.claimedGuilds.push({
                guildId,
                guildName: sub.guildName,
                claimedAt: now
            });
            campaign.updatedAt = now;
            dbManager.set('campaigns', cleanCode, campaign);
            dbManager.set('subscriptions', guildId, sub);

            // Record transaction
            const txId = `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            dbManager.set('transactions', txId, {
                id: txId,
                guildId,
                guildName: sub.guildName,
                userId,
                amountBaht: 0,
                addedDays,
                voucherCode: cleanCode,
                isRedeem: true,
                timestamp: now
            });

            return {
                success: true,
                sub,
                addedDays,
                campaignName: campaign.name,
                remainingClaims: campaign.maxClaims - campaign.claimedCount
            };
        }

        return { success: false, error: 'ประเภทโค้ดไม่ถูกต้อง' };
    }

    /**
     * Update an existing campaign's configuration (quota, expiry date, reward days, etc.)
     */
    updateCampaign(code, updates = {}) {
        if (!code) return { success: false, error: 'Missing campaign code' };
        const cleanCode = code.trim().toUpperCase();
        const campaigns = dbManager.get('campaigns') || {};
        const campaign = campaigns[cleanCode];

        if (!campaign) {
            return { success: false, error: 'ไม่พบแคมเปญนี้ครับ' };
        }

        if (updates.name !== undefined) campaign.name = updates.name;
        if (updates.maxClaims !== undefined) {
            const parsedClaims = parseInt(updates.maxClaims, 10);
            if (!isNaN(parsedClaims) && parsedClaims >= (campaign.claimedCount || 0)) {
                campaign.maxClaims = parsedClaims;
            } else {
                return { success: false, error: `โควตาสิทธิ์ต้องไม่น้อยกว่าจำนวนที่ถูกเคลมไปแล้ว (${campaign.claimedCount || 0} สิทธิ์)` };
            }
        }
        if (updates.days !== undefined) {
            const parsedDays = parseInt(updates.days, 10);
            if (!isNaN(parsedDays) && parsedDays > 0) {
                campaign.days = parsedDays;
            }
        }
        if (updates.expiresAt !== undefined) {
            campaign.expiresAt = updates.expiresAt;
        }

        campaign.updatedAt = Date.now();
        dbManager.set('campaigns', cleanCode, campaign);
        return { success: true, campaign };
    }

    /**
     * Reset all guilds referral counters for a new season.
     * Preserves each guild's active supporter status and days, but resets invite counts and trigger flags.
     */
    resetReferralSeason(seasonName = '') {
        const subs = dbManager.get('subscriptions') || {};
        let resetCount = 0;
        const now = Date.now();

        for (const [gId, sub] of Object.entries(subs)) {
            let changed = false;
            if (sub.referralRewardTriggered) {
                sub.referralRewardTriggered = false;
                changed = true;
            }
            if ((sub.referralCount || 0) > 0) {
                sub.referralCount = 0;
                changed = true;
            }
            if ((sub.referralBonusMonths || 0) > 0) {
                sub.referralBonusMonths = 0;
                changed = true;
            }
            if (changed) {
                sub.updatedAt = now;
                dbManager.set('subscriptions', gId, sub);
                resetCount++;
            }
        }

        // Record audit transaction
        const txId = `tx_season_${now}_${crypto.randomBytes(3).toString('hex')}`;
        dbManager.set('transactions', txId, {
            id: txId,
            guildId: 'SYSTEM',
            guildName: 'Referral Season Reset',
            userId: 'ADMIN',
            amountBaht: 0,
            addedDays: 0,
            voucherCode: seasonName ? `SEASON_RESET: ${seasonName}` : 'REFERRAL_SEASON_RESET',
            isSystemAction: true,
            timestamp: now
        });

        return {
            success: true,
            resetCount,
            seasonName: seasonName || 'New Season'
        };
    }

    /**
     * Background Heartbeat Sweep Worker (Runs every 60s)
     */
    startHeartbeatSweep(client, kazagumo) {
        if (this._sweepTimer) clearInterval(this._sweepTimer);

        this._sweepTimer = setInterval(async () => {
            try {
                await this._performSweep(client, kazagumo);
            } catch (err) {
                console.error('[HeartbeatSweep] Error during sweep:', err.message);
            }
        }, 60000);

        console.log('[SubscriptionManager] Heartbeat Sweep Worker initialized (Interval: 60s)');
    }

    async _performSweep(client, kazagumo) {
        const now = Date.now();

        // 1. Clean zombie/empty voice rooms
        if (kazagumo && kazagumo.players) {
            for (const [guildId, player] of kazagumo.players.entries()) {
                if (!player) continue;

                if (player._destroyed || !player.connection) {
                    try { player.destroy(); } catch {}
                    continue;
                }

                const banManager = require('../moderation/banManager');
                if (banManager.isGuildBanned(guildId)) {
                    console.log(`[HeartbeatSweep] Destroying player in BANNED guild: ${guildId}`);
                    try { player.destroy(); } catch {}
                    continue;
                }

                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    try { player.destroy(); } catch {}
                    continue;
                }

                if (player.voiceId) {
                    const channel = guild.channels.cache.get(player.voiceId);
                    if (!channel) {
                        console.log(`[HeartbeatSweep] Voice channel missing in ${guild.name}, destroying player.`);
                        try { player.destroy(); } catch {}
                        continue;
                    }

                    const nonBots = channel.members.filter(m => !m.user.bot);
                    if (nonBots.size === 0) {
                        console.log(`[HeartbeatSweep] Empty voice channel detected in ${guild.name}, destroying player to save slots.`);
                        try { player.destroy(); } catch {}
                        continue;
                    }
                }
            }
        }

        // 2. Check expiring subscriptions (3-day warning & auto-downgrade)
        const allSubs = dbManager.get('subscriptions') || {};
        for (const [guildId, sub] of Object.entries(allSubs)) {
            if (sub.plan === 'SUPPORTER') {
                const timeLeft = sub.expiresAt - now;

                // 3 days left warning
                if (timeLeft > 0 && timeLeft <= (3 * 24 * 3600 * 1000) && !sub.warned3Days) {
                    sub.warned3Days = true;
                    dbManager.set('subscriptions', guildId, sub);
                    this.emit('expiryWarning', { guildId, sub, daysLeft: Math.ceil(timeLeft / (24 * 3600 * 1000)) });
                }

                // Expired
                if (timeLeft <= 0) {
                    this.downgradeGuildToFree(guildId, kazagumo);
                }
            }
        }

        // Active Player Tier Enforcement Sweep
        if (kazagumo && kazagumo.players) {
            for (const [guildId, player] of kazagumo.players.entries()) {
                if (!player || player._destroyed) continue;
                if (!this.isSupporter(guildId) && typeof player.enforceTierLimits === 'function') {
                    player.enforceTierLimits();
                }
            }
        }

        // 3. Daily 04:00 AM check for yt-dlp -U
        const date = new Date();
        const currentHour = date.getHours();
        const currentDay = date.getDate();

        if (currentHour === 4 && this._lastYtDlpUpdateDay !== currentDay) {
            this._lastYtDlpUpdateDay = currentDay;
            this._runYtDlpUpdate();
        }
    }

    _runYtDlpUpdate() {
        const binPath = path.resolve(__dirname, process.platform === 'win32' ? '../../bin/yt-dlp.exe' : '../../bin/yt-dlp');
        if (!fs.existsSync(binPath)) return;

        try {
            fs.chmodSync(binPath, 0o755);
        } catch {}

        console.log('[AutoUpdater] Executing scheduled daily yt-dlp update (04:00 AM)...');
        execFile(binPath, ['-U'], { timeout: 60000 }, (err, stdout, stderr) => {
            if (process.platform !== 'win32') {
                try { fs.chmodSync(binPath, 0o755); } catch {}
            }
            if (err) {
                console.warn('[AutoUpdater] yt-dlp update failed:', err.message);
            } else {
                console.log('[AutoUpdater] yt-dlp update output:', (stdout || stderr || '').trim());
            }
        });
    }
}

module.exports = new SubscriptionManager();
