import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  insertCollectionRun,
  updateCollectionRun,
  listCollectionRuns,
  getCollectionRun,
  type RunTarget,
} from '@trend/db';

type AuthApp = FastifyInstance & { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }

export async function runsRoutes(fastify: FastifyInstance) {
  const app = fastify as AuthApp;
  const auth = { onRequest: [app.authenticate] };

  app.get('/api/runs', auth, async (request, reply) => {
    const { campaignId } = request.query as { campaignId?: string };
    if (!campaignId) return reply.status(400).send({ ok: false, message: 'campaignId is required' });
    const runs = await listCollectionRuns(campaignId, 100);
    return reply.send({ ok: true, runs });
  });

  app.get('/api/runs/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await getCollectionRun(id);
    if (!run) return reply.status(404).send({ ok: false, message: 'Run not found' });
    return reply.send({ ok: true, run });
  });

  app.post('/api/runs', auth, async (request, reply) => {
    const { target = 'both', triggeredBy = 'manual', campaignId } = request.body as {
      target?: RunTarget
      triggeredBy?: string
      campaignId: string
    };
    if (!campaignId) return reply.status(400).send({ ok: false, message: 'campaignId is required' });
    const run = await insertCollectionRun(campaignId, target, triggeredBy);
    return reply.status(201).send({ ok: true, run });
  });

  app.patch('/api/runs/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status: 'completed' | 'failed' | 'partial'
      postsFound?: number
      eventsFound?: number
      topHashtags?: Array<{ hashtag: string; score: number }>
      topEvents?: Array<{ topic: string; strategy: string | null }>
      errorMessage?: string
    };
    const run = await updateCollectionRun(id, body);
    if (!run) return reply.status(404).send({ ok: false, message: 'Run not found' });
    return reply.send({ ok: true, run });
  });
}
