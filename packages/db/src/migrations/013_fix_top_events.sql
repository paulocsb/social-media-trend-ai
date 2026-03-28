-- Fix collection_runs.top_events where topic is null/empty
-- by re-joining with news_events detected during each run's time window

UPDATE collection_runs cr
SET top_events = (
  SELECT jsonb_agg(row ORDER BY row_order)
  FROM (
    SELECT
      jsonb_build_object('topic', ne.title, 'strategy', ne.strategy) AS row,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE ne.strategy WHEN 'URGENT' THEN 1 WHEN 'ENGAGEMENT' THEN 2 ELSE 3 END,
          ne.confidence DESC
      ) AS row_order
    FROM news_events ne
    WHERE (cr.campaign_id IS NULL OR ne.campaign_id = cr.campaign_id)
      AND ne.detected_at >= cr.started_at
      AND ne.detected_at <= COALESCE(cr.finished_at, cr.started_at + INTERVAL '2 hours')
    LIMIT 5
  ) sub
)
WHERE
  -- Runs with events_found > 0 but top_events is null
  (top_events IS NULL AND COALESCE(events_found, 0) > 0)
  OR
  -- Runs where top_events exists but topics are null/empty
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(top_events) elem
    WHERE (elem->>'topic') IS NULL OR (elem->>'topic') = ''
  );
