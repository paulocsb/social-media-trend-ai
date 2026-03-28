ALTER TABLE news_events
  ADD COLUMN IF NOT EXISTS strategy        TEXT,
  ADD COLUMN IF NOT EXISTS strategy_reason TEXT;
