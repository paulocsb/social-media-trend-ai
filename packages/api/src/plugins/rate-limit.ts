import type { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { getRedisClient } from '@trend/db';

export async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: getRedisClient(),
    keyGenerator: (request) => {
      const jwt = (request as { user?: { sub?: string } }).user;
      return `ratelimit:api:${jwt?.sub ?? request.ip}`;
    },
    errorResponseBuilder: (_request, context) => ({
      ok: false,
      code: 'RATE_LIMIT',
      message: `Too many requests — retry after ${context.after}`,
    }),
  });
}
