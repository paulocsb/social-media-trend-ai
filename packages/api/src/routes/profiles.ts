import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Bull from 'bull';
import {
  getTrackedProfiles,
  addTrackedProfile,
  updateTrackedProfile,
  deleteTrackedProfile,
  createBullRedis,
} from '@trend/db';

const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

const profileQueue = new Bull('collect:profile', { createClient: () => createBullRedis() });

export async function profilesRoutes(app: FastifyInstance) {
  const auth = {
    onRequest: [(app as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate],
  };

  app.get('/api/profiles', auth, async (request, reply) => {
    const { campaignId } = request.query as { campaignId?: string };
    if (!campaignId) return reply.status(400).send({ ok: false, message: 'campaignId is required' });
    const profiles = await getTrackedProfiles(campaignId, false);
    return { ok: true, profiles };
  });

  app.post('/api/profiles', { ...auth, schema: {
    body: { type: 'object', required: ['handle', 'campaignId'], properties: {
      handle:     { type: 'string', minLength: 1 },
      campaignId: { type: 'string' },
    }},
  }}, async (request, reply) => {
    const { handle, campaignId } = request.body as { handle: string; campaignId: string };
    const created = await addTrackedProfile(campaignId, handle);
    await profileQueue.add({ handles: [created.handle], campaignId }, JOB_DEFAULTS);
    return reply.status(201).send({ ok: true, profile: created });
  });

  app.patch('/api/profiles/:id', { ...auth, schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    body: { type: 'object', properties: { active: { type: 'boolean' }, handle: { type: 'string' } } },
  }}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { active?: boolean; handle?: string };
    const updated = await updateTrackedProfile(id, body);
    if (!updated) return reply.status(404).send({ ok: false, message: 'Profile not found' });
    if (body.active === true) {
      await profileQueue.add({ handles: [updated.handle], campaignId: updated.campaignId }, JOB_DEFAULTS);
    }
    return { ok: true, profile: updated };
  });

  app.delete('/api/profiles/:id', { ...auth, schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  }}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteTrackedProfile(id);
    if (!deleted) return reply.status(404).send({ ok: false, message: 'Profile not found' });
    return reply.status(204).send();
  });
}
