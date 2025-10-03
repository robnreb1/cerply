import type { FastifyPluginAsync } from 'fastify';

const certifiedApiAlias: FastifyPluginAsync = async (fastify) => {
  // Forward legacy paths (e.g., /certified/items/:id/publish) to /api/certified/...
  fastify.all('/certified/*', async (req, reply) => {
    const forwarded = await fastify.inject({
      method: req.method as any,
      url: '/api' + (req.url || ''),
      headers: req.headers as any,
      payload: (req as any).body,
    });

    // Mirror status & key headers
    reply.code(forwarded.statusCode);
    const h = forwarded.headers as Record<string, any>;
    if (h['access-control-allow-origin']) reply.header('access-control-allow-origin', h['access-control-allow-origin']);
    if (h['access-control-allow-credentials']) reply.header('access-control-allow-credentials', h['access-control-allow-credentials']);
    if (h['etag']) reply.header('etag', h['etag']);
    if (h['cache-control']) reply.header('cache-control', h['cache-control']);
    if (h['location']) reply.header('location', h['location']);
    if (h['content-type']) reply.header('content-type', h['content-type']);

    const ctype = String(h['content-type'] || '');
    if (ctype.includes('application/json')) {
      try { return reply.send(forwarded.json()); } catch { return reply.send(forwarded.body); }
    }
    return reply.send(forwarded.body);
  });
};

export default certifiedApiAlias;