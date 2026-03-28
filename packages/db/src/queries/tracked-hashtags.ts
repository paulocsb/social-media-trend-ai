import { getPgPool } from '../pg.js';

export interface TrackedHashtag {
  id: string;
  hashtag: string;
  active: boolean;
  campaignId: string;
  createdAt: Date;
  updatedAt: Date;
}

type Row = { id: string; hashtag: string; active: boolean; campaign_id: string; created_at: Date; updated_at: Date };

function toRow(r: Row): TrackedHashtag {
  return { id: r.id, hashtag: r.hashtag, active: r.active, campaignId: r.campaign_id, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function getTrackedHashtags(campaignId: string, onlyActive = true): Promise<TrackedHashtag[]> {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `SELECT id, hashtag, active, campaign_id, created_at, updated_at
     FROM tracked_hashtags
     WHERE campaign_id = $1 ${onlyActive ? 'AND active = true' : ''}
     ORDER BY created_at DESC`,
    [campaignId],
  );
  return rows.map(toRow);
}

export async function addTrackedHashtag(campaignId: string, hashtag: string): Promise<TrackedHashtag> {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `INSERT INTO tracked_hashtags (campaign_id, hashtag)
     VALUES ($1, $2)
     ON CONFLICT (hashtag, campaign_id) DO UPDATE SET active = true, updated_at = NOW()
     RETURNING id, hashtag, active, campaign_id, created_at, updated_at`,
    [campaignId, hashtag.toLowerCase().replace(/^#/, '')],
  );
  return toRow(rows[0]);
}

export async function updateTrackedHashtag(id: string, data: { hashtag?: string; active?: boolean }): Promise<TrackedHashtag | null> {
  const pool = getPgPool();
  const fields: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let idx = 1;

  if (data.hashtag !== undefined) { fields.push(`hashtag = $${idx++}`); values.push(data.hashtag.toLowerCase().replace(/^#/, '')); }
  if (data.active  !== undefined) { fields.push(`active = $${idx++}`);  values.push(data.active); }

  values.push(id);
  const { rows } = await pool.query<Row>(
    `UPDATE tracked_hashtags SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, hashtag, active, campaign_id, created_at, updated_at`,
    values,
  );
  return rows[0] ? toRow(rows[0]) : null;
}

export async function deleteTrackedHashtag(id: string): Promise<boolean> {
  const pool = getPgPool();
  const { rowCount } = await pool.query(`DELETE FROM tracked_hashtags WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}
