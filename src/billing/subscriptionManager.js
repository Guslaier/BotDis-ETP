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
            phoneNumber: process.env.TMW_PHONE_NUMBER || ''
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
                audioFilter: 'off',
                warned3Days: false,
                updatedAt: Date.now()
            };
            dbManager.set('subscriptions', guildId, sub);
        } else if (!sub.referralCode) {
            sub.referralCode = this._generateReferralCode(guildId);
            dbManager.set('subscriptions', guildId, sub);
        }

        if (guildName && sub.guildName !== guildName) {
            sub.guildName = guildName;
            dbManager.set('subscriptions', guildId, sub);
        }

        return sub;
    }

    isSupporter(guildId) {
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
        return {
            isSupporter: supporter,
            plan: supporter ? 'SUPPORTER' : 'FREE',
            expiresAt: sub ? sub.expiresAt : 0,
            referralCode: sub ? sub.referralCode : '',
            audioFilter: (supporter && sub) ? (sub.audioFilter || 'off') : 'off',
            maxQueue: supporter ? 50 : 10,
            maxPlaylistTracks: supporter ? 25 : 5,
            maxSongDuration: supporter ? Infinity : 1800, // 30 minutes for free
            bitrate: supporter ? '320k' : '128k',
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
        console.log(`[SubscriptionManager] Enforced FREE downgrade on guild ${guildId} (VIP features stripped).`);
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
        const config = this.getConfig();
        const maxFree = config.maxFreeStreams || 6;
        const maxTotal = config.maxTotalStreams || 12;

        const isSupporter = this.isSupporter(guildId);
        const stats = this.getLiveStreamStats(kazagumo, client);

        if (isSupporter) {
            if (stats.total >= maxTotal) {
                return {
                    allowed: false,
                    reason: 'CLUSTER_FULL',
                    message: 'ขณะนี้ช่องสัญญาณเซิร์ฟเวอร์เต็มชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้งค่ะ'
                };
            }
            return { allowed: true, slotType: 'SUPPORTER_PRIORITY' };
        }

        // Free tier checks
        if (stats.total >= maxTotal) {
            return {
                allowed: false,
                reason: 'CLUSTER_FULL',
                message: 'ขณะนี้ช่องสัญญาณเซิร์ฟเวอร์เต็มชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้งค่ะ'
            };
        }

        if (stats.free >= maxFree) {
            return {
                allowed: false,
                reason: 'FREE_SLOTS_FULL',
                current: stats.free,
                max: maxFree,
                message: `ขณะนี้ช่องสัญญาณทั่วไปเต็มแล้ว (${stats.free}/${maxFree} ห้อง) — ร่วมสนับสนุนเซิร์ฟเวอร์เพื่อเข้าใช้ช่องทางด่วนได้ทันทีค่ะ!`
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

        const sub = this.getGuildSubscription(guildId, guildName);
        const addedDays = Math.max(1, Math.ceil((amountBaht / price30Days) * 30));
        const addedMs = addedDays * 24 * 3600 * 1000;

        const now = Date.now();
        if (sub.plan === 'SUPPORTER' && sub.expiresAt > now) {
            sub.expiresAt += addedMs;
        } else {
            sub.expiresAt = now + addedMs;
        }

        sub.plan = 'SUPPORTER';
        sub.source = isSandbox ? 'SANDBOX_DONATION' : 'DONATION';
        sub.cumulativePaidBaht = (sub.cumulativePaidBaht || 0) + amountBaht;
        sub.warned3Days = false;
        sub.updatedAt = now;

        let referralBonusAwarded = false;
        let referrerGuildName = '';
        let referrerGuildId = null;

        // Referral handling
        let referrer = null;
        const cleanRef = (referralCode || '').trim().toUpperCase();
        const allSubs = dbManager.get('subscriptions') || {};

        if (cleanRef) {
            referrer = Object.values(allSubs).find(s => s.referralCode === cleanRef);
        } else if (sub.referredByGuildId) {
            referrer = allSubs[sub.referredByGuildId];
        }

        if (referrer && referrer.guildId !== guildId) {
            sub.referredByGuildId = referrer.guildId;
            referrerGuildId = referrer.guildId;
            referrerGuildName = referrer.guildName;

            // Check if cumulative donation reaches price30Days threshold
            if (!sub.referralRewardTriggered && sub.cumulativePaidBaht >= price30Days) {
                if ((referrer.referralBonusMonths || 0) < maxReferralMonths) {
                    const refBonusMs = 30 * 24 * 3600 * 1000;
                    if (referrer.plan === 'SUPPORTER' && referrer.expiresAt > now) {
                        referrer.expiresAt += refBonusMs;
                    } else {
                        referrer.expiresAt = now + refBonusMs;
                    }
                    referrer.plan = 'SUPPORTER';
                    referrer.referralBonusMonths = (referrer.referralBonusMonths || 0) + 1;
                    referrer.referralCount = (referrer.referralCount || 0) + 1;
                    referrer.updatedAt = now;
                    dbManager.set('subscriptions', referrer.guildId, referrer);

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
            addedDays,
            referralBonusAwarded,
            referrerGuildName
        });

        return {
            success: true,
            sub,
            transaction,
            addedDays,
            referralBonusAwarded,
            referrerGuildName
        };
    }

    /**
     * Redeem Early-Bird batch drop or License key.
     */
    redeemCode(guildId, guildName, userId, code) {
        if (!code || typeof code !== 'string') {
            return { success: false, error: 'กรุณาระบุรหัสโค้ดค่ะ' };
        }

        const cleanCode = code.trim().toUpperCase();
        const campaigns = dbManager.get('campaigns') || {};
        const campaign = campaigns[cleanCode];

        if (!campaign) {
            return { success: false, error: 'ไม่พบรหัสโค้ดนี้ หรือโค้ดหมดอายุแล้วค่ะ' };
        }

        const sub = this.getGuildSubscription(guildId, guildName);

        if (campaign.type === 'EARLY_BIRD') {
            if (sub.earlyBirdUsed) {
                return { success: false, error: 'เซิร์ฟเวอร์นี้เคยรับสิทธิ์ Early-Bird ไปแล้วค่ะ (จำกัด 1 สิทธิ์ต่อเซิร์ฟเวอร์)' };
            }
            if (campaign.claimedCount >= campaign.maxClaims) {
                return { success: false, error: `สิทธิ์สำหรับรอบ ${campaign.name} เต็มแล้วค่ะ (${campaign.claimedCount}/${campaign.maxClaims})` };
            }

            const now = Date.now();
            const addedDays = campaign.days || 30;
            const addedMs = addedDays * 24 * 3600 * 1000;

            if (sub.plan === 'SUPPORTER' && sub.expiresAt > now) {
                sub.expiresAt += addedMs;
            } else {
                sub.expiresAt = now + addedMs;
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
            if (err) {
                console.warn('[AutoUpdater] yt-dlp update failed:', err.message);
            } else {
                console.log('[AutoUpdater] yt-dlp update output:', (stdout || stderr || '').trim());
            }
        });
    }
}

module.exports = new SubscriptionManager();
