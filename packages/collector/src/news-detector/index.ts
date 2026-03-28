import { getPgPool } from '@trend/db';
import { insertNewsEvent } from '@trend/db';
import type { ScoredPost } from '@trend/shared';
import { classifyStrategy } from './strategy.js';

const NEWS_KEYWORDS = [
  'winner', 'wins', 'won', 'champion', 'final', 'eliminated',
  'heat win', 'venceu', 'vence', 'campeão', 'campeao', 'classificado',
  'semifinal', 'quarterfinal', 'título', 'titulo', 'ranked',
];

function containsNewsKeyword(caption: string | undefined): boolean {
  if (!caption) return false;
  const lower = caption.toLowerCase();
  return NEWS_KEYWORDS.some((kw) => lower.includes(kw));
}

async function detectVolumeSpikes(trackedHashtags: string[], trackedHandles: Set<string>, campaignId: string): Promise<void> {
  if (!trackedHashtags.length) return;
  const pool = getPgPool();

  for (const hashtag of trackedHashtags) {
    const { rows } = await pool.query<{ last2h: string; prev22h: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE collected_at > NOW() - INTERVAL '2 hours') AS last2h,
         COUNT(*) FILTER (WHERE collected_at > NOW() - INTERVAL '24 hours' AND collected_at <= NOW() - INTERVAL '2 hours') AS prev22h
       FROM scored_posts
       WHERE $1 = ANY(hashtags)
         AND collected_at > NOW() - INTERVAL '24 hours'
         AND (campaign_id = $2 OR campaign_id IS NULL)`,
      [hashtag, campaignId],
    );

    const last2h = parseInt(rows[0]?.last2h ?? '0', 10);
    const prev22h = parseInt(rows[0]?.prev22h ?? '0', 10);

    if (last2h < 3) continue; // not enough data
    const avgPerHour = prev22h / 22;
    const expectedIn2h = avgPerHour * 2;

    if (expectedIn2h > 0 && last2h > expectedIn2h * 1.5) {
      const growthPct = Math.round(((last2h - expectedIn2h) / expectedIn2h) * 100);
      const confidence = Math.min(0.95, 0.5 + (growthPct / 200));
      const eventData = { eventType: 'volume_spike' as const, hashtags: [hashtag], authorHandles: [], postIds: [] };
      const { strategy, strategyReason } = await classifyStrategy(eventData, trackedHandles);

      await insertNewsEvent({
        ...eventData,
        title: `Volume spike: #${hashtag}`,
        summary: `${last2h} posts in the last 2h — ${growthPct}% above average`,
        confidence,
        metadata: { last2h, prev22h, growthPct },
        strategy,
        strategyReason,
      }, campaignId);
      console.log(`[news-detector] Volume spike: #${hashtag} +${growthPct}% → ${strategy}`);
    }
  }
}

async function detectVerifiedOriginPosts(posts: ScoredPost[], trackedHandles: Set<string>, campaignId: string): Promise<void> {
  const verifiedPosts = posts.filter(
    (p) => p.authorHandle && trackedHandles.has(p.authorHandle.toLowerCase()) && containsNewsKeyword(p.caption),
  );

  for (const post of verifiedPosts) {
    const matchedKeywords = NEWS_KEYWORDS.filter((kw) => post.caption?.toLowerCase().includes(kw));
    const confidence = Math.min(0.9, 0.6 + matchedKeywords.length * 0.05);
    const eventData = {
      eventType: 'verified_origin' as const,
      hashtags: post.hashtags,
      authorHandles: post.authorHandle ? [post.authorHandle] : [],
      postIds: [post.id],
    };
    const { strategy, strategyReason } = await classifyStrategy(eventData, trackedHandles);

    await insertNewsEvent({
      ...eventData,
      title: `News from @${post.authorHandle}`,
      summary: post.caption ? post.caption.slice(0, 200) : null,
      confidence,
      metadata: { matchedKeywords, trendScore: post.trendScore },
      strategy,
      strategyReason,
    }, campaignId);
    console.log(`[news-detector] Verified origin: @${post.authorHandle} → ${strategy}`);
  }
}

async function detectThemeConvergence(posts: ScoredPost[], trackedHandles: Set<string>, campaignId: string): Promise<void> {
  const tagToHandles = new Map<string, Set<string>>();

  for (const post of posts) {
    if (!post.authorHandle || !trackedHandles.has(post.authorHandle.toLowerCase())) continue;
    for (const tag of post.hashtags) {
      if (!tagToHandles.has(tag)) tagToHandles.set(tag, new Set());
      tagToHandles.get(tag)!.add(post.authorHandle.toLowerCase());
    }
  }

  for (const [hashtag, handles] of tagToHandles) {
    if (handles.size < 2) continue;

    const relatedPosts = posts.filter((p) => p.hashtags.includes(hashtag));
    const confidence = Math.min(0.95, 0.55 + handles.size * 0.1);
    const eventData = {
      eventType: 'theme_convergence' as const,
      hashtags: [hashtag],
      authorHandles: [...handles],
      postIds: relatedPosts.map((p) => p.id),
    };
    const { strategy, strategyReason } = await classifyStrategy(eventData, trackedHandles);

    await insertNewsEvent({
      ...eventData,
      title: `Multiple sources on #${hashtag}`,
      summary: `${handles.size} tracked profiles posted about #${hashtag}: ${[...handles].map((h) => '@' + h).join(', ')}`,
      confidence,
      metadata: { profileCount: handles.size, postCount: relatedPosts.length },
      strategy,
      strategyReason,
    }, campaignId);
    console.log(`[news-detector] Theme convergence: #${hashtag} from ${handles.size} profiles → ${strategy}`);
  }
}

export async function detectNews(posts: ScoredPost[], campaignId: string): Promise<void> {
  try {
    const pool = getPgPool();

    const [hashtagsResult, profilesResult] = await Promise.all([
      pool.query<{ hashtag: string }>(`SELECT hashtag FROM tracked_hashtags WHERE campaign_id = $1 AND active = true`, [campaignId]),
      pool.query<{ handle: string }>(`SELECT handle FROM tracked_profiles WHERE campaign_id = $1 AND active = true`, [campaignId]),
    ]);

    const trackedHashtags = hashtagsResult.rows.map((r) => r.hashtag.toLowerCase());
    const trackedHandles = new Set(profilesResult.rows.map((r) => r.handle.toLowerCase()));

    await Promise.all([
      detectVolumeSpikes(trackedHashtags, trackedHandles, campaignId),
      detectVerifiedOriginPosts(posts, trackedHandles, campaignId),
      detectThemeConvergence(posts, trackedHandles, campaignId),
    ]);
  } catch (err) {
    console.error('[news-detector] Detection error:', err);
  }
}
