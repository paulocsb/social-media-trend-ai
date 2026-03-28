import { getPgPool, closePgPool } from '../packages/db/src/pg.js';
import { insertScoredPost } from '../packages/db/src/queries/scored-posts.js';

async function seed() {
  console.log('[seed] Inserting sample data...');
  const now = new Date();

  const samplePosts = [
    { id: 'graph-api_sample1', source: 'graph-api' as const, hashtags: ['marketing', 'trends'], likes: 1500, comments: 80, shares: 30, views: 10000, mediaType: 'REEL' as const, collectedAt: now, engagementRate: 0.161, trendScore: 72, velocityScore: 60 },
    { id: 'graph-api_sample2', source: 'graph-api' as const, hashtags: ['socialmedia', 'instagram'], likes: 900, comments: 45, shares: 10, views: 5000, mediaType: 'IMAGE' as const, collectedAt: now, engagementRate: 0.191, trendScore: 55, velocityScore: 40 },
  ];

  for (const post of samplePosts) {
    await insertScoredPost(post);
  }

  await closePgPool();
  console.log('[seed] Done');
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
