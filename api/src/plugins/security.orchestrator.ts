import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { readCookie, getSession } from '../session';
import rateLimit from '@fastify/rate-limit';
import { setHeaderSafe, removeHeaderSafe } from './_safeHeaders';

export const orchestratorSecurityPlugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const maxBytes = Math.max(1024, parseInt(process.env.ORCH_MAX_REQUEST_BYTES || '32768', 10));

  // Per-route rate limit via onRoute hook after plugin registration
  app.register(rateLimit as any, { global: false } as any);

  // OPTIONS preflight + early ACAO for orchestrator
  app.addHook('onRequest', async (req: any, reply: any) => {
    const url = String(req?.url || '');
    if (!url.startsWith('/api/orchestrator/')) return;
    setHeaderSafe(reply, 'access-control-allow-origin', '*');
    removeHeaderSafe(reply, 'access-control-allow-credentials');
    const method = String(req?.method || '').toUpperCase();
    if (method === 'OPTIONS') {
      setHeaderSafe(reply, 'access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
      setHeaderSafe(reply, 'access-control-allow-headers', 'content-type, authorization');
      return reply.code(204).send();
    }
  });

  // Payload limit for orchestrator POSTs
  app.addHook('preValidation', async (req: any, reply: any) => {
    const url = String(req?.url || '');
    const isOrchPost = url.startsWith('/api/orchestrator/') && String(req?.method || '').toUpperCase() === 'POST';
    if (!isOrchPost) return;
    try {
      const hdrLen = Number((req.headers?.['content-length'] ?? '0')) || 0;
      let calcLen = 0;
      try { calcLen = Buffer.byteLength(JSON.stringify((req as any).body ?? {}), 'utf8'); } catch {}
      const size = Math.max(hdrLen, calcLen);
      if (size > maxBytes) {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Body exceeds ${maxBytes} bytes`, details: { max_bytes: maxBytes, size } } });
      }
    } catch {}
  });

  // CSRF + optional session requirement (when AUTH_ENABLED)
  app.addHook('preHandler', async (req: any, reply: any) => {
    const authEnabled = String(process.env.AUTH_ENABLED ?? 'false').toLowerCase() === 'true';
    if (!authEnabled) return;
    const method = String(req?.method || '').toUpperCase();
    const url = String(req?.url || '');
    if (!url.startsWith('/api/orchestrator/')) return;
    if (method === 'OPTIONS' || method === 'GET') return;
    // Require session when flag set
    const requireSession = String(process.env.AUTH_REQUIRE_SESSION ?? 'false').toLowerCase() === 'true';
    const cookieName = String(process.env.AUTH_COOKIE_NAME ?? 'sid');
    const sid = readCookie(req, cookieName);
    const sess = await getSession(sid);
    if (requireSession && !sess) {
      setHeaderSafe(reply, 'access-control-allow-origin', '*');
      removeHeaderSafe(reply, 'access-control-allow-credentials');
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'session required' } });
    }
    // CSRF double-submit
    const headerToken = String((req.headers?.['x-csrf-token'] ?? '')).trim();
    const cookieToken = String(readCookie(req, 'csrf') || '').trim();
    const valid = Boolean(sess && headerToken && cookieToken && headerToken === sess.csrfToken && cookieToken === sess.csrfToken);
    if (!valid) {
      setHeaderSafe(reply, 'access-control-allow-origin', '*');
      removeHeaderSafe(reply, 'access-control-allow-credentials');
      return reply.code(403).send({ error: { code: 'CSRF', message: 'csrf required' } });
    }
  });

  // Security headers for non-OPTIONS (preHandler; no onSend mutations)
  app.addHook('preHandler', async (req: any, reply: any) => {
    const isOrch = String(req?.url || '').startsWith('/api/orchestrator/');
    if (!isOrch || String(req?.method || '').toUpperCase() === 'OPTIONS') return;
    setHeaderSafe(reply, 'X-Content-Type-Options', 'nosniff');
    setHeaderSafe(reply, 'Referrer-Policy', 'no-referrer');
    setHeaderSafe(reply, 'access-control-allow-origin', '*');
    removeHeaderSafe(reply, 'access-control-allow-credentials');
  });

  // Rate limit config on routes
  app.addHook('onRoute', (route) => {
    const method = Array.isArray(route.method) ? route.method : [route.method];
    const mset = method.map((m: any) => String(m || '').toUpperCase());
    const isPost = mset.includes('POST');
    if (typeof route.url === 'string' && route.url.startsWith('/api/orchestrator/') && isPost) {
      (route as any).config = { ...(route as any).config, rateLimit: { max: 20, timeWindow: '1 minute' } };
    }
  });

  done();
};

export default orchestratorSecurityPlugin;


