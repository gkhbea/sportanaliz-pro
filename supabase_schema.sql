-- ==============================================================================
-- SportAnaliz Pro - Supabase Veritabanı Şeması (PostgreSQL)
-- Bu kodu Supabase Dashboard -> SQL Editor kısmına yapıştırıp "RUN" butonuna basınız.
-- ==============================================================================

-- 1. Günlük Kuponlar Tablosu (daily_coupons)
CREATE TABLE IF NOT EXISTS public.daily_coupons (
    id TEXT PRIMARY KEY,
    archive_date TEXT NOT NULL,
    title TEXT NOT NULL,
    badge TEXT,
    description TEXT,
    type TEXT,
    total_odd NUMERIC DEFAULT 1.0,
    stake NUMERIC DEFAULT 0,
    potential_return NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'won', 'lost'
    matches JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT TRUE,
    auto_played BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_date ON public.daily_coupons(archive_date);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.daily_coupons(status);

-- 2. Sanal Kasa Tablosu (virtual_wallet)
CREATE TABLE IF NOT EXISTS public.virtual_wallet (
    id TEXT PRIMARY KEY DEFAULT 'default_wallet',
    current_balance NUMERIC DEFAULT 1000,
    initial_balance NUMERIC DEFAULT 1000,
    total_staked NUMERIC DEFAULT 0,
    total_won NUMERIC DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    win_count INTEGER DEFAULT 0,
    loss_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    history JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Analiz Geçmişi & Maç Karnesi (analysis_history)
CREATE TABLE IF NOT EXISTS public.analysis_history (
    id TEXT PRIMARY KEY,
    match_id TEXT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    league TEXT,
    match_date TEXT,
    sport_type TEXT DEFAULT 'football',
    predicted_outcome TEXT,
    market_code TEXT,
    confidence_score NUMERIC,
    confidence_level TEXT,
    probability NUMERIC,
    odd TEXT,
    is_value_bet BOOLEAN DEFAULT FALSE,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'NOT_STARTED',
    minute TEXT,
    is_correct BOOLEAN,
    actual_outcome TEXT,
    analysis_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_match_date ON public.analysis_history(match_date);

-- 4. Günlük İstatistikler Tablosu (daily_match_stats)
CREATE TABLE IF NOT EXISTS public.daily_match_stats (
    date TEXT PRIMARY KEY,
    total_matches INTEGER DEFAULT 0,
    won_matches INTEGER DEFAULT 0,
    lost_matches INTEGER DEFAULT 0,
    accuracy_rate NUMERIC DEFAULT 0,
    stats JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Kullanıcı Ayarları (user_settings)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_user',
    settings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Row Level Security (RLS) Politikaları (Web ve Mobil Anon Erişimi İzni)
-- ==============================================================================

ALTER TABLE public.daily_coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_daily_coupons_anon ON public.daily_coupons;
CREATE POLICY p_daily_coupons_anon ON public.daily_coupons FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.virtual_wallet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_virtual_wallet_anon ON public.virtual_wallet;
CREATE POLICY p_virtual_wallet_anon ON public.virtual_wallet FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_analysis_history_anon ON public.analysis_history;
CREATE POLICY p_analysis_history_anon ON public.analysis_history FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.daily_match_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_daily_match_stats_anon ON public.daily_match_stats;
CREATE POLICY p_daily_match_stats_anon ON public.daily_match_stats FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_user_settings_anon ON public.user_settings;
CREATE POLICY p_user_settings_anon ON public.user_settings FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- Başlangıç Varsayılan Sanal Kasa Kaydı
-- ==============================================================================
INSERT INTO public.virtual_wallet (id, current_balance, initial_balance, total_staked, total_won, total_profit, win_count, loss_count, pending_count)
VALUES ('default_wallet', 1000, 1000, 0, 0, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
