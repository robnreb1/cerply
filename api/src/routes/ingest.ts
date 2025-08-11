
import type { FastifyInstance } from 'fastify';

type Policy = { id: string; name: string; text: string };
const mem: { policies: Record<string, Policy> } = { policies: {} };

export function registerIngest(app: FastifyInstance) {
  app.post<{ Body: { name: string; text: string } }>('/ingest/policy', async (req, reply) => {
    const id = 'pol-' + Math.random().toString(36).slice(2, 8);
    mem.policies[id] = { id, name: req.body.name, text: req.body.text };
    reply.code(201);
    return { id, name: req.body.name };
  });

  app.get('/ingest/policy/:id', async (req, reply) => {
    const id = (req.params as any).id as string;
    const p = mem.policies[id];
    if (!p) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Policy not found' });
    return p;
  });
}
