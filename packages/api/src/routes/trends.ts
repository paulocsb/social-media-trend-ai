import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRedisClient, getTopPosts, leaderboardKey } from '@trend/db';

const WINDOW_HOURS: Record<string, number> = {
  '1h': 1, '6h': 6, '24h': 24, '7d': 168,
};

export async function trendsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] };

  app.get('/api/trends/hashtags', { ...auth, schema: {
    querystring: {
      type: 'object',
      required: ['campaignId'],
      properties: {
        campaignId: { type: 'string' },
        window: { type: 'string', enum: ['1h', '6h', '24h', '7d'], default: '24h' },
        limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  }}, async (request) => {
    const { campaignId, window = '24h', limit = 20 } = request.query as { campaignId: string; window?: string; limit?: number };
    const redis = getRedisClient();
    const key = leaderboardKey(campaignId, window);
    const entries = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    const hashtags = [];
    for (let i = 0; i < entries.length; i += 2) {
      hashtags.push({ hashtag: entries[i], score: parseFloat(entries[i + 1]) });
    }
    return { ok: true, window, hashtags };
  });

  app.get('/api/trends/posts', { ...auth, schema: {
    querystring: {
      type: 'object',
      required: ['campaignId'],
      properties: {
        campaignId:   { type: 'string' },
        window:       { type: 'string', enum: ['1h', '6h', '24h', '7d'], default: '24h' },
        limit:        { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        verifiedOnly: { type: 'string', enum: ['true', 'false'], default: 'true' },
      },
    },
  }}, async (request) => {
    const { campaignId, window = '24h', limit = 20, verifiedOnly = 'true' } = request.query as {
      campaignId: string; window?: string; limit?: number; verifiedOnly?: string;
    };
    const hours = WINDOW_HOURS[window] ?? 24;
    const posts = await getTopPosts(campaignId, limit, hours, verifiedOnly !== 'false');
    return { ok: true, posts };
  });

  app.get('/api/trends/velocity', { ...auth, schema: {
    querystring: {
      type: 'object',
      required: ['campaignId'],
      properties: { campaignId: { type: 'string' } },
    },
  }}, async (request) => {
    const { campaignId } = request.query as { campaignId: string };
    const redis = getRedisClient();
    const [h1, h6] = await Promise.all([
      redis.zrevrange(leaderboardKey(campaignId, '1h'), 0, 19, 'WITHSCORES'),
      redis.zrevrange(leaderboardKey(campaignId, '6h'), 0, 19, 'WITHSCORES'),
    ]);
    const h1Map = new Map<string, number>();
    for (let i = 0; i < h1.length; i += 2) h1Map.set(h1[i], parseFloat(h1[i + 1]));
    const velocity = [];
    for (let i = 0; i < h6.length; i += 2) {
      const tag = h6[i];
      const score6h = parseFloat(h6[i + 1]);
      const score1h = h1Map.get(tag) ?? 0;
      velocity.push({ hashtag: tag, velocity: score1h - score6h / 6 });
    }
    velocity.sort((a, b) => b.velocity - a.velocity);
    return { ok: true, velocity: velocity.slice(0, 20) };
  });
}
