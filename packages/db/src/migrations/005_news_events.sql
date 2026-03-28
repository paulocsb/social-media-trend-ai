ALTER TABLE scored_posts
  ADD COLUMN IF NOT EXISTS author_handle TEXT,
  ADD COLUMN IF NOT EXISTS published_at  TIMESTAMPTZ;

DROP TABLE IF EXISTS news_events;

CREATE TABLE news_events (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type    TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  summary       TEXT,
  hashtags      TEXT[]      NOT NULL DEFAULT '{}',
  author_handles TEXT[]     NOT NULL DEFAULT '{}',
  post_ids      TEXT[]      NOT NULL DEFAULT '{}',
  confidence    FLOAT       NOT NULL DEFAULT 0,
  metadata      JSONB
);

SELECT create_hypertable('news_events', 'detected_at', if_not_exists => TRUE);
ALTER TABLE news_events ADD CONSTRAINT news_events_pkey PRIMARY KEY (id, detected_at);
CREATE INDEX IF NOT EXISTS news_events_detected_idx ON news_events (detected_at DESC);
CREATE INDEX IF NOT EXISTS news_events_confidence_idx ON news_events (confidence DESC);
