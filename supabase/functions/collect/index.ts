import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface RawPost {
  id: string;
  source: 'apify';
  raw: Record<string, unknown>;
  collectedAt: Date;
}

interface NormalizedPost {
  id: string;
  source: string;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  mediaType: string;
  authorHandle?: string;
  publishedAt?: Date;
  collectedAt: Date;
  thumbnailUrl?: string;
  permalink?: string;
  caption?: string;
}

interface ScoredPost extends NormalizedPost {
  engagementRate: number;
  trendScore: number;
  velocityScore: number;
}

// ----------------------------------------------------------------
// Normalizer (ported from packages/processor)
// ----------------------------------------------------------------
function normalizeMediaType(raw: string | undefined): string {
  const upper = (raw ?? '').toUpperCase();
  if (upper === 'REEL' || upper === 'VIDEO') return 'REEL';
  if (upper === 'CAROUSEL_ALBUM' || upper === 'CAROUSEL') return 'CAROUSEL';
  return 'IMAGE';
}

function extractHashtags(caption: string | undefined): string[] {
  if (!caption) return [];
  return [...caption.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase());
}

function normalizePost(raw: RawPost): NormalizedPost {
  const r = raw.raw;
  const caption = r.caption as string | undefined;
  const shortCode = (r.shortCode ?? r.shortcode) as string | undefined;
  const apifyHashtags = Array.isArray(r.hashtags)
    ? (r.hashtags as string[]).map((h) => h.replace(/^#/, '').toLowerCase())
    : null;

  const rawTs = r.timestamp ?? r.takenAtTimestamp ?? r.taken_at_timestamp ?? r.takenAt ?? r.postedAt ?? r.date;
  let publishedAt: Date | undefined;
  if (typeof rawTs === 'number' && !isNaN(rawTs)) {
    const d = new Date(rawTs < 1e10 ? rawTs * 1000 : rawTs);
    if (!isNaN(d.getTime())) publishedAt = d;
  } else if (typeof rawTs === 'string') {
    const d = new Date(rawTs);
    if (!isNaN(d.getTime())) publishedAt = d;
  }

  return {
    id: raw.id,
    source: raw.source,
    hashtags: apifyHashtags ?? extractHashtags(caption),
    likes: (r.likesCount ?? r.like_count ?? 0) as number,
    comments: (r.commentsCount ?? r.comments_count ?? r.comment_count ?? 0) as number,
    shares: (r.share_count ?? 0) as number,
    views: (r.videoViewCount ?? r.video_view_count ?? r.play_count ?? 0) as number,
    mediaType: normalizeMediaType((r.type ?? r.media_type) as string | undefined),
    authorHandle: (r.ownerUsername ?? r.username ?? r.owner_username ?? (r.owner as Record<string, unknown>)?.username) as string | undefined,
    publishedAt,
    collectedAt: raw.collectedAt,
    thumbnailUrl: (r.displayUrl ?? r.thumbnailUrl) as string | undefined,
    permalink: (r.url as string | undefined) ?? (shortCode ? `https://www.instagram.com/p/${shortCode}/` : undefined),
    caption: caption ?? undefined,
  };
}

function normalizePosts(rawPosts: RawPost[]): NormalizedPost[] {
  return rawPosts
    .map(normalizePost)
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
}

// ----------------------------------------------------------------
// Scorer (ported from packages/processor)
// ----------------------------------------------------------------
const DECAY_WINDOW_MS = 6 * 60 * 60 * 1000;

function scorePost(post: NormalizedPost, velocityScore = 0): ScoredPost {
  const total = post.likes + post.comments + post.shares;
  const er = total / Math.max(post.views, 1);
  const abs = Math.min(total / 100_000, 1);
  const ageMs = Date.now() - post.collectedAt.getTime();
  const recency = Math.max(0, 1 - ageMs / DECAY_WINDOW_MS);

  const trendScore = Math.min(100, Math.max(0,
    velocityScore * 0.40 +
    er * 0.30 * 100 +
    abs * 0.20 * 100 +
    recency * 0.10 * 100,
  ));

  return { ...post, engagementRate: er, trendScore, velocityScore };
}

// ----------------------------------------------------------------
// Apify adapters
// ----------------------------------------------------------------
async function collectHashtags(token: string, hashtags: string[], limit: number): Promise<RawPost[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashtags, resultsLimit: limit }),
      signal: AbortSignal.timeout(290_000),
    },
  );
  if (!res.ok) throw new Error(`Apify hashtag error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  if (!text.trim()) return [];
  const data = JSON.parse(text) as Array<Record<string, unknown>>;
  return data.map((item) => ({
    id: `apify_${item.id ?? item.shortCode ?? Math.random()}`,
    source: 'apify' as const,
    raw: item,
    collectedAt: new Date(),
  }));
}

async function collectProfiles(token: string, handles: string[], limit: number): Promise<RawPost[]> {
  const usernames = handles.map((h) => h.replace('@', ''));
  if (!usernames.length) return [];
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames, resultsLimit: limit }),
      signal: AbortSignal.timeout(290_000),
    },
  );
  if (!res.ok) throw new Error(`Apify profile error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  if (!text.trim()) return [];
  const data = JSON.parse(text) as Array<Record<string, unknown>>;
  return data.flatMap((item) => {
    const nested = (item.latestPosts ?? item.posts ?? item.edges) as Array<Record<string, unknown>> | undefined;
    const handle = (item.username ?? item.handle) as string | undefined;
    if (Array.isArray(nested) && nested.length > 0) {
      return nested.map((post) => ({
        id: `apify_profile_${handle ?? 'unknown'}_${post.id ?? post.shortCode ?? Math.random()}`,
        source: 'apify' as const,
        raw: { ownerUsername: handle, ...post },
        collectedAt: new Date(),
      }));
    }
    return [{
      id: `apify_profile_${handle ?? 'unknown'}_${item.id ?? item.shortCode ?? Math.random()}`,
      source: 'apify' as const,
      raw: { ownerUsername: handle, ...item },
      collectedAt: new Date(),
    }];
  });
}

// ----------------------------------------------------------------
// Edge Function handler
// ----------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const apifyToken = Deno.env.get('APIFY_TOKEN');
  if (!apifyToken) {
    return new Response(JSON.stringify({ ok: false, error: 'APIFY_TOKEN not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { campaignId, target = 'both', limit = 50 } = await req.json() as {
      campaignId: string;
      target?: 'hashtags' | 'profiles' | 'both';
      limit?: number;
    };

    if (!campaignId) {
      return new Response(JSON.stringify({ ok: false, error: 'campaignId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create collection run record
    const { data: run, error: runErr } = await supabase
      .from('collection_runs')
      .insert({ campaign_id: campaignId, target, status: 'running' })
      .select()
      .single();

    if (runErr) throw runErr;

    // Fetch tracked sources
    const [{ data: hashtagRows }, { data: profileRows }] = await Promise.all([
      supabase.from('tracked_hashtags').select('hashtag').eq('campaign_id', campaignId).eq('active', true),
      supabase.from('tracked_profiles').select('handle').eq('campaign_id', campaignId).eq('active', true),
    ]);

    const hashtags = (hashtagRows ?? []).map((r) => r.hashtag);
    const handles = (profileRows ?? []).map((r) => r.handle);

    // Collect raw posts
    const rawPosts: RawPost[] = [];
    if ((target === 'hashtags' || target === 'both') && hashtags.length > 0) {
      rawPosts.push(...await collectHashtags(apifyToken, hashtags, limit));
    }
    if ((target === 'profiles' || target === 'both') && handles.length > 0) {
      rawPosts.push(...await collectProfiles(apifyToken, handles, limit));
    }

    // Normalize and score
    const normalized = normalizePosts(rawPosts);
    const scored = normalized.map((p) => scorePost(p));

    // Insert scored posts
    if (scored.length > 0) {
      const rows = scored.map((p) => ({
        id: p.id,
        campaign_id: campaignId,
        source: p.source,
        hashtags: p.hashtags,
        media_type: p.mediaType,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        views: p.views,
        engagement_rate: p.engagementRate,
        trend_score: p.trendScore,
        velocity_score: p.velocityScore,
        thumbnail_url: p.thumbnailUrl ?? null,
        permalink: p.permalink ?? null,
        caption: p.caption ?? null,
        author_handle: p.authorHandle ?? null,
        published_at: p.publishedAt?.toISOString() ?? null,
        collected_at: p.collectedAt.toISOString(),
      }));

      // Upsert — skip duplicate (id, collected_at) pairs
      await supabase.from('scored_posts').upsert(rows, { onConflict: 'id,collected_at', ignoreDuplicates: true });
    }

    // Snapshot hashtag trend scores
    const hashtagScoreMap = new Map<string, { total: number; count: number }>();
    for (const post of scored) {
      for (const tag of post.hashtags) {
        const entry = hashtagScoreMap.get(tag) ?? { total: 0, count: 0 };
        entry.total += post.trendScore;
        entry.count += 1;
        hashtagScoreMap.set(tag, entry);
      }
    }
    if (hashtagScoreMap.size > 0) {
      const snapshots = [...hashtagScoreMap.entries()].map(([hashtag, { total, count }]) => ({
        campaign_id: campaignId,
        hashtag,
        trend_score: total / count,
        post_count: count,
      }));
      await supabase.from('hashtag_snapshots').insert(snapshots);
    }

    // Compute top hashtags for run summary
    const topHashtags = [...hashtagScoreMap.entries()]
      .sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)
      .slice(0, 10)
      .map(([hashtag, { total, count }]) => ({ hashtag, score: Math.round(total / count) }));

    // Update run to completed
    const { data: updatedRun } = await supabase
      .from('collection_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        posts_found: scored.length,
        top_hashtags: topHashtags,
      })
      .eq('id', run.id)
      .select()
      .single();

    return new Response(JSON.stringify({ ok: true, run: updatedRun, postsFound: scored.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[collect]', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
