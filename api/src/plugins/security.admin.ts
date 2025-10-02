import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

function readAdminToken(): string {
  return (process.env.ADMIN_TOKEN ?? '').trim();
}

function getIncomingAdminToken(req: any): string | null {
  const h = (req?.headers ?? {}) as Record<string, string>;
  const x = typeof h['x-admin-token'] === 'string' ? String(h['x-admin-token']).trim() : '';
  if (x) return x;
  const a = typeof h['authorization'] === 'string' ? String(h['authorization']).trim() : '';
  if (!a) return null;
  const [scheme, token] = a.split(/\s+/, 2);
  if ((scheme || '').toLowerCase() === 'bearer' && token) return token.trim();
  return null;
}

const plugin = async (app: FastifyInstance) => {
  // Optional per-route rate limit for admin; default conservative
  const limit = Math.max(1, parseInt(process.env.ADMIN_RATE_LIMIT || '20', 10));
  const EXPECTED = readAdminToken();

  // Preflight inside this scoped instance (prefix applied by parent) via onRequest short-circuit

  // Local rate-limit registration (not global); allow per-route configs
  app.register(rateLimit as any, { global: false } as any);

  // OPTIONS preflight for admin: short-circuit early
  // Always set ACAO early so even 429s include it
  app.addHook('onRequest', (req: any, reply: any, done: () => void) => {
    if (reply.sent) return done();
    reply.header('access-control-allow-origin', '*');
    try { reply.removeHeader('access-control-allow-credentials'); } catch {}
    try { (reply as any).raw?.removeHeader?.('Access-Control-Allow-Credentials'); } catch {}
    // Handle OPTIONS preflight early to avoid any downstream guards returning 400
    const method = String(req?.method || '').toUpperCase();
    if (method === 'OPTIONS') {
      if ((reply as any).raw?.headersSent) return done();
      reply
        .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
        .header('access-control-allow-headers', 'content-type, x-admin-token, authorization')
        .code(204)
        .send();
      return;
    }
    done();
  });

  // Set headers early to avoid post-send header mutations
  app.addHook('preHandler', async (req: any, reply: any) => {
    if (reply.sent) return;
    if (String(req.method || '').toUpperCase() === 'OPTIONS') return;
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-site');
    reply.header('access-control-allow-origin', '*');
    try { reply.removeHeader('access-control-allow-credentials'); } catch {}
    try { (reply as any).raw?.removeHeader?.('access-control-allow-credentials'); } catch {}

    // Token auth (accept x-admin-token or Authorization: Bearer ...)
    if (EXPECTED) {
      const incoming = getIncomingAdminToken(req);
      if (!incoming || incoming !== EXPECTED) {
        reply.header('www-authenticate', 'Bearer');
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'invalid admin token' } });
      }
    }
    return;
  });

  // Ensure errors still include ACAO and no ACAC without touching onSend
  app.addHook('onError', async (_req: any, reply: any, _err: any) => {
    try {
      if (!reply.raw.headersSent) {
        reply.header('access-control-allow-origin', '*');
        try { reply.removeHeader('access-control-allow-credentials'); } catch {}
        try { (reply as any).raw?.removeHeader?.('access-control-allow-credentials'); } catch {}
      }
    } catch {}
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


