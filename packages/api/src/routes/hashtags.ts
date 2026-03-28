import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Bull from 'bull';
import {
  getTrackedHashtags,
  addTrackedHashtag,
  updateTrackedHashtag,
  deleteTrackedHashtag,
  createBullRedis,
} from '@trend/db';

const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

const hashtagQueue = new Bull('collect:hashtag', { createClient: () => createBullRedis() });

export async function hashtagsRoutes(app: FastifyInstance) {
  const auth = {
    onRequest: [(app as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate],
  };

  app.get('/api/hashtags', auth, async (request, reply) => {
    const { campaignId } = request.query as { campaignId?: string };
    if (!campaignId) return reply.status(400).send({ ok: false, message: 'campaignId is required' });
    const hashtags = await getTrackedHashtags(campaignId, false);
    return { ok: true, hashtags };
  });

  app.post('/api/hashtags', { ...auth, schema: {
    body: {
      type: 'object',
      required: ['hashtag', 'campaignId'],
      properties: {
        hashtag:    { type: 'string', minLength: 1 },
        campaignId: { type: 'string' },
      },
    },
  }}, async (request, reply) => {
    const { hashtag, campaignId } = request.body as { hashtag: string; campaignId: string };
    const created = await addTrackedHashtag(campaignId, hashtag);
    await hashtagQueue.add({ hashtags: [hashtag], campaignId }, JOB_DEFAULTS);
    return reply.status(201).send({ ok: true, hashtag: created });
  });

  app.patch('/api/hashtags/:id', { ...auth, schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    body: {
      type: 'object',
      properties: {
        hashtag: { type: 'string', minLength: 1 },
        active:  { type: 'boolean' },
      },
    },
  }}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { hashtag?: string; active?: boolean };
    const updated = await updateTrackedHashtag(id, body);
    if (!updated) return reply.status(404).send({ ok: false, code: 'NOT_FOUND', message: 'Hashtag not found' });
    if (body.active === true) {
      await hashtagQueue.add({ hashtags: [updated.hashtag], campaignId: updated.campaignId }, JOB_DEFAULTS);
    }
    return { ok: true, hashtag: updated };
  });

  app.delete('/api/hashtags/:id', { ...auth, schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  }}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteTrackedHashtag(id);
    if (!deleted) return reply.status(404).send({ ok: false, code: 'NOT_FOUND', message: 'Hashtag not found' });
    return reply.status(204).send();
  });
}
