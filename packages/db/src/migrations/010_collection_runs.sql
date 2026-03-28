CREATE TABLE IF NOT EXISTS collection_runs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  status        TEXT        NOT NULL DEFAULT 'running',  -- running | completed | failed | partial
  target        TEXT        NOT NULL DEFAULT 'both',     -- hashtags | profiles | both
  triggered_by  TEXT        NOT NULL DEFAULT 'manual',   -- manual | scheduled
  posts_found   INTEGER,
  events_found  INTEGER,
  top_hashtags  JSONB,
  top_events    JSONB,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_started_at ON collection_runs (started_at DESC);
