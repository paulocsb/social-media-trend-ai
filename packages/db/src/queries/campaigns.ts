import { getPgPool } from '../pg.js';

export type CampaignRow = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Row = {
  id: string; user_id: string; name: string; description: string | null;
  color: string; active: boolean; created_at: Date; updated_at: Date;
};

function toRow(r: Row): CampaignRow {
  return {
    id: r.id, userId: r.user_id, name: r.name, description: r.description,
    color: r.color, active: r.active, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const SELECT = `id, user_id, name, description, color, active, created_at, updated_at`;

export async function listCampaigns(userId: string): Promise<CampaignRow[]> {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `SELECT ${SELECT} FROM campaigns WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId],
  );
  return rows.map(toRow);
}

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `SELECT ${SELECT} FROM campaigns WHERE id = $1`,
    [id],
  );
  return rows[0] ? toRow(rows[0]) : null;
}

export async function insertCampaign(
  userId: string,
  data: { name: string; description?: string; color?: string },
): Promise<CampaignRow> {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `INSERT INTO campaigns (user_id, name, description, color)
     VALUES ($1, $2, $3, $4)
     RETURNING ${SELECT}`,
    [userId, data.name, data.description ?? null, data.color ?? '#6366f1'],
  );
  return toRow(rows[0]);
}

export async function updateCampaign(
  id: string,
  data: { name?: string; description?: string | null; color?: string; active?: boolean },
): Promise<CampaignRow | null> {
  const pool = getPgPool();
  const fields: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name        !== undefined) { fields.push(`name = $${idx++}`);        values.push(data.name); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.color       !== undefined) { fields.push(`color = $${idx++}`);       values.push(data.color); }
  if (data.active      !== undefined) { fields.push(`active = $${idx++}`);      values.push(data.active); }

  values.push(id);
  const { rows } = await pool.query<Row>(
    `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${SELECT}`,
    values,
  );
  return rows[0] ? toRow(rows[0]) : null;
}

export async function getActiveCampaigns(): Promise<CampaignRow[]> {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `SELECT ${SELECT} FROM campaigns WHERE active = true ORDER BY created_at ASC`,
  );
  return rows.map(toRow);
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const pool = getPgPool();
  const { rowCount } = await pool.query(`DELETE FROM campaigns WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}
