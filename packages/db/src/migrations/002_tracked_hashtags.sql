CREATE TABLE IF NOT EXISTS tracked_hashtags (
  id         TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  hashtag    TEXT        NOT NULL UNIQUE,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracked_hashtags_active ON tracked_hashtags (active);
