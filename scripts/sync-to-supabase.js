require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('../src/helpers/supabaseClient');

const dataDir = path.resolve(__dirname, '../data');

async function sync() {
    if (!supabase) {
        console.error('Supabase client not initialized. Check .env variables.');
        process.exit(1);
    }

    console.log('--- Starting Migration from Local JSON to Supabase ---');

    const subsPath = path.join(dataDir, 'subscriptions.json');
    const settingsPath = path.join(dataDir, 'guildSettings.json');
    const favPath = path.join(dataDir, 'favorites.json');
    const txPath = path.join(dataDir, 'transactions.json');
    const campPath = path.join(dataDir, 'campaigns.json');

    const subsData = fs.existsSync(subsPath) ? JSON.parse(fs.readFileSync(subsPath, 'utf8')) : {};
    const settingsData = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};
    const txData = fs.existsSync(txPath) ? JSON.parse(fs.readFileSync(txPath, 'utf8')) : {};
    const campData = fs.existsSync(campPath) ? JSON.parse(fs.readFileSync(campPath, 'utf8')) : {};

    // 1. Sync Master Guilds first (satisfy Foreign Key constraints)
    const guildMap = new Map();
    for (const [gId, val] of Object.entries(subsData)) {
        guildMap.set(gId, { guild_id: gId, name: val.guildName || `Guild ${gId}`, icon: null, updated_at: new Date().toISOString() });
    }
    for (const [gId] of Object.entries(settingsData)) {
        if (!guildMap.has(gId)) {
            guildMap.set(gId, { guild_id: gId, name: `Guild ${gId}`, icon: null, updated_at: new Date().toISOString() });
        }
    }
    for (const [_, tx] of Object.entries(txData)) {
        if (tx.guildId && !guildMap.has(tx.guildId)) {
            guildMap.set(tx.guildId, { guild_id: tx.guildId, name: tx.guildName || `Guild ${tx.guildId}`, icon: null, updated_at: new Date().toISOString() });
        }
    }

    const guildRows = Array.from(guildMap.values());
    if (guildRows.length > 0) {
        const { error } = await supabase.from('guilds').upsert(guildRows);
        if (error) console.error('Error syncing guilds:', error.message);
        else console.log(`[guilds] Synced ${guildRows.length} master guild rows.`);
    }

    // 2. Sync Subscriptions (Foreign Key -> guilds)
    const subRows = [];
    for (const [guildId, val] of Object.entries(subsData)) {
        subRows.push({
            guild_id: guildId,
            plan: val.plan || (val.isSupporter ? 'SUPPORTER' : 'FREE'),
            expires_at: val.expiresAt || 0,
            referral_code: val.referralCode || null,
            referral_count: val.referralCount || 0,
            referred_by: val.referredBy || null,
            audio_filter: val.audioFilter || 'off',
            metadata: {
                redeemedCodes: val.redeemedCodes || [],
                voucherHistory: val.voucherHistory || []
            },
            updated_at: new Date().toISOString()
        });
    }
    if (subRows.length > 0) {
        const { error } = await supabase.from('subscriptions').upsert(subRows);
        if (error) console.error('Error syncing subscriptions:', error.message);
        else console.log(`[subscriptions] Synced ${subRows.length} rows.`);
    }

    // 3. Sync Guild Settings (Foreign Key -> guilds)
    const settingRows = [];
    for (const [guildId, val] of Object.entries(settingsData)) {
        settingRows.push({
            guild_id: guildId,
            language: val.language || 'en',
            volume: val.volume !== undefined ? val.volume : 100,
            autoplay: !!val.autoplay,
            updated_at: new Date().toISOString()
        });
    }
    if (settingRows.length > 0) {
        const { error } = await supabase.from('guild_settings').upsert(settingRows);
        if (error) console.error('Error syncing guild_settings:', error.message);
        else console.log(`[guild_settings] Synced ${settingRows.length} rows.`);
    }

    // 4. Sync Transactions
    const txRows = [];
    for (const [txId, val] of Object.entries(txData)) {
        txRows.push({
            id: txId,
            guild_id: val.guildId || null,
            user_id: val.userId || null,
            amount: val.amountBaht || 0,
            voucher_url: val.voucherCode || val.voucherUrl || '',
            status: val.status || 'SUCCESS',
            created_at: val.timestamp ? new Date(val.timestamp).toISOString() : new Date().toISOString()
        });
    }
    if (txRows.length > 0) {
        const { error } = await supabase.from('transactions').upsert(txRows);
        if (error) console.error('Error syncing transactions:', error.message);
        else console.log(`[transactions] Synced ${txRows.length} rows.`);
    }

    // 5. Sync Campaigns
    const campRows = [];
    for (const [code, val] of Object.entries(campData)) {
        campRows.push({
            code: val.code || code,
            title: val.name || val.title || 'Campaign',
            bonus_days: val.days || val.bonus_days || 30,
            max_claims: val.maxClaims || 100,
            claimed_count: val.claimedCount || 0,
            is_active: val.isActive !== undefined ? val.isActive : true,
            created_at: val.createdAt ? new Date(val.createdAt).toISOString() : new Date().toISOString()
        });
    }
    if (campRows.length > 0) {
        const { error } = await supabase.from('campaigns').upsert(campRows);
        if (error) console.error('Error syncing campaigns:', error.message);
        else console.log(`[campaigns] Synced ${campRows.length} rows.`);
    }

    // 6. Sync Favorites
    if (fs.existsSync(favPath)) {
        try {
            const favData = JSON.parse(fs.readFileSync(favPath, 'utf8'));
            const favRows = [];
            for (const [userId, tracks] of Object.entries(favData)) {
                favRows.push({
                    user_id: userId,
                    tracks: Array.isArray(tracks) ? tracks : [],
                    updated_at: new Date().toISOString()
                });
            }
            if (favRows.length > 0) {
                const { error } = await supabase.from('favorites').upsert(favRows);
                if (error) console.error('Error syncing favorites:', error.message);
                else console.log(`[favorites] Synced ${favRows.length} rows.`);
            }
        } catch (err) {
            console.error('Failed reading favorites.json:', err.message);
        }
    }

    console.log('--- Migration Finished Successfully ---');
}

sync().catch(console.error);
