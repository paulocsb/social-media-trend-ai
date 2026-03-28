-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Scored posts (hypertable partitioned by collected_at)
CREATE TABLE IF NOT EXISTS scored_posts (
  id              TEXT        NOT NULL,
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
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, collected_at)
);

-- Hashtag snapshots (hypertable partitioned by snapshotted_at)
CREATE TABLE IF NOT EXISTS hashtag_snapshots (
  hashtag        TEXT        NOT NULL,
  trend_score    FLOAT       NOT NULL DEFAULT 0,
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id         TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT        NOT NULL,
  hashtag    TEXT        NOT NULL,
  threshold  FLOAT       NOT NULL,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scored_posts_trend_score ON scored_posts (trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_scored_posts_hashtags ON scored_posts USING GIN (hashtags);
CREATE INDEX IF NOT EXISTS idx_hashtag_snapshots_hashtag ON hashtag_snapshots (hashtag);
