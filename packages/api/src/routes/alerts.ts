import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPgPool } from '@trend/db';

export async function alertsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] };

  app.post('/api/alerts', { ...auth, schema: {
    body: {
      type: 'object',
      required: ['hashtag', 'threshold', 'campaignId'],
      properties: {
        hashtag:    { type: 'string' },
        threshold:  { type: 'number' },
        campaignId: { type: 'string' },
      },
    },
  }}, async (request, reply) => {
    const { hashtag, threshold, campaignId } = request.body as { hashtag: string; threshold: number; campaignId: string };
    const userId = (request.user as { sub: string }).sub;
    const pool = getPgPool();
    const { rows } = await pool.query(
      `INSERT INTO alerts (user_id, hashtag, threshold, campaign_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, hashtag, threshold, campaignId],
    );
    return reply.status(201).send({ ok: true, alert: rows[0] });
  });

  app.get('/api/alerts', auth, async (request, reply) => {
    const { campaignId } = request.query as { campaignId?: string };
    if (!campaignId) return reply.status(400).send({ ok: false, message: 'campaignId is required' });
    const userId = (request.user as { sub: string }).sub;
    const pool = getPgPool();
    const { rows } = await pool.query(
      `SELECT * FROM alerts WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC`,
      [userId, campaignId],
    );
    return { ok: true, alerts: rows };
  });

  app.patch('/api/alerts/:id', { ...auth, schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    body: {
      type: 'object',
      properties: {
        threshold: { type: 'number' },
        active:    { type: 'boolean' },
      },
    },
  }}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { threshold, active } = request.body as { threshold?: number; active?: boolean };
    const userId = (request.user as { sub: string }).sub;
    const pool = getPgPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (threshold !== undefined) { fields.push(`threshold = $${values.push(threshold)}`); }
    if (active    !== undefined) { fields.push(`active = $${values.push(active)}`); }
    if (fields.length === 0) return reply.status(400).send({ ok: false, message: 'Nothing to update' });
    values.push(id, userId);
    const { rows } = await pool.query(
      `UPDATE alerts SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
      values,
    );
    if (rows.length === 0) return reply.status(404).send({ ok: false, message: 'Alert not found' });
    return { ok: true, alert: rows[0] };
  });

  app.delete('/api/alerts/:id', { ...auth, schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  }}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as { sub: string }).sub;
    const pool = getPgPool();
    await pool.query(`DELETE FROM alerts WHERE id = $1 AND user_id = $2`, [id, userId]);
    return reply.status(204).send();
  });
}
