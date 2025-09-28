import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

const plugin = async (app: FastifyInstance) => {
  // Optional per-route rate limit for admin; default conservative
  const limit = Math.max(1, parseInt(process.env.ADMIN_RATE_LIMIT || '20', 10));

  // Local rate-limit registration (not global); allow per-route configs
  app.register(rateLimit as any, { global: false } as any);

  // OPTIONS preflight for admin: short-circuit early
  app.addHook('onRequest', (req: any, reply: any, done: () => void) => {
    const url = (req as any).routeOptions?.url || (req?.raw?.url || '');
    if (!String(url).startsWith('/api/admin/')) return done();
    if (String(req.method || '').toUpperCase() !== 'OPTIONS') return done();
    reply
      .code(204)
      .header('access-control-allow-origin', '*')
      .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
      .header('access-control-allow-headers', 'content-type, x-admin-token, authorization');
    try { (reply as any).raw?.removeHeader?.('access-control-allow-credentials'); } catch {}
    reply.send(); // stop lifecycle here
  });

  // Set headers early to avoid post-send header mutations
  app.addHook('preHandler', (req: any, reply: any, done: () => void) => {
    const url = (req as any).routeOptions?.url || (req?.raw?.url || '');
    if (!String(url).startsWith('/api/admin/')) return done();
    if (String(req.method || '').toUpperCase() === 'OPTIONS') return done();
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-site');
    reply.header('access-control-allow-origin', '*');
    try { (reply as any).raw?.removeHeader?.('access-control-allow-credentials'); } catch {}
    done();
  });

  // No-op onSend (defensive): never modify headers after send
  app.addHook('onSend', async (_req: any, _reply: any, payload: any) => payload);

  // Per-route rate limit for admin POSTs (uses plugin above)
  app.addHook('onRoute', (route) => {
    const method = Array.isArray(route.method) ? route.method : [route.method];
    const mset = method.map((m: any) => String(m || '').toUpperCase());
    const isPost = mset.includes('POST');
    if (typeof route.url === 'string' && route.url.startsWith('/api/admin/') && isPost) {
      (route as any).config = { ...(route as any).config, rateLimit: { max: limit, timeWindow: '1 minute' } };
    }
  });

};

export default fp(plugin);


