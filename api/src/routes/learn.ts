import type { FastifyInstance } from 'fastify';
import { query } from '../db';

const FF = process.env.FF_ADAPTIVE_ENGINE_V1 === 'true';

export function registerLearn(app: FastifyInstance) {
  if (!FF) return;

  app.get('/learn/next', async (req, reply) => {
    const { userId } = req.query as any;
    if (!userId) return reply.code(400).send({ code: 'BAD_REQUEST', message: 'userId is required' });

    // Pick the most recent objective for the demo
    const objRes = await query<{ id: string }>("SELECT id FROM objectives ORDER BY id DESC LIMIT 1");
    const obj = objRes.rows[0];
    if (!obj) return { userId, objectiveId: null, items: [] };

    // Get up to 5 items that are QA or PUBLISHED (no tricky quote escaping)
    const itemRes = await query<{ id: string }>(
      "SELECT id FROM items WHERE objective_id=$1 AND (status = 'QA' OR status = 'PUBLISHED') ORDER BY created_at DESC LIMIT 5",
      [obj.id]
    );

    return { userId, objectiveId: obj.id, items: itemRes.rows.map(r => r.id) };
  });
}
