import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { setHeaderSafe, removeHeaderSafe } from './_safeHeaders';

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

  // Always set ACAO early so even 429s include it (all admin paths)
  app.addHook('onRequest', async (req: any, reply: any) => {
    if (reply.sent) return;
    const method = String(req?.method || '').toUpperCase();
    setHeaderSafe(reply, 'access-control-allow-origin', '*');
    removeHeaderSafe(reply, 'access-control-allow-credentials');
    // TERMINAL preflight: hijack and end immediately so no further hooks run
    if (method === 'OPTIONS') {
      try { if ((reply as any).raw?.headersSent) return; } catch {}
      try { (reply as any).hijack?.(); } catch {}
      try {
        (reply as any).raw.setHeader?.('access-control-allow-origin', '*');
        (reply as any).raw.setHeader?.('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
        (reply as any).raw.setHeader?.('access-control-allow-headers', 'content-type, x-admin-token, authorization');
        (reply as any).raw.setHeader?.('vary', 'Origin, Access-Control-Request-Headers');
        (reply as any).raw.statusCode = 204;
        (reply as any).raw.end();
      } catch {}
      return;
    }
    return;
  });

  // Dedicated preflight route for admin: terminal 204
  app.options('/*', async (_req: any, reply: any) => {
    setHeaderSafe(reply, 'access-control-allow-origin', '*');
    setHeaderSafe(reply, 'access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    setHeaderSafe(reply, 'access-control-allow-headers', 'content-type, x-admin-token, authorization');
    setHeaderSafe(reply, 'vary', 'Origin, Access-Control-Request-Headers');
    return reply.code(204).send();
  });

  // Set headers early to avoid post-send header mutations
  app.addHook('preHandler', async (req: any, reply: any) => {
    if (reply.sent) return;
    if (String(req.method || '').toUpperCase() === 'OPTIONS') return;
    setHeaderSafe(reply, 'X-Content-Type-Options', 'nosniff');
    setHeaderSafe(reply, 'Referrer-Policy', 'no-referrer');
    setHeaderSafe(reply, 'Cross-Origin-Opener-Policy', 'same-origin');
    setHeaderSafe(reply, 'Cross-Origin-Resource-Policy', 'same-site');
    setHeaderSafe(reply, 'access-control-allow-origin', '*');
    removeHeaderSafe(reply, 'access-control-allow-credentials');

    // Token auth (accept x-admin-token or Authorization: Bearer ...)
    if (EXPECTED) {
      const incoming = getIncomingAdminToken(req);
      if (!incoming || incoming !== EXPECTED) {
        setHeaderSafe(reply, 'www-authenticate', 'Bearer');
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'invalid admin token' } });
      }
    }
    return;
  });

  // Ensure errors still include ACAO and no ACAC without touching onSend
  app.addHook('onError', async (_req: any, reply: any, _err: any) => {
    try {
      if (!reply.raw.headersSent) {
        setHeaderSafe(reply, 'access-control-allow-origin', '*');
        removeHeaderSafe(reply, 'access-control-allow-credentials');
      }
    } catch {}
  });

  // onSend guard (defensive): never modify headers after they were already sent (e.g., hijacked preflight)
  app.addHook('onSend', async (_req: any, reply: any, payload: any) => {
    try { if ((reply as any).raw?.headersSent) return payload; } catch {}
    return payload;
  });

  // Per-route rate limit for admin POSTs (uses plugin above)
  app.addHook('onRoute', (route) => {
    const method = Array.isArray(route.method) ? route.method : [route.method];
    const mset = method.map((m: any) => String(m || '').toUpperCase());
    const isPost = mset.includes('POST');
    if (typeof route.url === 'string' && isPost) {
      (route as any).config = { ...(route as any).config, rateLimit: { max: limit, timeWindow: '1 minute' } };
    }
  });

};

export default fp(plugin);


