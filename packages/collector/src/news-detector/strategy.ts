import { getPgPool } from '@trend/db';
import type { Strategy, InsertNewsEvent } from '@trend/db';

const SIX_HOURS_MS  = 6  * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Returns the age (in ms) of the most recent post associated with an event.
 * Uses published_at when available; falls back to collected_at.
 * When no postIds given, queries by hashtags.
 */
async function getPostAgeMs(postIds: string[], hashtags: string[] = []): Promise<number> {
  const pool = getPgPool();

  if (postIds.length) {
    const { rows } = await pool.query<{ age_ms: string; has_published: boolean }>(
      `SELECT
         EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, collected_at))) * 1000 AS age_ms,
         published_at IS NOT NULL AS has_published
       FROM scored_posts
       WHERE id = ANY($1)
       ORDER BY COALESCE(published_at, collected_at) DESC
       LIMIT 1`,
      [postIds],
    );
    if (!rows[0]) return SIX_HOURS_MS; // unknown — treat as borderline
    if (!rows[0].has_published) {
      // published_at not available — use collected_at but treat as "recent enough"
      return Math.min(parseFloat(rows[0].age_ms), SIX_HOURS_MS - 1);
    }
    return parseFloat(rows[0].age_ms);
  }

  // No postIds — query most recent post by hashtag
  if (hashtags.length) {
    const { rows } = await pool.query<{ age_ms: string; has_published: boolean }>(
      `SELECT
         EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, collected_at))) * 1000 AS age_ms,
         published_at IS NOT NULL AS has_published
       FROM scored_posts
       WHERE hashtags && $1
         AND collected_at > NOW() - INTERVAL '48 hours'
       ORDER BY COALESCE(published_at, collected_at) DESC
       LIMIT 1`,
      [hashtags],
    );
    if (!rows[0]) return SIX_HOURS_MS;
    if (!rows[0].has_published) return Math.min(parseFloat(rows[0].age_ms), SIX_HOURS_MS - 1);
    return parseFloat(rows[0].age_ms);
  }

  return SIX_HOURS_MS; // no data — treat as borderline
}

/**
 * Checks if engagement of the given hashtags is above average for the last 24h.
 * Returns true if recent posts (last 6h) have higher avg engagement than older posts.
 */
async function isEngagementGrowing(hashtags: string[]): Promise<boolean> {
  if (!hashtags.length) return false;
  const pool = getPgPool();
  const { rows } = await pool.query<{ recent_avg: string; older_avg: string }>(
    `SELECT
       AVG(likes + comments) FILTER (WHERE collected_at > NOW() - INTERVAL '6 hours')  AS recent_avg,
       AVG(likes + comments) FILTER (WHERE collected_at <= NOW() - INTERVAL '6 hours'
                                      AND collected_at > NOW() - INTERVAL '24 hours') AS older_avg
     FROM scored_posts
     WHERE hashtags && $1
       AND collected_at > NOW() - INTERVAL '24 hours'`,
    [hashtags],
  );
  const recent = parseFloat(rows[0]?.recent_avg ?? '0');
  const older  = parseFloat(rows[0]?.older_avg  ?? '0');
  if (!recent) return false;
  if (!older)  return true; // no older data means it's all fresh
  return recent >= older;
}

export async function classifyStrategy(
  event: Pick<InsertNewsEvent, 'eventType' | 'postIds' | 'authorHandles' | 'hashtags'>,
  trackedHandles: Set<string>,
): Promise<{ strategy: Strategy; strategyReason: string }> {
  const isVerified = event.eventType === 'verified_origin'
    || event.authorHandles.some((h) => trackedHandles.has(h.toLowerCase()));

  const ageMs = await getPostAgeMs(event.postIds, event.hashtags);

  const ageLabel = ageMs < 60_000
    ? 'just posted'
    : ageMs < 3_600_000
    ? `${Math.round(ageMs / 60_000)}min ago`
    : `${Math.round(ageMs / 3_600_000)}h ago`;

  // Post < 6h AND from verified profile → URGENT
  if (ageMs < SIX_HOURS_MS && isVerified) {
    return {
      strategy: 'URGENT',
      strategyReason: `From a verified profile (${ageLabel}) — capitalize on the moment`,
    };
  }

  // Post > 48h → DISCARD
  if (ageMs > FORTY_EIGHT_HOURS_MS) {
    return {
      strategy: 'DISCARD',
      strategyReason: `Content is ${Math.round(ageMs / 3_600_000)}h old — topic likely stale`,
    };
  }

  // Post 6–48h, check engagement
  const growing = await isEngagementGrowing(event.hashtags);
  if (growing) {
    return {
      strategy: 'ENGAGEMENT',
      strategyReason: 'Topic still hot — engagement above average in the last 6h. Educational or opinion content recommended',
    };
  }

  return {
    strategy: 'DISCARD',
    strategyReason: 'Engagement is declining — not worth posting',
  };
}
