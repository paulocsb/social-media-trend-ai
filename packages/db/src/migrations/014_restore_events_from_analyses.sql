-- Reconstruct news_events from ai_analyses where the events table was wiped.
-- Maps: main_topic -> title, reasoning -> summary, urgency_level -> strategy,
--       suggested_hashtags -> hashtags, selected_post_ids -> post_ids.

INSERT INTO news_events (
  detected_at,
  event_type,
  title,
  summary,
  hashtags,
  author_handles,
  post_ids,
  confidence,
  strategy,
  strategy_reason,
  campaign_id,
  metadata
)
SELECT
  a.created_at                                         AS detected_at,
  'AI_ANALYSIS'                                        AS event_type,
  a.main_topic                                         AS title,
  a.reasoning                                          AS summary,
  a.suggested_hashtags                                 AS hashtags,
  '{}'::text[]                                         AS author_handles,
  a.selected_post_ids                                  AS post_ids,
  CASE a.urgency_level
    WHEN 'high'   THEN 0.9
    WHEN 'medium' THEN 0.6
    ELSE               0.3
  END                                                  AS confidence,
  CASE a.urgency_level
    WHEN 'high'   THEN 'URGENT'
    WHEN 'medium' THEN 'ENGAGEMENT'
    ELSE               'WATCH'
  END                                                  AS strategy,
  a.reasoning                                          AS strategy_reason,
  a.campaign_id                                        AS campaign_id,
  jsonb_build_object(
    'source',         'restored_from_ai_analysis',
    'analysis_id',    a.id,
    'content_ideas',  a.content_ideas,
    'content_prompt', a.content_prompt,
    'content_format', a.content_format
  )                                                    AS metadata
FROM ai_analyses a
-- Skip if an event with the same analysis_id was already restored
WHERE NOT EXISTS (
  SELECT 1 FROM news_events ne
  WHERE ne.metadata->>'analysis_id' = a.id::text
);
