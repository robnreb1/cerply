import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export const adminSecurityPlugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  // Optional per-route rate limit for admin; default conservative
  const limit = Math.max(1, parseInt(process.env.ADMIN_RATE_LIMIT || '20', 10));

  // Local rate-limit registration (not global); allow per-route configs
  app.register(rateLimit as any, { global: false } as any);

  // (moved to explicit app.options route below)

  // OPTIONS preflight for admin: handle via onRequest to catch any path
  app.addHook('onRequest', async (req: any, reply: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      const url = String(req?.url || '');
      if (method === 'OPTIONS' && url.startsWith('/api/admin/')) {
        reply
          .header('access-control-allow-origin', '*')
          .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
          .header('access-control-allow-headers', 'content-type, x-admin-token');
        try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
        return reply.code(204).send();
      }
    } catch {}
  });

  // Set headers early to avoid post-send header mutations
  app.addHook('preHandler', async (req: any, reply: any) => {
    const isAdmin = String(req?.url || '').startsWith('/api/admin/');
    if (!isAdmin) return;
    const method = String(req?.method || '').toUpperCase();
    if (method === 'OPTIONS') return; // handled in onRequest/options route
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-site');
    reply.header('access-control-allow-origin', '*');
    try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
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

  done();
};

export default adminSecurityPlugin;


