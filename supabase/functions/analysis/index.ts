import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ----------------------------------------------------------------
// Prompt builders (ported from packages/api)
// ----------------------------------------------------------------
function buildAnalysisPrompt(data: {
  campaignName: string;
  campaignDescription: string | null;
  hashtags: Array<{ hashtag: string; score: number }>;
  posts: Array<{
    id: string; author_handle?: string; caption?: string; likes: number;
    comments: number; views: number; permalink?: string; trend_score: number;
    published_at?: string; collected_at: string;
  }>;
  events: Array<{ event_type: string; title: string; summary: string | null; confidence: number; strategy: string | null }>;
}): string {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const theme = data.campaignDescription ? `${data.campaignName} — ${data.campaignDescription}` : data.campaignName;

  const hashtagSection = data.hashtags.length
    ? data.hashtags.map((h, i) => `${i + 1}. #${h.hashtag} (score: ${h.score.toFixed(0)})`).join('\n')
    : 'No trending hashtags in the last 24h.';

  const postsSection = data.posts.length
    ? data.posts.map((p) => {
        const age = p.published_at
          ? `Published: ${p.published_at.split('T')[0]}`
          : `Collected: ${p.collected_at.split('T')[0]}`;
        const caption = p.caption ? p.caption.slice(0, 300) + (p.caption.length > 300 ? '...' : '') : '(no caption)';
        return [
          `### ${p.author_handle ? '@' + p.author_handle : 'Unknown'} | ID: ${p.id}`,
          `Trend Score: ${p.trend_score.toFixed(1)} | Likes: ${p.likes.toLocaleString()} | Comments: ${p.comments.toLocaleString()} | Views: ${p.views.toLocaleString()}`,
          age,
          `Caption: "${caption}"`,
          p.permalink ? `Link: ${p.permalink}` : '',
        ].filter(Boolean).join('\n');
      }).join('\n\n')
    : 'No posts collected in the last 24h.';

  const eventsSection = data.events.length
    ? data.events.map((e) => {
        const strat = e.strategy ? ` -> Strategy: ${e.strategy}` : '';
        return `- [${e.event_type.replace('_', ' ').toUpperCase()}] ${e.title} (confidence: ${Math.round(e.confidence * 100)}%)${strat}\n  ${e.summary ?? ''}`;
      }).join('\n')
    : 'No events detected yet.';

  return `# Trend Intelligence Report -- ${date}\nCampaign: ${theme}\n\nYou are a content analyst for this campaign. Review the data below and identify which posts represent genuine news worth creating Instagram content about.\n\n---\n\n## Trending Hashtags (Last 24h)\n${hashtagSection}\n\n---\n\n## Posts from Tracked Sources\n${postsSection}\n\n---\n\n## Detected News Events\n${eventsSection}\n\n---\n\n## Your Task\n\nAnalyze the posts and events above. Select the ones that are truly newsworthy for the **${data.campaignName}** campaign.\n\n**Return ONLY the following JSON -- no extra text, no markdown, just valid JSON:**\n\n{"selectedPostIds":["post_id_1"],"mainTopic":"One-line description","reasoning":"Why newsworthy","suggestedHashtags":["hashtag1"],"contentIdeas":["Idea 1: ..."],"urgencyLevel":"high","contentFormat":"reel"}\n\n**urgencyLevel:** "high" (breaking, <6h), "medium" (trending, <48h), "low" (evergreen)\n**contentFormat:** "reel", "carousel", "image", or "any"\n`;
}

function buildContentPrompt(data: {
  campaignName: string;
  mainTopic: string;
  reasoning: string | null;
  suggestedHashtags: string[];
  contentIdeas: string[];
  urgencyLevel: string;
  contentFormat: string;
}, posts: Array<{
  id: string; author_handle?: string; caption?: string;
  likes: number; comments: number; permalink?: string;
}>): string {
  const selectedPostsSection = posts.length
    ? posts.map((p) => {
        const caption = p.caption ? p.caption.slice(0, 200) + (p.caption.length > 200 ? '...' : '') : '';
        return `@${p.author_handle ?? 'unknown'} -- ${p.likes.toLocaleString()} likes\n"${caption}"\n${p.permalink ?? ''}`;
      }).join('\n\n')
    : 'No reference posts selected.';

  const ideasSection = data.contentIdeas.length
    ? data.contentIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')
    : 'No specific ideas provided.';

  const urgencyNote: Record<string, string> = {
    high: 'BREAKING -- post ASAP.',
    medium: 'TRENDING -- topic still hot.',
    low: 'EVERGREEN -- focus on depth.',
  };
  const formatNote: Record<string, string> = {
    reel: 'Reel (15-60s). Hook in 3 seconds.',
    carousel: 'Carousel (5-10 slides). Strong cover + CTA.',
    image: 'Single Image. Caption does storytelling.',
    any: 'Choose best format. Reels get most reach.',
  };

  return `# Instagram Post Creation Brief\nCampaign: ${data.campaignName}\n\n## Context\nTopic: ${data.mainTopic}\nWhy: ${data.reasoning ?? 'High-performing content'}\n\n## Reference Posts\n${selectedPostsSection}\n\n## Brief\nUrgency: ${urgencyNote[data.urgencyLevel] ?? urgencyNote.medium}\nFormat: ${formatNote[data.contentFormat] ?? formatNote.any}\n\nIdeas:\n${ideasSection}\n\n## Create:\n1. Caption (max 2200 chars) -- hook, body, question, hashtags at end\n2. Visual description\n3. 30 hashtags (brand + niche + broad)\n4. Best posting time\n\n*Generated by Trend Intelligence Platform*\n`;
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

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/analysis\/?/, '');

  try {
    // GET /analysis/prompt?campaignId=...
    if (req.method === 'GET' && path === 'prompt') {
      const campaignId = url.searchParams.get('campaignId');
      if (!campaignId) return new Response(JSON.stringify({ ok: false, error: 'campaignId required' }), { status: 400, headers: corsHeaders });

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const [{ data: campaign }, { data: posts }, { data: events }, { data: snapshots }] = await Promise.all([
        supabase.from('campaigns').select('name, description').eq('id', campaignId).single(),
        supabase.from('scored_posts').select('id, author_handle, caption, likes, comments, views, permalink, trend_score, published_at, collected_at')
          .eq('campaign_id', campaignId).gte('collected_at', since24h).order('trend_score', { ascending: false }).limit(20),
        supabase.from('news_events').select('event_type, title, summary, confidence, strategy')
          .eq('campaign_id', campaignId).gte('detected_at', since48h).order('confidence', { ascending: false }).limit(10),
        supabase.from('hashtag_snapshots').select('hashtag, trend_score')
          .eq('campaign_id', campaignId).gte('snapshotted_at', since24h).order('trend_score', { ascending: false }).limit(20),
      ]);

      if (!campaign) return new Response(JSON.stringify({ ok: false, error: 'Campaign not found' }), { status: 404, headers: corsHeaders });

      // Deduplicate hashtags by name, keep highest score
      const hashtagMap = new Map<string, number>();
      for (const s of snapshots ?? []) {
        const cur = hashtagMap.get(s.hashtag) ?? 0;
        if (s.trend_score > cur) hashtagMap.set(s.hashtag, s.trend_score);
      }
      const hashtags = [...hashtagMap.entries()].map(([hashtag, score]) => ({ hashtag, score }));

      const prompt = buildAnalysisPrompt({
        campaignName: campaign.name,
        campaignDescription: campaign.description,
        hashtags,
        posts: posts ?? [],
        events: events ?? [],
      });

      return new Response(JSON.stringify({ ok: true, prompt, meta: { postCount: posts?.length ?? 0, eventCount: events?.length ?? 0, hashtagCount: hashtags.length } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /analysis  — submit AI response
    if (req.method === 'POST' && path === '') {
      const body = await req.json() as {
        campaignId: string;
        selectedPostIds?: string[];
        mainTopic: string;
        reasoning?: string;
        suggestedHashtags?: string[];
        contentIdeas?: string[];
        urgencyLevel?: string;
        contentFormat?: string;
      };

      if (!body.campaignId || !body.mainTopic) {
        return new Response(JSON.stringify({ ok: false, error: 'campaignId and mainTopic required' }), { status: 400, headers: corsHeaders });
      }

      const { data: campaign } = await supabase.from('campaigns').select('name').eq('id', body.campaignId).single();
      if (!campaign) return new Response(JSON.stringify({ ok: false, error: 'Campaign not found' }), { status: 404, headers: corsHeaders });

      let selectedPosts: Array<Record<string, unknown>> = [];
      if (body.selectedPostIds?.length) {
        const { data } = await supabase.from('scored_posts')
          .select('id, author_handle, caption, likes, comments, permalink')
          .eq('campaign_id', body.campaignId)
          .in('id', body.selectedPostIds);
        selectedPosts = data ?? [];
      }

      const contentPrompt = buildContentPrompt(
        {
          campaignName: campaign.name,
          mainTopic: body.mainTopic,
          reasoning: body.reasoning ?? null,
          suggestedHashtags: body.suggestedHashtags ?? [],
          contentIdeas: body.contentIdeas ?? [],
          urgencyLevel: body.urgencyLevel ?? 'medium',
          contentFormat: body.contentFormat ?? 'any',
        },
        selectedPosts as Parameters<typeof buildContentPrompt>[1],
      );

      const { data: analysis, error } = await supabase.from('ai_analyses').insert({
        campaign_id: body.campaignId,
        selected_post_ids: body.selectedPostIds ?? [],
        main_topic: body.mainTopic,
        reasoning: body.reasoning ?? null,
        suggested_hashtags: body.suggestedHashtags ?? [],
        content_ideas: body.contentIdeas ?? [],
        urgency_level: body.urgencyLevel ?? 'medium',
        content_format: body.contentFormat ?? 'any',
        content_prompt: contentPrompt,
      }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, analysis }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analysis]', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
