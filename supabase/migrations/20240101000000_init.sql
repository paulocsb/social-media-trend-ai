-- ============================================================
-- Instagram Trend Intelligence — consolidated schema
-- Supabase-native (standard PostgreSQL, no TimescaleDB)
-- Auth handled by Supabase Auth (auth.users)
-- ============================================================

-- ----------------------------------------------------------------
-- Campaigns
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_user_id_idx ON public.campaigns (user_id);

-- ----------------------------------------------------------------
-- Tracked hashtags (scoped to campaign)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracked_hashtags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  hashtag     TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tracked_hashtags_hashtag_campaign_key UNIQUE (hashtag, campaign_id)
);

CREATE INDEX idx_tracked_hashtags_campaign ON public.tracked_hashtags (campaign_id);
CREATE INDEX idx_tracked_hashtags_active    ON public.tracked_hashtags (active);

-- ----------------------------------------------------------------
-- Tracked profiles (scoped to campaign)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracked_profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  handle      TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tracked_profiles_handle_campaign_key UNIQUE (handle, campaign_id)
);

CREATE INDEX idx_tracked_profiles_campaign ON public.tracked_profiles (campaign_id);

-- ----------------------------------------------------------------
-- Collection runs (manual only — no scheduled trigger)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collection_runs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT        NOT NULL DEFAULT 'running',   -- running | completed | failed | partial
  target        TEXT        NOT NULL DEFAULT 'both',      -- hashtags | profiles | both
  posts_found   INTEGER,
  events_found  INTEGER,
  top_hashtags  JSONB,
  top_events    JSONB,
  error_message TEXT
);

CREATE INDEX idx_collection_runs_campaign ON public.collection_runs (campaign_id, started_at DESC);

-- ----------------------------------------------------------------
-- Scored posts
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scored_posts (
  id              TEXT        NOT NULL,
  campaign_id     UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  source          TEXT        NOT NULL,
  hashtags        TEXT[]      NOT NULL DEFAULT '{}',
  media_type      TEXT        NOT NULL,
  likes           INTEGER     NOT NULL DEFAULT 0,
  comments        INTEGER     NOT NULL DEFAULT 0,
  shares          INTEGER     NOT NULL DEFAULT 0,
  views           INTEGER     NOT NULL DEFAULT 0,
  engagement_rate FLOAT       NOT NULL DEFAULT 0,
  trend_score     FLOAT       NOT NULL DEFAULT 0,
  velocity_score  FLOAT       NOT NULL DEFAULT 0,
  thumbnail_url   TEXT,
  permalink       TEXT,
  caption         TEXT,
  author_handle   TEXT,
  published_at    TIMESTAMPTZ,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, collected_at)
);

CREATE INDEX idx_scored_posts_campaign    ON public.scored_posts (campaign_id, collected_at DESC);
CREATE INDEX idx_scored_posts_trend_score ON public.scored_posts (trend_score DESC);
CREATE INDEX idx_scored_posts_hashtags    ON public.scored_posts USING GIN (hashtags);

-- ----------------------------------------------------------------
-- Hashtag snapshots (time-series trend data)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hashtag_snapshots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  hashtag        TEXT        NOT NULL,
  trend_score    FLOAT       NOT NULL DEFAULT 0,
  post_count     INTEGER     NOT NULL DEFAULT 0,
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hashtag_snapshots_campaign ON public.hashtag_snapshots (campaign_id, snapshotted_at DESC);
CREATE INDEX idx_hashtag_snapshots_hashtag  ON public.hashtag_snapshots (hashtag);

-- ----------------------------------------------------------------
-- News events
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type      TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  summary         TEXT,
  hashtags        TEXT[]      NOT NULL DEFAULT '{}',
  author_handles  TEXT[]      NOT NULL DEFAULT '{}',
  post_ids        TEXT[]      NOT NULL DEFAULT '{}',
  confidence      FLOAT       NOT NULL DEFAULT 0,
  strategy        TEXT,
  strategy_reason TEXT,
  metadata        JSONB
);

CREATE INDEX idx_news_events_campaign   ON public.news_events (campaign_id, detected_at DESC);
CREATE INDEX idx_news_events_confidence ON public.news_events (confidence DESC);

-- ----------------------------------------------------------------
-- AI analyses
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id        UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  selected_post_ids  TEXT[]      NOT NULL DEFAULT '{}',
  main_topic         TEXT        NOT NULL,
  reasoning          TEXT,
  suggested_hashtags TEXT[]      NOT NULL DEFAULT '{}',
  content_ideas      TEXT[]      NOT NULL DEFAULT '{}',
  urgency_level      TEXT        NOT NULL DEFAULT 'medium',
  content_format     TEXT        NOT NULL DEFAULT 'any',
  content_prompt     TEXT
);

CREATE INDEX idx_ai_analyses_campaign ON public.ai_analyses (campaign_id, created_at DESC);

-- ----------------------------------------------------------------
-- Alerts
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hashtag     TEXT        NOT NULL,
  threshold   FLOAT       NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_campaign ON public.alerts (campaign_id);

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE public.campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_hashtags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scored_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtag_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts            ENABLE ROW LEVEL SECURITY;

-- Campaigns: user owns their campaigns
CREATE POLICY "campaigns: user access"
  ON public.campaigns FOR ALL
  USING (user_id = auth.uid());

-- All other tables: access via campaign ownership
CREATE POLICY "tracked_hashtags: via campaign"
  ON public.tracked_hashtags FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

CREATE POLICY "tracked_profiles: via campaign"
  ON public.tracked_profiles FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

CREATE POLICY "collection_runs: via campaign"
  ON public.collection_runs FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

CREATE POLICY "scored_posts: via campaign"
  ON public.scored_posts FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

CREATE POLICY "hashtag_snapshots: via campaign"
  ON public.hashtag_snapshots FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

CREATE POLICY "news_events: via campaign"
  ON public.news_events FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

CREATE POLICY "ai_analyses: via campaign"
  ON public.ai_analyses FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

CREATE POLICY "alerts: via campaign"
  ON public.alerts FOR ALL
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------
-- Realtime — enable for live collection progress
-- ----------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scored_posts;
