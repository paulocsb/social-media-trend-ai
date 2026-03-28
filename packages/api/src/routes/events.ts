import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRecentNewsEvents, getDailyPriorityEvents } from '@trend/db';

export async function eventsRoutes(app: FastifyInstance) {
  const auth = {
    onRequest: [(app as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate],
  };

  app.get('/api/events', auth, async (request, reply) => {
    const { campaignId, limit = '20', window = '48', all = 'false' } = request.query as {
      campaignId?: string; limit?: string; window?: string; all?: string;
    };
    if (!campaignId) return reply.status(400).send({ ok: false, message: 'campaignId is required' });
    const excludeDiscard = all !== 'true';
    const events = await getRecentNewsEvents(campaignId, parseInt(limit, 10), parseInt(window, 10), excludeDiscard);
    return { ok: true, events };
  });

  app.get('/api/events/priority', auth, async (request, reply) => {
    const { campaignId } = request.query as { campaignId?: string };
    if (!campaignId) return reply.status(400).send({ ok: false, message: 'campaignId is required' });
    const events = await getDailyPriorityEvents(campaignId);
    return { ok: true, events };
  });
}
