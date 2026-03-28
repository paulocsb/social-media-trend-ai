-- Scope all data tables to a campaign

-- tracked_hashtags: unique per (hashtag, campaign)
ALTER TABLE tracked_hashtags ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;
UPDATE tracked_hashtags SET campaign_id = '00000000-0000-0000-0000-000000000002';
ALTER TABLE tracked_hashtags ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE tracked_hashtags DROP CONSTRAINT IF EXISTS tracked_hashtags_hashtag_key;
ALTER TABLE tracked_hashtags ADD CONSTRAINT tracked_hashtags_hashtag_campaign_key UNIQUE (hashtag, campaign_id);

-- tracked_profiles: unique per (handle, campaign)
ALTER TABLE tracked_profiles ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;
UPDATE tracked_profiles SET campaign_id = '00000000-0000-0000-0000-000000000002';
ALTER TABLE tracked_profiles ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE tracked_profiles DROP CONSTRAINT IF EXISTS tracked_profiles_handle_key;
ALTER TABLE tracked_profiles ADD CONSTRAINT tracked_profiles_handle_campaign_key UNIQUE (handle, campaign_id);

-- collection_runs
ALTER TABLE collection_runs ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
UPDATE collection_runs SET campaign_id = '00000000-0000-0000-0000-000000000002';
ALTER TABLE collection_runs ALTER COLUMN campaign_id SET NOT NULL;
CREATE INDEX collection_runs_campaign_id_idx ON collection_runs (campaign_id, started_at DESC);

-- ai_analyses
ALTER TABLE ai_analyses ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
UPDATE ai_analyses SET campaign_id = '00000000-0000-0000-0000-000000000002';
ALTER TABLE ai_analyses ALTER COLUMN campaign_id SET NOT NULL;
CREATE INDEX ai_analyses_campaign_id_idx ON ai_analyses (campaign_id, created_at DESC);

-- alerts
ALTER TABLE alerts ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;
UPDATE alerts SET campaign_id = '00000000-0000-0000-0000-000000000002';
ALTER TABLE alerts ALTER COLUMN campaign_id SET NOT NULL;

-- scored_posts: nullable — migrated best-effort, new posts tagged on insert
ALTER TABLE scored_posts ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
UPDATE scored_posts SET campaign_id = '00000000-0000-0000-0000-000000000002' WHERE campaign_id IS NULL;
CREATE INDEX IF NOT EXISTS scored_posts_campaign_id_idx ON scored_posts (campaign_id, collected_at DESC);

-- news_events: nullable — migrated best-effort, new events tagged on insert
ALTER TABLE news_events ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
UPDATE news_events SET campaign_id = '00000000-0000-0000-0000-000000000002' WHERE campaign_id IS NULL;
CREATE INDEX IF NOT EXISTS news_events_campaign_id_idx ON news_events (campaign_id, detected_at DESC);
