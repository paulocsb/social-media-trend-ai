import { Pool } from 'pg';
import { parseEnv } from '@trend/shared';

let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pool) {
    const env = parseEnv();
    pool = new Pool({ connectionString: env.DATABASE_URL });
    pool.on('error', (err) => {
      console.error('[pg] Unexpected client error', err);
    });
  }
  return pool;
}

export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
