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

    // 1. Sync Guild Settings
    const settingsPath = path.join(dataDir, 'guildSettings.json');
    if (fs.existsSync(settingsPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const rows = [];
            for (const [guildId, val] of Object.entries(raw)) {
                rows.push({
                    guild_id: guildId,
                    language: val.language || 'en',
                    volume: val.volume !== undefined ? val.volume : 100,
                    autoplay: !!val.autoplay,
                    updated_at: new Date().toISOString()
                });
            }
            if (rows.length > 0) {
                const { error } = await supabase.from('guild_settings').upsert(rows);
                if (error) console.error('Error syncing guild_settings:', error.message);
                else console.log(`[guild_settings] Synced ${rows.length} rows.`);
            }
        } catch (err) {
            console.error('Failed reading guildSettings.json:', err.message);
        }
    }

    // 2. Sync Subscriptions
    const subsPath = path.join(dataDir, 'subscriptions.json');
    if (fs.existsSync(subsPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
            const rows = [];
            for (const [guildId, val] of Object.entries(raw)) {
                rows.push({
                    guild_id: guildId,
                    guild_name: val.guildName || '',
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
            if (rows.length > 0) {
                const { error } = await supabase.from('subscriptions').upsert(rows);
                if (error) console.error('Error syncing subscriptions:', error.message);
                else console.log(`[subscriptions] Synced ${rows.length} rows.`);
            }
        } catch (err) {
            console.error('Failed reading subscriptions.json:', err.message);
        }
    }

    // 3. Sync Favorites
    const favPath = path.join(dataDir, 'favorites.json');
    if (fs.existsSync(favPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(favPath, 'utf8'));
            const rows = [];
            for (const [userId, tracks] of Object.entries(raw)) {
                rows.push({
                    user_id: userId,
                    tracks: Array.isArray(tracks) ? tracks : [],
                    updated_at: new Date().toISOString()
                });
            }
            if (rows.length > 0) {
                const { error } = await supabase.from('favorites').upsert(rows);
                if (error) console.error('Error syncing favorites:', error.message);
                else console.log(`[favorites] Synced ${rows.length} rows.`);
            }
        } catch (err) {
            console.error('Failed reading favorites.json:', err.message);
        }
    }

    console.log('--- Migration Finished ---');
}

sync().catch(console.error);
