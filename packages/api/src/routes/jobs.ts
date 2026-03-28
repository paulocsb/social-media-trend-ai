import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Bull from 'bull';
import { createBullRedis, getTrackedHashtags, getTrackedProfiles, getActiveCampaigns } from '@trend/db';

const QUEUE_NAMES = ['collect:hashtag', 'collect:profile'] as const;
type QueueName = typeof QUEUE_NAMES[number];

const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

function makeQueue(name: string) {
  return new Bull(name, { createClient: () => createBullRedis() });
}

const queues = Object.fromEntries(QUEUE_NAMES.map((name) => [name, makeQueue(name)])) as Record<QueueName, Bull.Queue>;

function getQueue(name: string): Bull.Queue | null {
  return (QUEUE_NAMES as readonly string[]).includes(name) ? queues[name as QueueName] : null;
}

export async function jobsRoutes(app: FastifyInstance) {
  const auth = {
    onRequest: [(app as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate],
  };

  // GET /api/jobs — list all queues with stats and recent jobs
  app.get('/api/jobs', auth, async () => {
    const stats = await Promise.all(
      QUEUE_NAMES.map(async (name) => {
        const q = queues[name];
        const counts = await q.getJobCounts();
        const [waiting, active, completed, failed] = await Promise.all([
          q.getJobs(['waiting'], 0, 5),
          q.getJobs(['active'], 0, 5),
          q.getJobs(['completed'], 0, 5),
          q.getJobs(['failed'], 0, 5),
        ]);
        return {
          name,
          counts,
          recent: [
            ...waiting.map((j)   => ({ id: j.id, status: 'waiting',   data: j.data, timestamp: j.timestamp })),
            ...active.map((j)    => ({ id: j.id, status: 'active',    data: j.data, timestamp: j.timestamp })),
            ...completed.map((j) => ({ id: j.id, status: 'completed', data: j.data, timestamp: j.timestamp })),
            ...failed.map((j)    => ({ id: j.id, status: 'failed',    data: j.data, timestamp: j.timestamp, failedReason: j.failedReason })),
          ].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 10),
        };
      }),
    );
    return { ok: true, queues: stats };
  });

  // POST /api/jobs/trigger — enqueue hashtag collection
  // If campaignId provided: trigger for that campaign only
  // If omitted: trigger for all active campaigns
  app.post('/api/jobs/trigger', auth, async (_request, _reply) => {
    const { campaignId } = _request.body as { campaignId?: string };
    const campaigns = campaignId
      ? [{ id: campaignId }]
      : await getActiveCampaigns();

    const results: string[] = [];
    for (const c of campaigns) {
      const rows = await getTrackedHashtags(c.id, true);
      if (!rows.length) continue;
      const hashtags = rows.map((r) => r.hashtag);
      await queues['collect:hashtag'].add({ hashtags, campaignId: c.id }, JOB_DEFAULTS);
      results.push(`${c.id}: ${hashtags.join(', ')}`);
    }

    if (!results.length) return { ok: false, message: 'No active hashtags found in any campaign' };
    return { ok: true, message: `Enqueued ${results.length} campaign(s)` };
  });

  // POST /api/jobs/trigger/profiles — enqueue profile collection
  // If campaignId provided: trigger for that campaign only
  // If omitted: trigger for all active campaigns
  app.post('/api/jobs/trigger/profiles', auth, async (_request, _reply) => {
    const { campaignId } = _request.body as { campaignId?: string };
    const campaigns = campaignId
      ? [{ id: campaignId }]
      : await getActiveCampaigns();

    const results: string[] = [];
    for (const c of campaigns) {
      const rows = await getTrackedProfiles(c.id, true);
      if (!rows.length) continue;
      const handles = rows.map((r) => r.handle);
      await queues['collect:profile'].add({ handles, campaignId: c.id }, JOB_DEFAULTS);
      results.push(`${c.id}: ${handles.join(', ')}`);
    }

    if (!results.length) return { ok: false, message: 'No active profiles found in any campaign' };
    return { ok: true, message: `Enqueued ${results.length} campaign(s)` };
  });

  // POST /api/jobs/:queue/:jobId/run — re-enqueue with highest priority
  app.post('/api/jobs/:queue/:jobId/run', { ...auth, schema: {
    params: {
      type: 'object',
      required: ['queue', 'jobId'],
      properties: { queue: { type: 'string' }, jobId: { type: 'string' } },
    },
  }}, async (request, reply) => {
    const { queue: queueName, jobId } = request.params as { queue: string; jobId: string };
    const q = getQueue(queueName);
    if (!q) return reply.status(404).send({ ok: false, code: 'NOT_FOUND', message: 'Queue not found' });

    const job = await q.getJob(jobId);
    if (!job) return reply.status(404).send({ ok: false, code: 'NOT_FOUND', message: 'Job not found' });

    await job.remove();
    await q.add(job.data, { attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, priority: 1 });
    return { ok: true };
  });

  // DELETE /api/jobs/:queue/:jobId — remove a specific job
  app.delete('/api/jobs/:queue/:jobId', { ...auth, schema: {
    params: {
      type: 'object',
      required: ['queue', 'jobId'],
      properties: { queue: { type: 'string' }, jobId: { type: 'string' } },
    },
  }}, async (request, reply) => {
    const { queue: queueName, jobId } = request.params as { queue: string; jobId: string };
    const q = getQueue(queueName);
    if (!q) return reply.status(404).send({ ok: false, code: 'NOT_FOUND', message: 'Queue not found' });

    const job = await q.getJob(jobId);
    if (!job) return reply.status(404).send({ ok: false, code: 'NOT_FOUND', message: 'Job not found' });

    await job.remove();
    return reply.status(204).send();
  });

  // DELETE /api/jobs/:queue — clear jobs by status (or all)
  app.delete('/api/jobs/:queue', { ...auth, schema: {
    params: {
      type: 'object',
      required: ['queue'],
      properties: { queue: { type: 'string' } },
    },
    querystring: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['completed', 'failed', 'waiting', 'delayed', 'all'] } },
    },
  }}, async (request, reply) => {
    const { queue: queueName } = request.params as { queue: string };
    const { status = 'all' } = request.query as { status?: string };
    const q = getQueue(queueName);
    if (!q) return reply.status(404).send({ ok: false, code: 'NOT_FOUND', message: 'Queue not found' });

    if (status === 'all') {
      await q.obliterate({ force: true });
    } else {
      const cleanStatus = status === 'waiting' ? 'wait' : status as Bull.JobStatusClean;
      await q.clean(0, cleanStatus);
    }

    return { ok: true, message: `Cleared ${status} jobs from ${queueName}` };
  });
}
