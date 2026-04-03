import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ----------------------------------------------------------------
// Prompt builders
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

  return `You are a content analyst. Today is ${date}. Campaign: ${theme}.

Review the Instagram data below and produce a JSON analysis object.

## Trending Hashtags (Last 24h)
${hashtagSection}

## Posts from Tracked Sources
${postsSection}

## Detected News Events
${eventsSection}

## Instructions

Based on the data above, fill in ALL of these JSON fields with real content from the data:

- selectedPostIds: array of post IDs (from the ### headings above) that are most newsworthy
- mainTopic: a specific one-line summary of the dominant trend you found (NOT a placeholder)
- reasoning: 2-3 sentences explaining why this content is newsworthy for ${data.campaignName}
- suggestedHashtags: 5-8 relevant hashtags (without #) based on the trending data
- contentIdeas: 3-5 specific content ideas for Instagram posts about this trend
- urgencyLevel: exactly one of "high" (breaking <6h), "medium" (trending <48h), or "low" (evergreen)
- contentFormat: exactly one of "reel", "carousel", "image", or "any"

Respond with a single JSON object containing exactly those 7 fields. All string fields must be non-empty.`;
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

function buildContentPromptForAI(data: Parameters<typeof buildContentPrompt>[0], posts: Parameters<typeof buildContentPrompt>[1]): string {
  const base = buildContentPrompt(data, posts);
  return `${base}\n**Return ONLY the following JSON — no extra text, no markdown:**\n\n{"caption":"full Instagram caption here","visualDescription":"describe the visual/image","hashtags":["tag1","tag2"],"bestPostingTime":"e.g. Tuesday 7pm"}`;
}

// ----------------------------------------------------------------
// AI provider helpers
// ----------------------------------------------------------------
function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (Deno.env.get('ANTHROPIC_API_KEY')) providers.push('anthropic');
  if (Deno.env.get('OPENAI_API_KEY')) providers.push('openai');
  if (Deno.env.get('OLLAMA_URL')) providers.push('ollama');
  return providers;
}

function extractJson(text: string): Record<string, unknown> {
  // 1. Try fenced code block first
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) return JSON.parse(codeBlock[1]);
  // 2. Try to find a raw JSON object anywhere in the text
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);
  // 3. Fall back to parsing the whole trimmed text
  return JSON.parse(text.trim());
}

async function callAI(prompt: string): Promise<Record<string, unknown>> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const ollamaUrl = Deno.env.get('OLLAMA_URL');

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
        max_tokens: 2048,
        system: 'You are a JSON-only responder. Output valid JSON with no extra text, no markdown, no explanation.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return extractJson(json.content[0].text);
  }

  if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return extractJson(json.choices[0].message.content);
  }

  if (ollamaUrl) {
    const model = Deno.env.get('OLLAMA_MODEL') || 'llama3';
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        messages: [
          {
            role: 'system',
            content: 'You are a JSON-only responder. Output valid JSON with no extra text, no markdown, no explanation.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const raw = json.message?.content ?? json.response ?? '';
    console.log('[analysis/ollama] raw response:', raw.slice(0, 500));
    return extractJson(raw);
  }

  throw new Error('No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_URL.');
}

// ----------------------------------------------------------------
// Shared data fetcher (used by both /prompt and /run)
// ----------------------------------------------------------------
async function fetchCampaignData(supabase: ReturnType<typeof createClient>, campaignId: string) {
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

  if (!campaign) return null;

  const hashtagMap = new Map<string, number>();
  for (const s of snapshots ?? []) {
    const cur = hashtagMap.get(s.hashtag) ?? 0;
    if (s.trend_score > cur) hashtagMap.set(s.hashtag, s.trend_score);
  }
  const hashtags = [...hashtagMap.entries()].map(([hashtag, score]) => ({ hashtag, score }));

  return { campaign, posts: posts ?? [], events: events ?? [], hashtags };
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
  const path = url.pathname.replace(/^\/functions\/v1\/analysis\/?|^\/analysis\/?/, '');

  try {
    // GET /analysis/providers — which AI providers are configured
    if (req.method === 'GET' && path === 'providers') {
      return new Response(JSON.stringify({ ok: true, providers: getAvailableProviders() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /analysis/prompt?campaignId=...
    if (req.method === 'GET' && path === 'prompt') {
      const campaignId = url.searchParams.get('campaignId');
      if (!campaignId) return new Response(JSON.stringify({ ok: false, error: 'campaignId required' }), { status: 400, headers: corsHeaders });

      const data = await fetchCampaignData(supabase, campaignId);
      if (!data) return new Response(JSON.stringify({ ok: false, error: 'Campaign not found' }), { status: 404, headers: corsHeaders });

      const prompt = buildAnalysisPrompt({
        campaignName: data.campaign.name,
        campaignDescription: data.campaign.description,
        hashtags: data.hashtags,
        posts: data.posts,
        events: data.events,
      });

      return new Response(JSON.stringify({
        ok: true, prompt,
        meta: { postCount: data.posts.length, eventCount: data.events.length, hashtagCount: data.hashtags.length },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /analysis/run — full auto pipeline: prompt → AI → save
    if (req.method === 'POST' && path === 'run') {
      const { campaignId } = await req.json() as { campaignId: string };
      if (!campaignId) return new Response(JSON.stringify({ ok: false, error: 'campaignId required' }), { status: 400, headers: corsHeaders });

      const data = await fetchCampaignData(supabase, campaignId);
      if (!data) return new Response(JSON.stringify({ ok: false, error: 'Campaign not found' }), { status: 404, headers: corsHeaders });

      const prompt = buildAnalysisPrompt({
        campaignName: data.campaign.name,
        campaignDescription: data.campaign.description,
        hashtags: data.hashtags,
        posts: data.posts,
        events: data.events,
      });

      console.log('[analysis/run] calling AI, provider:', getAvailableProviders()[0]);
      const aiResult = await callAI(prompt);

      // Normalise AI output — small models sometimes return strings instead of arrays
      const toArray = (v: unknown): string[] => {
        if (Array.isArray(v)) return v.map(String);
        if (typeof v === 'string' && v.length) return v.split(',').map((s) => s.trim()).filter(Boolean);
        return [];
      };

      const body = {
        selectedPostIds: toArray(aiResult.selectedPostIds),
        mainTopic: (aiResult.mainTopic as string) ?? '',
        reasoning: (aiResult.reasoning as string) ?? null,
        suggestedHashtags: toArray(aiResult.suggestedHashtags),
        contentIdeas: toArray(aiResult.contentIdeas),
        urgencyLevel: (aiResult.urgencyLevel as string) ?? 'medium',
        contentFormat: (aiResult.contentFormat as string) ?? 'any',
      };

      if (!body.mainTopic) {
        console.error('[analysis/run] aiResult sample:', JSON.stringify(aiResult).slice(0, 500));
        throw new Error('AI returned empty analysis — model did not fill in mainTopic. Try a more capable model.');
      }

      let selectedPosts: Array<Record<string, unknown>> = [];
      if (body.selectedPostIds.length) {
        const { data: sp } = await supabase.from('scored_posts')
          .select('id, author_handle, caption, likes, comments, permalink')
          .eq('campaign_id', campaignId)
          .in('id', body.selectedPostIds);
        selectedPosts = sp ?? [];
      }

      const contentArgs = { campaignName: data.campaign.name, ...body };
      const contentPrompt = buildContentPrompt(
        contentArgs,
        selectedPosts as Parameters<typeof buildContentPrompt>[1],
      );

      // Second AI call — generate actual Instagram content from the brief
      console.log('[analysis/run] calling AI for content generation');
      let generatedContent: Record<string, unknown> | null = null;
      try {
        const contentPromptForAI = buildContentPromptForAI(
          contentArgs,
          selectedPosts as Parameters<typeof buildContentPrompt>[1],
        );
        generatedContent = await callAI(contentPromptForAI);
      } catch (contentErr) {
        // Non-fatal — analysis is still saved, content generation just failed
        console.error('[analysis/run] content generation failed:', contentErr);
      }

      const { data: analysis, error } = await supabase.from('ai_analyses').insert({
        campaign_id: campaignId,
        selected_post_ids: body.selectedPostIds,
        main_topic: body.mainTopic,
        reasoning: body.reasoning,
        suggested_hashtags: body.suggestedHashtags,
        content_ideas: body.contentIdeas,
        urgency_level: body.urgencyLevel,
        content_format: body.contentFormat,
        content_prompt: contentPrompt,
        generated_content: generatedContent,
      }).select().single();

      if (error) throw new Error(`DB insert failed: ${error.message ?? JSON.stringify(error)}`);

      return new Response(JSON.stringify({ ok: true, analysis }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /analysis — submit manual AI response
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

      if (error) throw new Error(`DB insert failed: ${error.message ?? JSON.stringify(error)}`);
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
