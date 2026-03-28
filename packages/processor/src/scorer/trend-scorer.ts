import type { NormalizedPost, ScoredPost } from '@trend/shared';

const DECAY_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

function recencyBoost(collectedAt: Date): number {
  const ageMs = Date.now() - collectedAt.getTime();
  return Math.max(0, 1 - ageMs / DECAY_WINDOW_MS);
}

function engagementRate(post: NormalizedPost): number {
  const total = post.likes + post.comments + post.shares;
  const reach = Math.max(post.views, 1);
  return total / reach;
}

function absoluteEngagement(post: NormalizedPost): number {
  const total = post.likes + post.comments + post.shares;
  // Normalize to 0-1 using a soft cap at 100k
  return Math.min(total / 100_000, 1);
}

/** velocityScore is supplied externally (requires historical data); defaults to 0 */
export function scorePost(post: NormalizedPost, velocityScore = 0): ScoredPost {
  const er = engagementRate(post);
  const abs = absoluteEngagement(post);
  const recency = recencyBoost(post.collectedAt);

  const trendScore =
    velocityScore  * 0.40 +
    er             * 0.30 * 100 +
    abs            * 0.20 * 100 +
    recency        * 0.10 * 100;

  return {
    ...post,
    engagementRate: er,
    trendScore: Math.min(100, Math.max(0, trendScore)),
    velocityScore,
  };
}

export function scorePosts(posts: NormalizedPost[], velocityMap: Map<string, number> = new Map()): ScoredPost[] {
  return posts.map((p) => scorePost(p, velocityMap.get(p.id) ?? 0));
}
