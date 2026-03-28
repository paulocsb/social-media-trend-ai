import { parseEnv } from '@trend/shared';
import type { RawPost } from '@trend/shared';
import { insertScoredPost, insertHashtagSnapshot, updateLeaderboard } from '@trend/db';
import { normalizePosts, scorePosts } from '@trend/processor';
import { GraphApiAdapter } from './adapters/graph-api.adapter.js';
import { ApifyAdapter } from './adapters/apify.adapter.js';
import { ApifyProfileAdapter } from './adapters/apify-profile.adapter.js';
import { startWorkers } from './queue/worker.js';
import { startScheduler } from './scheduler/index.js';
import { detectNews } from './news-detector/index.js';

const env = parseEnv();

const graphApi       = new GraphApiAdapter(env.IG_TOKENS ? env.IG_TOKENS.split(',') : []);
const apify          = new ApifyAdapter(env.APIFY_TOKEN ?? '');
const apifyProfile   = new ApifyProfileAdapter(env.APIFY_TOKEN ?? '');

async function processAndStore(rawPosts: RawPost[], campaignId: string): Promise<void> {
  if (!rawPosts.length) return;
  const normalized = normalizePosts(rawPosts);
  console.log(`[pipeline] normalized=${normalized.length} from raw=${rawPosts.length}`);
  const scored     = scorePosts(normalized);
  console.log(`[pipeline] scored=${scored.length}`);
  for (const post of scored) {
    try {
      await insertScoredPost(post, campaignId);
    } catch (err) {
      console.error(`[pipeline] insertScoredPost failed for ${post.id}:`, err);
    }
  }
  await updateLeaderboard(scored, campaignId);
  await detectNews(scored, campaignId);
  const hashtagScores = new Map<string, number[]>();
  for (const post of scored) {
    for (const tag of post.hashtags) {
      if (!hashtagScores.has(tag)) hashtagScores.set(tag, []);
      hashtagScores.get(tag)!.push(post.trendScore);
    }
  }
  for (const [hashtag, scores] of hashtagScores) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    await insertHashtagSnapshot({ hashtag, trendScore: avg });
  }
  console.log(`[pipeline] Stored ${scored.length} posts, updated leaderboard`);
}

export async function collectHashtags(hashtags: string[], campaignId: string) {
  const adapter = graphApi.isAvailable() ? graphApi : apify;
  if (!adapter.isAvailable()) { console.warn('[collector] No adapter for hashtags'); return; }
  const result = await adapter.collect({ hashtags });
  if (!result.ok) { console.error('[collector] Hashtag collection failed', result.error); return; }
  console.log(`[collector] Collected ${result.value.length} posts for hashtags: ${hashtags.join(', ')}`);
  await processAndStore(result.value, campaignId);
}

export async function collectProfiles(handles: string[], campaignId: string) {
  if (!apifyProfile.isAvailable()) { console.warn('[collector] Apify not configured for profiles'); return; }
  const result = await apifyProfile.collect({ handles });
  if (!result.ok) { console.error('[collector] Profile collection failed', result.error); return; }
  console.log(`[collector] Collected ${result.value.length} posts from profiles: ${handles.join(', ')}`);
  await processAndStore(result.value, campaignId);
}

startWorkers(collectHashtags, collectProfiles);
startScheduler();

console.log('[collector] Service started');
