import { getPgPool } from '../pg.js';

export type TrackedProfile = { id: string; handle: string; active: boolean; campaignId: string };

type Row = { id: string; handle: string; active: boolean; campaign_id: string };

function toRow(r: Row): TrackedProfile {
  return { id: r.id, handle: r.handle, active: r.active, campaignId: r.campaign_id };
}

export async function getTrackedProfiles(campaignId: string, activeOnly = false): Promise<TrackedProfile[]> {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `SELECT id, handle, active, campaign_id FROM tracked_profiles
     WHERE campaign_id = $1 ${activeOnly ? 'AND active = TRUE' : ''}
     ORDER BY created_at ASC`,
    [campaignId],
  );
  return rows.map(toRow);
}

export async function addTrackedProfile(campaignId: string, handle: string): Promise<TrackedProfile> {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `INSERT INTO tracked_profiles (campaign_id, handle)
     VALUES ($1, $2)
     ON CONFLICT (handle, campaign_id) DO UPDATE SET active = TRUE, updated_at = NOW()
     RETURNING id, handle, active, campaign_id`,
    [campaignId, handle.replace('@', '').toLowerCase().trim()],
  );
  return toRow(rows[0]);
}

export async function updateTrackedProfile(id: string, data: { active?: boolean; handle?: string }): Promise<TrackedProfile | null> {
  const pool = getPgPool();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.active !== undefined) fields.push(`active = $${values.push(data.active)}`);
  if (data.handle !== undefined) fields.push(`handle = $${values.push(data.handle.replace('@', '').toLowerCase().trim())}`);
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await pool.query<Row>(
    `UPDATE tracked_profiles SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id, handle, active, campaign_id`,
    values,
  );
  return rows[0] ? toRow(rows[0]) : null;
}

export async function deleteTrackedProfile(id: string): Promise<boolean> {
  const pool = getPgPool();
  const { rowCount } = await pool.query(`DELETE FROM tracked_profiles WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}
