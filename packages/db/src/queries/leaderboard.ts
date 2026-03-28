import { getRedisClient } from '../redis.js';
import { getTrackedHashtags } from './tracked-hashtags.js';
import type { ScoredPost } from '@trend/shared';

const WINDOWS = [
  { suffix: '1h',  ttl: 3_600 },
  { suffix: '6h',  ttl: 21_600 },
  { suffix: '24h', ttl: 86_400 },
];

export function leaderboardKey(campaignId: string, window: string): string {
  return `trends:hashtags:${campaignId}:${window}`;
}

export async function updateLeaderboard(posts: ScoredPost[], campaignId: string): Promise<void> {
  if (!posts.length) return;

  const tracked = await getTrackedHashtags(campaignId, true);
  const trackedSet = new Set(tracked.map((t) => t.hashtag.toLowerCase()));

  const redis = getRedisClient();
  const pipeline = redis.pipeline();

  for (const post of posts) {
    for (const hashtag of post.hashtags) {
      if (!trackedSet.has(hashtag.toLowerCase())) continue;
      for (const { suffix, ttl } of WINDOWS) {
        const key = leaderboardKey(campaignId, suffix);
        pipeline.zincrby(key, post.trendScore, hashtag);
        pipeline.expire(key, ttl);
      }
    }
  }

  await pipeline.exec();
}
