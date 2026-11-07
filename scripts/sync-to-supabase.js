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

    const subsData = fs.existsSync(subsPath) ? JSON.parse(fs.readFileSync(subsPath, 'utf8')) : {};
    const settingsData = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};

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

    // 4. Sync Favorites
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

    console.log('--- Migration Finished ---');
}

sync().catch(console.error);
