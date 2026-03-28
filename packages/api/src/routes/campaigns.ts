import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { listCampaigns, getCampaign, insertCampaign, updateCampaign, deleteCampaign } from '@trend/db';

type AuthApp = FastifyInstance & { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }

export async function campaignsRoutes(fastify: FastifyInstance) {
  const app = fastify as AuthApp;
  const auth = { onRequest: [app.authenticate] };

  app.get('/api/campaigns', auth, async (request) => {
    const userId = (request.user as { sub: string }).sub;
    const campaigns = await listCampaigns(userId);
    return { ok: true, campaigns };
  });

  app.post('/api/campaigns', { ...auth, schema: {
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name:        { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500 },
        color:       { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
      },
    },
  }}, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub;
    const body = request.body as { name: string; description?: string; color?: string };
    const campaign = await insertCampaign(userId, body);
    return reply.status(201).send({ ok: true, campaign });
  });

  app.patch('/api/campaigns/:id', { ...auth, schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    body: {
      type: 'object',
      properties: {
        name:        { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', nullable: true },
        color:       { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        active:      { type: 'boolean' },
      },
    },
  }}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as { sub: string }).sub;
    const body = request.body as { name?: string; description?: string | null; color?: string; active?: boolean };

    // Verify ownership
    const existing = await getCampaign(id);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({ ok: false, message: 'Campaign not found' });
    }

    const campaign = await updateCampaign(id, body);
    return { ok: true, campaign };
  });

  app.delete('/api/campaigns/:id', { ...auth, schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  }}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as { sub: string }).sub;

    const existing = await getCampaign(id);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({ ok: false, message: 'Campaign not found' });
    }

    await deleteCampaign(id);
    return reply.status(204).send();
  });
}
