import { getPgPool } from '../pg.js';
import type { ScoredPost } from '@trend/shared';

export async function insertScoredPost(post: ScoredPost, campaignId: string): Promise<void> {
  const pool = getPgPool();
  await pool.query(
    `INSERT INTO scored_posts
      (id, source, hashtags, media_type, likes, comments, shares, views, engagement_rate, trend_score, velocity_score, collected_at, thumbnail_url, permalink, caption, author_handle, published_at, campaign_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (id, collected_at) DO NOTHING`,
    [
      post.id, post.source, post.hashtags, post.mediaType, post.likes, post.comments,
      post.shares, post.views, post.engagementRate, post.trendScore, post.velocityScore,
      post.collectedAt, post.thumbnailUrl ?? null, post.permalink ?? null, post.caption ?? null,
      post.authorHandle ?? null,
      (post.publishedAt instanceof Date && !isNaN(post.publishedAt.getTime())) ? post.publishedAt : null,
      campaignId,
    ],
  );
}

export async function getTopPosts(campaignId: string, limit = 20, windowHours = 24, verifiedOnly = true): Promise<ScoredPost[]> {
  const pool = getPgPool();
  const verifiedFilter = verifiedOnly
    ? `AND author_handle IN (SELECT handle FROM tracked_profiles WHERE campaign_id = '${campaignId}' AND active = true)`
    : '';
  const campaignFilter = `AND (campaign_id = $2 OR campaign_id IS NULL)`;
  const { rows } = await pool.query<ScoredPost>(
    `SELECT id, source, hashtags, media_type as "mediaType", likes, comments, shares, views,
            engagement_rate as "engagementRate", trend_score as "trendScore",
            velocity_score as "velocityScore", collected_at as "collectedAt",
            thumbnail_url as "thumbnailUrl", permalink, caption,
            author_handle as "authorHandle", published_at as "publishedAt"
     FROM scored_posts
     WHERE collected_at > NOW() - INTERVAL '${windowHours} hours'
       ${campaignFilter}
       ${verifiedFilter}
     ORDER BY trend_score DESC
     LIMIT $1`,
    [limit, campaignId],
  );
  return rows;
}
