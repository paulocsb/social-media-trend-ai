import { getPgPool } from '../pg.js';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export type UserRow = { id: string; name: string; email: string | null; passwordHash: string | null; createdAt: Date; updatedAt: Date }
export type ApiTokenRow = { id: string; userId: string; name: string; lastUsedAt: Date | null; createdAt: Date }

export async function getUser(id = DEFAULT_USER_ID): Promise<UserRow | null> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash AS "passwordHash", created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash AS "passwordHash", created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

export async function setPasswordHash(id = DEFAULT_USER_ID, hash: string): Promise<void> {
  const pool = getPgPool();
  await pool.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, id]);
}

export async function updateUser(id = DEFAULT_USER_ID, data: { name?: string; email?: string | null }): Promise<UserRow | null> {
  const pool = getPgPool();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) fields.push(`name = $${values.push(data.name)}`);
  if (data.email !== undefined) fields.push(`email = $${values.push(data.email)}`);
  if (!fields.length) return getUser(id);
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
     RETURNING id, name, email, created_at AS "createdAt", updated_at AS "updatedAt"`,
    values,
  );
  return rows[0] ?? null;
}

export async function listApiTokens(userId = DEFAULT_USER_ID): Promise<ApiTokenRow[]> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT id, user_id AS "userId", name, last_used_at AS "lastUsedAt", created_at AS "createdAt"
     FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

export async function createApiToken(userId = DEFAULT_USER_ID, name: string, tokenHash: string): Promise<ApiTokenRow> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `INSERT INTO api_tokens (user_id, name, token_hash)
     VALUES ($1, $2, $3)
     RETURNING id, user_id AS "userId", name, last_used_at AS "lastUsedAt", created_at AS "createdAt"`,
    [userId, name, tokenHash],
  );
  return rows[0];
}

export async function revokeApiToken(id: string, userId = DEFAULT_USER_ID): Promise<boolean> {
  const pool = getPgPool();
  const { rowCount } = await pool.query(
    `DELETE FROM api_tokens WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}

export async function getTokenByHash(tokenHash: string): Promise<{ id: string; userId: string } | null> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = $1
     RETURNING id, user_id AS "userId"`,
    [tokenHash],
  );
  return rows[0] ?? null;
}
