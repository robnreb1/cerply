
import type { FastifyInstance } from 'fastify';

const AI_URL = process.env.AI_URL || 'http://localhost:8090';

export function registerRDE(app: FastifyInstance) {
  app.post<{ Body: { policyId?: string; text: string } }>('/rde/decompose', async (req, reply) => {
    const res = await fetch(`${AI_URL}/rde/decompose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ policy_id: req.body.policyId, text: req.body.text })
    });
    if (!res.ok) {
      return reply.code(502).send({ code: 'AI_UPSTREAM', message: 'AI service error', details: await res.text() });
    }
    const data = await res.json();
    return data;
  });
}
