import { getPgPool } from '../pg.js';

export type RunStatus = 'running' | 'completed' | 'failed' | 'partial'
export type RunTarget = 'hashtags' | 'profiles' | 'both'

export type CollectionRunRow = {
  id: string
  campaignId: string
  startedAt: Date
  finishedAt: Date | null
  status: RunStatus
  target: RunTarget
  triggeredBy: string
  postsFound: number | null
  eventsFound: number | null
  topHashtags: Array<{ hashtag: string; score: number }> | null
  topEvents: Array<{ topic: string; strategy: string | null }> | null
  errorMessage: string | null
}

const SELECT = `
  id,
  campaign_id   AS "campaignId",
  started_at    AS "startedAt",
  finished_at   AS "finishedAt",
  status,
  target,
  triggered_by  AS "triggeredBy",
  posts_found   AS "postsFound",
  events_found  AS "eventsFound",
  top_hashtags  AS "topHashtags",
  top_events    AS "topEvents",
  error_message AS "errorMessage"
`

export async function insertCollectionRun(campaignId: string, target: RunTarget, triggeredBy = 'manual'): Promise<CollectionRunRow> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `INSERT INTO collection_runs (campaign_id, target, triggered_by) VALUES ($1, $2, $3) RETURNING ${SELECT}`,
    [campaignId, target, triggeredBy],
  );
  return rows[0];
}

export async function updateCollectionRun(
  id: string,
  data: {
    status: RunStatus
    postsFound?: number
    eventsFound?: number
    topHashtags?: Array<{ hashtag: string; score: number }>
    topEvents?: Array<{ topic: string; strategy: string | null }>
    errorMessage?: string
  },
): Promise<CollectionRunRow | null> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `UPDATE collection_runs
     SET
       finished_at   = NOW(),
       status        = $2,
       posts_found   = $3,
       events_found  = $4,
       top_hashtags  = $5,
       top_events    = $6,
       error_message = $7
     WHERE id = $1
     RETURNING ${SELECT}`,
    [
      id, data.status, data.postsFound ?? null, data.eventsFound ?? null,
      data.topHashtags ? JSON.stringify(data.topHashtags) : null,
      data.topEvents   ? JSON.stringify(data.topEvents)   : null,
      data.errorMessage ?? null,
    ],
  );
  return rows[0] ?? null;
}

export async function listCollectionRuns(campaignId: string, limit = 50): Promise<CollectionRunRow[]> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM collection_runs WHERE campaign_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [campaignId, limit],
  );
  return rows;
}

export async function getCollectionRun(id: string): Promise<CollectionRunRow | null> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM collection_runs WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
