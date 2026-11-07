-- ==============================================================================
-- DISLAVA / GOOLIX MUSIC BOT - SUPABASE POSTGRESQL INITIALIZATION SCHEMA
-- ==============================================================================

-- 1. Server Subscriptions & VIP Tier
CREATE TABLE IF NOT EXISTS public.subscriptions (
    guild_id VARCHAR(32) PRIMARY KEY,
    guild_name TEXT,
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

-- 2. Guild Settings (Volume, Language, Autoplay)
CREATE TABLE IF NOT EXISTS public.guild_settings (
    guild_id VARCHAR(32) PRIMARY KEY,
    language VARCHAR(10) DEFAULT 'en',
    volume INT DEFAULT 100,
    autoplay BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Music Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id VARCHAR(32) PRIMARY KEY,
    tracks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TrueMoney Wallet Topup Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(32),
    user_id VARCHAR(32),
    amount NUMERIC(10, 2) DEFAULT 0,
    voucher_url TEXT,
    status VARCHAR(32) DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Promotional Campaigns & Early-Bird Drop Codes
CREATE TABLE IF NOT EXISTS public.campaigns (
    code VARCHAR(64) PRIMARY KEY,
    title TEXT,
    bonus_days INT DEFAULT 30,
    max_claims INT DEFAULT 100,
    claimed_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. High-Performance Indexing
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions (expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_referral_code ON public.subscriptions (referral_code);
CREATE INDEX IF NOT EXISTS idx_transactions_guild_id ON public.transactions (guild_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);

-- 7. Row Level Security (RLS) Configuration
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 8. Service Role Policies (Full Backend Access)
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

-- 9. Public Read Policies (Allow Public Portal Verification)
DROP POLICY IF EXISTS "Public Read Subscriptions" ON public.subscriptions;
CREATE POLICY "Public Read Subscriptions" ON public.subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Campaigns" ON public.campaigns;
CREATE POLICY "Public Read Campaigns" ON public.campaigns FOR SELECT USING (true);
