CREATE TABLE IF NOT EXISTS ai_analyses (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  selected_post_ids TEXT[]      NOT NULL DEFAULT '{}',
  main_topic        TEXT        NOT NULL,
  reasoning         TEXT,
  suggested_hashtags TEXT[]     NOT NULL DEFAULT '{}',
  content_ideas     TEXT[]      NOT NULL DEFAULT '{}',
  urgency_level     TEXT        NOT NULL DEFAULT 'medium',
  content_format    TEXT        NOT NULL DEFAULT 'any',
  content_prompt    TEXT
);
