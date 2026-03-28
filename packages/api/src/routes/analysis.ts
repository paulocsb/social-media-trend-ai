import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getTopPosts, getRecentNewsEvents, getRedisClient, leaderboardKey,
  insertAIAnalysis, getLatestAIAnalysis, listAIAnalyses, getCampaign,
} from '@trend/db';
import type { InsertAIAnalysis } from '@trend/db';

const auth = (app: FastifyInstance) => ({
  onRequest: [(app as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate],
});

function buildAnalysisPrompt(data: {
  campaignName: string;
  campaignDescription: string | null;
  hashtags: Array<{ hashtag: string; score: number }>;
  posts: Array<{
    id: string; authorHandle?: string; caption?: string; likes: number;
    comments: number; views: number; permalink?: string; trendScore: number;
    publishedAt?: Date; collectedAt: Date;
  }>;
  events: Array<{ eventType: string; title: string; summary: string | null; confidence: number; strategy: string | null }>;
}): string {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const theme = data.campaignDescription
    ? `${data.campaignName} — ${data.campaignDescription}`
    : data.campaignName;

  const hashtagSection = data.hashtags.length
    ? data.hashtags.map((h, i) => `${i + 1}. #${h.hashtag} (score: ${h.score.toFixed(0)})`).join('\n')
    : 'No trending hashtags in the last 24h.';

  const postsSection = data.posts.length
    ? data.posts.map((p) => {
        const age = p.publishedAt
          ? `Published: ${p.publishedAt.toISOString().split('T')[0]}`
          : `Collected: ${p.collectedAt.toISOString().split('T')[0]}`;
        const caption = p.caption ? p.caption.slice(0, 300) + (p.caption.length > 300 ? '...' : '') : '(no caption)';
        return [
          `### ${p.authorHandle ? '@' + p.authorHandle : 'Unknown'} | ID: ${p.id}`,
          `Trend Score: ${p.trendScore.toFixed(1)} | Likes: ${p.likes.toLocaleString()} | Comments: ${p.comments.toLocaleString()} | Views: ${p.views.toLocaleString()}`,
          age,
          `Caption: "${caption}"`,
          p.permalink ? `Link: ${p.permalink}` : '',
        ].filter(Boolean).join('\n');
      }).join('\n\n')
    : 'No posts collected in the last 24h.';

  const eventsSection = data.events.length
    ? data.events.map((e) => {
        const strat = e.strategy ? ` -> Strategy: ${e.strategy}` : '';
        return `- [${e.eventType.replace('_', ' ').toUpperCase()}] ${e.title} (confidence: ${Math.round(e.confidence * 100)}%)${strat}\n  ${e.summary ?? ''}`;
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
  id: string; authorHandle?: string; caption?: string;
  likes: number; comments: number; permalink?: string;
}>): string {
  const selectedPostsSection = posts.length
    ? posts.map((p) => {
        const caption = p.caption ? p.caption.slice(0, 200) + (p.caption.length > 200 ? '...' : '') : '';
        return `@${p.authorHandle ?? 'unknown'} -- ${p.likes.toLocaleString()} likes\n"${caption}"\n${p.permalink ?? ''}`;
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

export async function analysisRoutes(app: FastifyInstance) {
  const a = auth(app);

  app.get('/api/analysis/prompt', { ...a, schema: {
    querystring: { type: 'object', required: ['campaignId'], properties: { campaignId: { type: 'string' } } },
  }}, async (request, reply) => {
    const { campaignId } = request.query as { campaignId: string };
    const campaign = await getCampaign(campaignId);
    if (!campaign) return reply.status(404).send({ ok: false, message: 'Campaign not found' });

    const redis = getRedisClient();
    const [postsResult, eventsResult, hashtagEntries] = await Promise.all([
      getTopPosts(campaignId, 20, 24, false),
      getRecentNewsEvents(campaignId, 10, 48, false),
      redis.zrevrange(leaderboardKey(campaignId, '24h'), 0, 19, 'WITHSCORES'),
    ]);

    const hashtags: Array<{ hashtag: string; score: number }> = [];
    for (let i = 0; i < hashtagEntries.length; i += 2) {
      hashtags.push({ hashtag: hashtagEntries[i], score: parseFloat(hashtagEntries[i + 1]) });
    }

    const prompt = buildAnalysisPrompt({
      campaignName: campaign.name,
      campaignDescription: campaign.description,
      hashtags,
      posts: postsResult as Parameters<typeof buildAnalysisPrompt>[0]['posts'],
      events: eventsResult as Parameters<typeof buildAnalysisPrompt>[0]['events'],
    });

    return { ok: true, prompt, meta: { postCount: postsResult.length, eventCount: eventsResult.length, hashtagCount: hashtags.length } };
  });

  app.post('/api/analysis', { ...a, schema: {
    body: { type: 'object', required: ['campaignId', 'mainTopic'], properties: { campaignId: { type: 'string' }, mainTopic: { type: 'string' } } },
  }}, async (request, reply) => {
    const body = request.body as InsertAIAnalysis;
    if (!body.campaignId) return reply.status(400).send({ ok: false, message: 'campaignId is required' });

    const campaign = await getCampaign(body.campaignId);
    if (!campaign) return reply.status(404).send({ ok: false, message: 'Campaign not found' });

    const selectedPosts = body.selectedPostIds?.length
      ? await getTopPosts(body.campaignId, 100, 72, false).then((posts) =>
          posts.filter((p) => body.selectedPostIds.includes(p.id)),
        )
      : [];

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

    const analysis = await insertAIAnalysis({ ...body, contentPrompt });
    return reply.status(201).send({ ok: true, analysis });
  });

  app.get('/api/analysis/latest', { ...a, schema: {
    querystring: { type: 'object', required: ['campaignId'], properties: { campaignId: { type: 'string' } } },
  }}, async (request) => {
    const { campaignId } = request.query as { campaignId: string };
    const analysis = await getLatestAIAnalysis(campaignId);
    return { ok: true, analysis };
  });

  app.get('/api/analysis', { ...a, schema: {
    querystring: { type: 'object', required: ['campaignId'], properties: { campaignId: { type: 'string' } } },
  }}, async (request) => {
    const { campaignId } = request.query as { campaignId: string };
    const analyses = await listAIAnalyses(campaignId, 10);
    return { ok: true, analyses };
  });
}
