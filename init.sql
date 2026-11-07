-- ==============================================================================
-- DISLAVA / GOOLIX MUSIC BOT - RELATIONAL DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- ==============================================================================

-- 1. Master Discord Guilds Table
CREATE TABLE IF NOT EXISTS public.guilds (
    guild_id VARCHAR(32) PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Guild Subscriptions & Supporter Status (Foreign Key -> guilds.guild_id)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    guild_id VARCHAR(32) PRIMARY KEY REFERENCES public.guilds(guild_id) ON DELETE CASCADE,
    plan VARCHAR(32) DEFAULT 'FREE',
    expires_at BIGINT DEFAULT 0,
    referral_code VARCHAR(32) UNIQUE,
    referral_count INT DEFAULT 0,
    referred_by VARCHAR(32),
    audio_filter VARCHAR(32) DEFAULT 'off',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Guild Audio Settings (Foreign Key -> guilds.guild_id)
CREATE TABLE IF NOT EXISTS public.guild_settings (
    guild_id VARCHAR(32) PRIMARY KEY REFERENCES public.guilds(guild_id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    volume INT DEFAULT 100,
    autoplay BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Music Favorites (Independent User Entity)
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id VARCHAR(32) PRIMARY KEY,
    tracks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TrueMoney Topup Transactions (Foreign Key -> guilds.guild_id)
CREATE TABLE IF NOT EXISTS public.transactions (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(32) REFERENCES public.guilds(guild_id) ON DELETE SET NULL,
    user_id VARCHAR(32),
    amount NUMERIC(10, 2) DEFAULT 0,
    voucher_url TEXT,
    status VARCHAR(32) DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Promotional Campaigns & Early-Bird Drop Codes
CREATE TABLE IF NOT EXISTS public.campaigns (
    code VARCHAR(64) PRIMARY KEY,
    title TEXT,
    bonus_days INT DEFAULT 30,
    max_claims INT DEFAULT 100,
    claimed_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. High-Performance Indexing (Optimized Foreign Keys & Filters)
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions (expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_referral_code ON public.subscriptions (referral_code);
CREATE INDEX IF NOT EXISTS idx_transactions_guild_id ON public.transactions (guild_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_guild_settings_lang ON public.guild_settings (language);

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 9. Service Role Policies (Full Backend Access for Bot)
DROP POLICY IF EXISTS "Service Role Guilds" ON public.guilds;
CREATE POLICY "Service Role Guilds" ON public.guilds FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Subscriptions" ON public.subscriptions;
CREATE POLICY "Service Role Subscriptions" ON public.subscriptions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Settings" ON public.guild_settings;
CREATE POLICY "Service Role Settings" ON public.guild_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Favorites" ON public.favorites;
CREATE POLICY "Service Role Favorites" ON public.favorites FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Transactions" ON public.transactions;
CREATE POLICY "Service Role Transactions" ON public.transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Campaigns" ON public.campaigns;
CREATE POLICY "Service Role Campaigns" ON public.campaigns FOR ALL USING (true);

-- 10. Public Read Policies (Allow Web Verification Without Service Key)
DROP POLICY IF EXISTS "Public Read Guilds" ON public.guilds;
CREATE POLICY "Public Read Guilds" ON public.guilds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Subscriptions" ON public.subscriptions;
CREATE POLICY "Public Read Subscriptions" ON public.subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Campaigns" ON public.campaigns;
CREATE POLICY "Public Read Campaigns" ON public.campaigns FOR SELECT USING (true);
