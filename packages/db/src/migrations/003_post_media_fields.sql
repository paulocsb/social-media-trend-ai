ALTER TABLE scored_posts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS permalink     TEXT,
  ADD COLUMN IF NOT EXISTS caption       TEXT;
