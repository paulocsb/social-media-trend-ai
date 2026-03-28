import { getPgPool } from '../pg.js';
import type { HashtagSnapshot } from '@trend/shared';

export async function insertHashtagSnapshot(snapshot: Omit<HashtagSnapshot, 'snapshottedAt'>): Promise<void> {
  const pool = getPgPool();
  await pool.query(
    `INSERT INTO hashtag_snapshots (hashtag, trend_score) VALUES ($1, $2)`,
    [snapshot.hashtag, snapshot.trendScore],
  );
}

export async function getHashtagTrend(hashtag: string, hours = 24): Promise<HashtagSnapshot[]> {
  const pool = getPgPool();
  const { rows } = await pool.query<{ hashtag: string; trend_score: number; snapshotted_at: Date }>(
    `SELECT hashtag, trend_score, snapshotted_at
     FROM hashtag_snapshots
     WHERE hashtag = $1 AND snapshotted_at > NOW() - INTERVAL '${hours} hours'
     ORDER BY snapshotted_at ASC`,
    [hashtag],
  );
  return rows.map((r) => ({
    hashtag: r.hashtag,
    trendScore: r.trend_score,
    snapshottedAt: r.snapshotted_at,
  }));
}
