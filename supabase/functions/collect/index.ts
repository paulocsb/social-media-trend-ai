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
// Scorer
// ----------------------------------------------------------------

// Log-scale reference: a post with ~50k weighted interactions scores ~1.0
const ENGAGEMENT_REF = 50_000;
// Exponential decay half-life: 24h
const RECENCY_HALF_LIFE_MS = 24 * 60 * 60 * 1000;

/**
 * Score a post 0–100.
 *
 * Weights:
 *   25% velocity    — engagement growth since last run (0 on first appearance)
 *   35% engAbs      — log-normalised weighted engagement (likes + comments×2 + shares×3)
 *   25% engRate     — (likes+comments)/views for reels; proxied from engAbs for images
 *   15% recency     — exponential decay with 24h half-life from publishedAt
 *
 * @param prevEngagement  previous (likes+comments) from DB; -1 = first time seen
 */
function scorePost(post: NormalizedPost, prevEngagement = -1): ScoredPost {
  // Weighted engagement — comments and shares signal stronger intent
  const weightedEng = post.likes + post.comments * 2 + post.shares * 3;
  const engAbs = Math.min(
    Math.log10(1 + weightedEng) / Math.log10(1 + ENGAGEMENT_REF),
    1,
  );

  // Engagement rate — only meaningful for reels/video with real view data
  const er = post.views > 100
    ? Math.min((post.likes + post.comments) / post.views, 1)
    : engAbs * 0.5; // image posts: proxy so ER doesn't collapse to 0

  // Velocity — growth ratio vs previous run; 0 on first appearance
  const currentEng = post.likes + post.comments;
  let velocity = 0;
  if (prevEngagement === 0 && currentEng > 0) {
    velocity = 1; // went from zero to something → max velocity
  } else if (prevEngagement > 0) {
    velocity = Math.min(Math.max((currentEng - prevEngagement) / prevEngagement, 0), 1);
  }

  // Recency — exponential decay using publishedAt when available
  const ageMs = Date.now() - (post.publishedAt ?? post.collectedAt).getTime();
  const recency = Math.exp(-ageMs / RECENCY_HALF_LIFE_MS);

  const trendScore = Math.min(100, Math.max(0,
    velocity * 0.25 * 100 +
    engAbs   * 0.35 * 100 +
    er       * 0.25 * 100 +
    recency  * 0.15 * 100,
  ));

  return { ...post, engagementRate: er, trendScore, velocityScore: velocity * 100 };
}

// ----------------------------------------------------------------
// AI scorer (Anthropic → OpenAI → Ollama, falls back to mathematical)
// ----------------------------------------------------------------

function buildScoringPrompt(posts: NormalizedPost[], prevEngMap: Map<string, number>): string {
  const payload = posts.map((p) => {
    const prevEng = prevEngMap.get(p.id) ?? -1;
    const currentEng = p.likes + p.comments;
    const engGrowth = prevEng < 0 ? null : prevEng === 0 && currentEng > 0 ? 1 : prevEng > 0 ? (currentEng - prevEng) / prevEng : 0;
    const ageHours = ((Date.now() - (p.publishedAt ?? p.collectedAt).getTime()) / 3_600_000).toFixed(1);
    return {
      id: p.id,
      mediaType: p.mediaType,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      views: p.views,
      ageHours: Number(ageHours),
      engagementGrowth: engGrowth !== null ? Number(engGrowth.toFixed(3)) : null,
      hashtagCount: p.hashtags.length,
    };
  });

  return `You are a trend scoring engine for Instagram posts. Score each post from 0 to 100 based on these criteria:

- **Engagement quality** (35 pts): likes + comments×2 + shares×3, log-normalised. A post with ~50k weighted interactions scores full marks.
- **Engagement rate** (25 pts): (likes+comments)/views for reels/video. For images with no views, proxy from engagement abs. Higher is better.
- **Velocity** (25 pts): engagementGrowth ratio vs previous collection run. null = first time seen (score 0). Negative growth = 0. Cap at 1.0 (100% growth).
- **Recency** (15 pts): exponential decay. Posts <6h old score near-full; 24h half-life; posts >72h score near 0.

Additional signals (use to break ties, not replace the formula):
- REEL > CAROUSEL > IMAGE for reach potential.
- Many hashtags (>20) slightly lowers authenticity; 5-15 is ideal.
- shares > 0 strongly boosts score.

Posts to score:
${JSON.stringify(payload, null, 2)}

Return ONLY valid JSON — no markdown, no explanation:
{"scores":[{"id":"post_id","trend_score":75},...]}`;
}

function extractJsonArray(text: string): Array<{ id: string; trend_score: number }> {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const clean = codeBlock ? codeBlock[1].trim() : text.trim();
  const parsed = JSON.parse(clean);
  if (Array.isArray(parsed)) return parsed;
  if (parsed.scores && Array.isArray(parsed.scores)) return parsed.scores;
  throw new Error('Unexpected AI scorer response shape');
}

async function callAIScorer(prompt: string): Promise<Map<string, number>> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const ollamaUrl = Deno.env.get('OLLAMA_URL');

  let rawText: string;

  if (anthropicKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic scorer error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    rawText = json.content[0].text;
  } else if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI scorer error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    rawText = json.choices[0].message.content;
  } else if (ollamaUrl) {
    const model = Deno.env.get('OLLAMA_MODEL') || 'llama3';
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
    });
    if (!res.ok) throw new Error(`Ollama scorer error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    rawText = json.response;
  } else {
    throw new Error('No AI provider configured');
  }

  const scores = extractJsonArray(rawText);
  const map = new Map<string, number>();
  for (const s of scores) {
    map.set(s.id, Math.min(100, Math.max(0, Number(s.trend_score))));
  }
  return map;
}

/**
 * Score posts using AI for the top N candidates (by math pre-score), math for the rest.
 *
 * AI_SCORER_LIMIT env var controls N (default 50). Set to 0 to disable AI scoring entirely.
 * Posts are batched at 50 per AI call.
 *
 * Returns a Map<id, score> for every post — AI scores for top candidates, math for the rest.
 * Returns null only if AI fails AND we want a full math fallback (handled by caller).
 */
async function aiScorePosts(
  posts: NormalizedPost[],
  prevEngMap: Map<string, number>,
): Promise<Map<string, number> | null> {
  const limitEnv = Deno.env.get('AI_SCORER_LIMIT');
  const limit = limitEnv !== undefined ? parseInt(limitEnv, 10) : 50;

  // Math-score everything first — O(n), no network cost
  const mathScored = posts.map((p) => ({
    post: p,
    mathScore: scorePost(p, prevEngMap.get(p.id) ?? -1).trendScore,
  }));

  const result = new Map<string, number>();

  // Populate result with math scores as baseline
  for (const { post, mathScore } of mathScored) {
    result.set(post.id, mathScore);
  }

  if (limit === 0) return result; // AI scoring disabled

  // Select top N by math score as AI candidates
  const candidates = [...mathScored]
    .sort((a, b) => b.mathScore - a.mathScore)
    .slice(0, limit)
    .map((s) => s.post);

  const BATCH = 50;
  try {
    for (let i = 0; i < candidates.length; i += BATCH) {
      const batch = candidates.slice(i, i + BATCH);
      const prompt = buildScoringPrompt(batch, prevEngMap);
      const batchScores = await callAIScorer(prompt);
      for (const [id, score] of batchScores) result.set(id, score);
    }
    console.log(`[collect] AI scored top ${candidates.length}/${posts.length} posts`);
  } catch (err) {
    console.warn('[collect] AI scorer failed, using math scores for all posts:', err instanceof Error ? err.message : err);
  }

  return result;
}

// ----------------------------------------------------------------
// Dev fixtures (DEV_MODE=true + no APIFY_TOKEN — realistic mock data)
// ----------------------------------------------------------------
function devFixtures(hashtags: string[], handles: string[]): RawPost[] {
  const now = Date.now();
  const MEDIA_TYPES = ['IMAGE', 'REEL', 'CAROUSEL_ALBUM'];
  const posts: RawPost[] = [];

  // Generate posts per hashtag
  hashtags.forEach((tag, hi) => {
    for (let i = 0; i < 5; i++) {
      const id = `dev_hashtag_${tag}_${i}`;
      const likes = Math.floor(1_000 + Math.random() * 50_000);
      const comments = Math.floor(likes * (0.02 + Math.random() * 0.08));
      const views = Math.floor(likes * (3 + Math.random() * 10));
      const ageMs = Math.floor(Math.random() * 48 * 60 * 60 * 1000); // up to 48 h old
      posts.push({
        id,
        source: 'apify',
        raw: {
          id,
          shortCode: `DEV${hi}${i}`,
          type: MEDIA_TYPES[(hi + i) % MEDIA_TYPES.length],
          caption: `Check out this amazing content! #${tag} #trending #instagram`,
          hashtags: [tag, 'trending', 'instagram'],
          likesCount: likes,
          commentsCount: comments,
          videoViewCount: views,
          ownerUsername: `creator_${hi}_${i}`,
          timestamp: new Date(now - ageMs).toISOString(),
          displayUrl: `https://picsum.photos/seed/${id}/400/400`,
          url: `https://www.instagram.com/p/DEV${hi}${i}/`,
        },
        collectedAt: new Date(),
      });
    }
  });

  // Generate posts per profile handle
  handles.forEach((handle, hi) => {
    for (let i = 0; i < 3; i++) {
      const id = `dev_profile_${handle}_${i}`;
      const likes = Math.floor(5_000 + Math.random() * 100_000);
      const comments = Math.floor(likes * (0.01 + Math.random() * 0.05));
      const views = Math.floor(likes * (2 + Math.random() * 8));
      const ageMs = Math.floor(Math.random() * 72 * 60 * 60 * 1000);
      posts.push({
        id,
        source: 'apify',
        raw: {
          id,
          shortCode: `DEVP${hi}${i}`,
          type: MEDIA_TYPES[i % MEDIA_TYPES.length],
          caption: `New post from @${handle} — great vibes only ✨ #content #creator`,
          hashtags: ['content', 'creator'],
          likesCount: likes,
          commentsCount: comments,
          videoViewCount: views,
          ownerUsername: handle,
          timestamp: new Date(now - ageMs).toISOString(),
          displayUrl: `https://picsum.photos/seed/${id}/400/400`,
          url: `https://www.instagram.com/p/DEVP${hi}${i}/`,
        },
        collectedAt: new Date(),
      });
    }
  });

  return posts;
}

// ----------------------------------------------------------------
// Apify adapters
// ----------------------------------------------------------------
function newerThanDate(maxAgeDays: number): string {
  return new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // YYYY-MM-DD
}

async function collectHashtags(token: string, hashtags: string[], limit: number, maxAgeDays: number): Promise<RawPost[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashtags, resultsLimit: limit, onlyPostsNewerThan: newerThanDate(maxAgeDays) }),
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

async function collectProfiles(token: string, handles: string[], limit: number, maxAgeDays: number): Promise<RawPost[]> {
  const usernames = handles.map((h) => h.replace('@', ''));
  if (!usernames.length) return [];
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames, resultsLimit: limit, onlyPostsNewerThan: newerThanDate(maxAgeDays) }),
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
// Rescore handler — re-evaluate already-collected posts via AI
// ----------------------------------------------------------------
async function handleRescore(
  req: Request,
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const { campaignId, runId } = await req.json() as { campaignId: string; runId?: string };

  if (!campaignId) {
    return new Response(JSON.stringify({ ok: false, error: 'campaignId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch posts to rescore.
  // Two separate queries — avoids PostgREST .or() with nested and() + timestamp values,
  // where ISO timestamp characters (:, +, .) break the filter string parsing.
  const SELECT_COLS = 'id, likes, comments, shares, views, media_type, hashtags, author_handle, published_at, collected_at, thumbnail_url, permalink, caption, source';

  type PostRow = Record<string, unknown>;
  let dbPosts: PostRow[] = [];

  if (runId) {
    const { data: run, error: runErr } = await supabase
      .from('collection_runs')
      .select('started_at, finished_at')
      .eq('id', runId)
      .single();
    if (runErr || !run) {
      return new Response(JSON.stringify({ ok: false, error: 'Run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query 1: by run_id (reliable for posts collected after we removed ignoreDuplicates)
    const { data: byRunId } = await supabase
      .from('scored_posts')
      .select(SELECT_COLS)
      .eq('campaign_id', campaignId)
      .eq('run_id', runId);

    // Query 2: by time range (catches posts from before run_id was tracked)
    const endTime = run.finished_at ?? new Date().toISOString();
    const { data: byTime } = await supabase
      .from('scored_posts')
      .select(SELECT_COLS)
      .eq('campaign_id', campaignId)
      .gte('collected_at', run.started_at)
      .lte('collected_at', endTime);

    // Merge, deduplicate by (id, collected_at) — the composite PK
    const seen = new Set<string>();
    for (const row of [...(byRunId ?? []), ...(byTime ?? [])]) {
      const key = `${row.id}__${row.collected_at}`;
      if (!seen.has(key)) { seen.add(key); dbPosts.push(row); }
    }
  } else {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('scored_posts')
      .select(SELECT_COLS)
      .eq('campaign_id', campaignId)
      .gte('collected_at', since);
    if (error) throw error;
    dbPosts = data ?? [];
  }

  console.log(`[collect/rescore] Found ${dbPosts.length} posts to rescore`);
  if (!dbPosts.length) {
    return new Response(JSON.stringify({ ok: true, rescored: 0, message: 'No posts found for this run' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Reconstruct NormalizedPost from DB rows
  const posts: NormalizedPost[] = dbPosts.map((row) => ({
    id: row.id,
    source: row.source ?? 'apify',
    hashtags: Array.isArray(row.hashtags) ? row.hashtags as string[] : [],
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    shares: row.shares ?? 0,
    views: row.views ?? 0,
    mediaType: row.media_type ?? 'IMAGE',
    authorHandle: row.author_handle ?? undefined,
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    collectedAt: new Date(row.collected_at),
    thumbnailUrl: row.thumbnail_url ?? undefined,
    permalink: row.permalink ?? undefined,
    caption: row.caption ?? undefined,
  }));

  // Fetch previous engagement for velocity (posts from earlier runs)
  const prevEngMap = new Map<string, number>();
  const { data: prevRows } = await supabase
    .from('scored_posts')
    .select('id, likes, comments, collected_at')
    .eq('campaign_id', campaignId)
    .in('id', posts.map((p) => p.id))
    .order('collected_at', { ascending: true });

  // For each post id, use the oldest row's engagement as "previous"
  for (const row of prevRows ?? []) {
    if (!prevEngMap.has(row.id)) {
      prevEngMap.set(row.id, (row.likes ?? 0) + (row.comments ?? 0));
    }
  }

  // Score — same limit logic as collection (AI_SCORER_LIMIT env var)
  const scoreMap = await aiScorePosts(posts, prevEngMap);

  // Batch update trend_score
  const updates = posts.map((p) => ({
    id: p.id,
    trend_score: scoreMap?.get(p.id) ?? scorePost(p, prevEngMap.get(p.id) ?? -1).trendScore,
  }));
  for (let i = 0; i < updates.length; i += 100) {
    const batch = updates.slice(i, i + 100);
    for (const u of batch) {
      await supabase
        .from('scored_posts')
        .update({ trend_score: u.trend_score })
        .eq('id', u.id)
        .eq('campaign_id', campaignId);
    }
  }

  console.log(`[collect/rescore] Rescored ${updates.length} posts for campaign ${campaignId}`);

  return new Response(JSON.stringify({ ok: true, rescored: updates.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

  // Route: POST /collect/rescore
  const url = new URL(req.url);
  if (req.method === 'POST' && url.pathname.endsWith('/rescore')) {
    try {
      return await handleRescore(req, supabase);
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[collect/rescore] error:', err);
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const devMode = Deno.env.get('DEV_MODE') === 'true';
  const apifyToken = Deno.env.get('APIFY_TOKEN');
  const useFixtures = devMode && !apifyToken;

  if (!useFixtures && !apifyToken) {
    return new Response(JSON.stringify({ ok: false, error: 'APIFY_TOKEN not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let runId: string | null = null;

  try {
    const { campaignId, target = 'both', limit = 50 } = await req.json() as {
      campaignId: string;
      target?: 'hashtags' | 'profiles' | 'both';
      limit?: number;
    };

    const maxAgeDays = parseInt(Deno.env.get('MAX_POST_AGE_DAYS') ?? '2', 10);

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
    runId = run.id;

    // Fetch tracked sources
    const [{ data: hashtagRows }, { data: profileRows }] = await Promise.all([
      supabase.from('tracked_hashtags').select('hashtag').eq('campaign_id', campaignId).eq('active', true),
      supabase.from('tracked_profiles').select('handle').eq('campaign_id', campaignId).eq('active', true),
    ]);

    const hashtags = (hashtagRows ?? []).map((r) => r.hashtag);
    const handles = (profileRows ?? []).map((r) => r.handle);

    // Collect raw posts — fixtures when DEV_MODE + no token, Apify otherwise
    const rawPosts: RawPost[] = [];
    if (useFixtures) {
      console.log('[collect] DEV_MODE=true + no APIFY_TOKEN → using fixture data. To use Apify locally, add APIFY_TOKEN to your .env.local (or run with --env-file supabase/functions/.env).');
      rawPosts.push(...devFixtures(
        target !== 'profiles' ? hashtags : [],
        target !== 'hashtags' ? handles : [],
      ));
    } else {
      if (devMode) console.log('[collect] DEV_MODE + APIFY_TOKEN set — using Apify');
      if ((target === 'hashtags' || target === 'both') && hashtags.length > 0) {
        rawPosts.push(...await collectHashtags(apifyToken!, hashtags, limit, maxAgeDays));
      }
      if ((target === 'profiles' || target === 'both') && handles.length > 0) {
        rawPosts.push(...await collectProfiles(apifyToken!, handles, limit, maxAgeDays));
      }
    }

    // Normalize then drop anything older than maxAgeDays (safety net if Apify ignores the param)
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const normalized = normalizePosts(rawPosts).filter((p) => {
      const ts = (p.publishedAt ?? p.collectedAt).getTime();
      return ts >= cutoff;
    });

    // Fetch previous engagement for velocity — one query per run
    const prevEngMap = new Map<string, number>();
    if (normalized.length > 0) {
      const { data: prevPosts } = await supabase
        .from('scored_posts')
        .select('id, likes, comments')
        .eq('campaign_id', campaignId)
        .in('id', normalized.map((p) => p.id));
      for (const prev of prevPosts ?? []) {
        prevEngMap.set(prev.id, (prev.likes ?? 0) + (prev.comments ?? 0));
      }
    }

    // Score — AI for top candidates, math for the rest (aiScorePosts handles both)
    const scoreMap = normalized.length > 0
      ? await aiScorePosts(normalized, prevEngMap)
      : new Map<string, number>();

    const scored: ScoredPost[] = normalized.map((p) => {
      const mathScored = scorePost(p, prevEngMap.has(p.id) ? prevEngMap.get(p.id)! : -1);
      const finalScore = scoreMap?.get(p.id) ?? mathScored.trendScore;
      return { ...mathScored, trendScore: finalScore };
    });

    // Insert scored posts
    if (scored.length > 0) {
      const rows = scored.map((p) => ({
        id: p.id,
        campaign_id: campaignId,
        run_id: runId,
        source: p.source,
        hashtags: p.hashtags,
        media_type: p.mediaType,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        views: p.views,
        engagement_rate: isFinite(p.engagementRate) ? p.engagementRate : 0,
        trend_score: isFinite(p.trendScore) ? p.trendScore : 0,
        velocity_score: isFinite(p.velocityScore) ? p.velocityScore : 0,
        thumbnail_url: p.thumbnailUrl ?? null,
        permalink: p.permalink ?? null,
        caption: p.caption ?? null,
        author_handle: p.authorHandle ?? null,
        published_at: p.publishedAt?.toISOString() ?? null,
        collected_at: p.collectedAt.toISOString(),
      }));

      // Upsert — on conflict update scores and run attribution so run_id stays current
      const { error: upsertError } = await supabase.from('scored_posts').upsert(rows, { onConflict: 'id,collected_at' });
      if (upsertError) {
        console.error('[collect] upsert error:', JSON.stringify(upsertError));
        throw upsertError;
      }
      console.log(`[collect] upserted ${rows.length} posts, run_id=${runId}`);
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

    // Evaluate alerts against this run's hashtag scores
    const triggeredAlerts: Array<{ hashtag: string; score: number; threshold: number }> = [];
    const { data: activeAlerts } = await supabase
      .from('alerts')
      .select('hashtag, threshold')
      .eq('campaign_id', campaignId)
      .eq('active', true);

    for (const alert of activeAlerts ?? []) {
      const entry = hashtagScoreMap.get(alert.hashtag.toLowerCase());
      if (entry) {
        const score = Math.round(entry.total / entry.count);
        if (score >= alert.threshold) {
          triggeredAlerts.push({ hashtag: alert.hashtag, score, threshold: alert.threshold });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, run: updatedRun, postsFound: scored.length, triggeredAlerts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : (typeof err === 'object' && err !== null && 'message' in err)
        ? (err as { message: string }).message
        : JSON.stringify(err);
    console.error('[collect] error:', err);

    if (runId) {
      await supabase
        .from('collection_runs')
        .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: message })
        .eq('id', runId);
    }

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
