import { getPgPool } from '../pg.js';

export type Strategy = 'URGENT' | 'ENGAGEMENT' | 'DISCARD';

export type NewsEventRow = {
  id: string;
  detectedAt: Date;
  eventType: string;
  title: string;
  summary: string | null;
  hashtags: string[];
  authorHandles: string[];
  postIds: string[];
  confidence: number;
  metadata: Record<string, unknown> | null;
  strategy: Strategy | null;
  strategyReason: string | null;
};

export type InsertNewsEvent = Omit<NewsEventRow, 'id' | 'detectedAt'>;

export async function insertNewsEvent(event: InsertNewsEvent, campaignId: string): Promise<void> {
  const pool = getPgPool();
  await pool.query(
    `INSERT INTO news_events
       (event_type, title, summary, hashtags, author_handles, post_ids, confidence, metadata, strategy, strategy_reason, campaign_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      event.eventType, event.title, event.summary, event.hashtags,
      event.authorHandles, event.postIds, event.confidence, event.metadata,
      event.strategy ?? null, event.strategyReason ?? null, campaignId,
    ],
  );
}

export async function getRecentNewsEvents(
  campaignId: string,
  limit = 20,
  windowHours = 48,
  excludeDiscard = true,
): Promise<NewsEventRow[]> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT id, detected_at as "detectedAt", event_type as "eventType", title, summary,
            hashtags, author_handles as "authorHandles", post_ids as "postIds",
            confidence, metadata, strategy, strategy_reason as "strategyReason"
     FROM news_events
     WHERE detected_at > NOW() - INTERVAL '${windowHours} hours'
       AND (campaign_id = $2 OR campaign_id IS NULL)
       ${excludeDiscard ? `AND (strategy IS NULL OR strategy != 'DISCARD')` : ''}
     ORDER BY
       CASE strategy WHEN 'URGENT' THEN 1 WHEN 'ENGAGEMENT' THEN 2 ELSE 3 END,
       confidence DESC,
       detected_at DESC
     LIMIT $1`,
    [limit, campaignId],
  );
  return rows;
}

/** Returns top-2 actionable events from the last 24h (for daily prioritization). */
export async function getDailyPriorityEvents(campaignId: string): Promise<NewsEventRow[]> {
  return getRecentNewsEvents(campaignId, 2, 24, true);
}
