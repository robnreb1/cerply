import type { FastifyInstance, FastifyPluginCallback, FastifyRequest } from 'fastify';
import { createSession, deleteSession, getSession, readCookie, type SessionRecord } from '../session';

type AuthPluginOpts = {};

declare module 'fastify' {
  interface FastifyRequest {
    session?: SessionRecord | null;
  }
}

function env() {
  return {
    enabled: String(process.env.AUTH_ENABLED ?? 'false').toLowerCase() === 'true',
    requireSession: String(process.env.AUTH_REQUIRE_SESSION ?? 'false').toLowerCase() === 'true',
    cookieName: String(process.env.AUTH_COOKIE_NAME ?? 'sid'),
    ttlSeconds: parseInt(process.env.AUTH_SESSION_TTL_SECONDS || '604800', 10) || 604800,
  } as const;
}

function isApiPath(url: string): boolean { return url.startsWith('/api/'); }
function isGet(method: string): boolean { return method === 'GET'; }
function isOptions(method: string): boolean { return method === 'OPTIONS'; }

function isMutating(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function isGuardedPath(url: string): boolean {
  return url.startsWith('/api/orchestrator/') || url.startsWith('/api/certified/');
}

async function loadSessionOnRequest(req: FastifyRequest) {
  const cookieName = String(process.env.AUTH_COOKIE_NAME ?? 'sid');
  const sid = readCookie(req, cookieName);
  const sess = await getSession(sid);
  (req as any).session = sess;
}

export const authSecurityPlugin: FastifyPluginCallback<AuthPluginOpts> = (app: FastifyInstance, _opts, done) => {
  const ENV = env();
  if (!ENV.enabled) { done(); return; }

  // OPTIONS CORS invariants for /api/auth/session (explicit route)
  app.options('/api/auth/session', async (_req, reply) => {
    reply
      .header('access-control-allow-origin', '*')
      .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
      .header('access-control-allow-headers', 'content-type, x-csrf-token')
      .code(204)
      .send();
  });

  // Attach session to every request
  app.addHook('onRequest', async (req: any, _reply: any) => { await loadSessionOnRequest(req); });

  // CSRF double-submit for non-GET under /api/
  app.addHook('preHandler', async (req: any, reply: any) => {
    const method = String(req?.method || '').toUpperCase();
    const url = String(req?.url || '');
    if (isOptions(method)) return;
    if (!isApiPath(url)) return;
    // Bootstrap: never require CSRF for auth endpoints
    if (url.startsWith('/api/auth/')) return;
    if (isGet(method)) return;

    const sess: SessionRecord | null | undefined = (req as any).session;
    const headerToken = String((req.headers?.['x-csrf-token'] ?? '')).trim();
    const cookieToken = String(readCookie(req, 'csrf') || '').trim();
    const valid = Boolean(sess && headerToken && cookieToken && headerToken === sess.csrfToken && cookieToken === sess.csrfToken);
    if (!valid) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(403).send({ error: { code: 'CSRF', message: 'csrf required' } });
    }
  });

  // Optional require-session for mutating guarded routes
  app.addHook('preHandler', async (req: any, reply: any) => {
    const requireSession = String(process.env.AUTH_REQUIRE_SESSION ?? 'false').toLowerCase() === 'true';
    if (!requireSession) return;
    const method = String(req?.method || '').toUpperCase();
    const url = String(req?.url || '');
    if (!isMutating(method)) return;
    if (!isGuardedPath(url)) return;
    const sess: SessionRecord | null | undefined = (req as any).session;
    if (!sess) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'session required' } });
    }
  });

  // Non-OPTIONS responses: enforce CORS invariants for auth endpoints
  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    try {
      if ((reply as any).hijacked === true || (reply as any).raw?.headersSent) return payload;
      const method = String(req?.method || '').toUpperCase();
      const url = String(req?.url || '');
      if (url.startsWith('/api/auth/') && method !== 'OPTIONS') {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
      }
    } catch {}
    return payload;
  });

  // Routes: /api/auth/session
  app.post('/api/auth/session', async (req: any, reply: any) => {
    const { ttlSeconds, cookieName } = env();
    const sess = await createSession(ttlSeconds);
    const parts = [
      `${cookieName}=${sess.id}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${ttlSeconds}`,
    ];
    if (process.env.NODE_ENV === 'production') parts.push('Secure');
    // client-accessible csrf cookie
    const csrfParts = [
      `csrf=${sess.csrfToken}`,
      'Path=/',
      'SameSite=Lax',
      `Max-Age=${ttlSeconds}`,
    ];
    if (process.env.NODE_ENV === 'production') csrfParts.push('Secure');
    reply.header('Set-Cookie', `${parts.join('; ')}, ${csrfParts.join('; ')}`);
    return reply.send({ session_id: sess.id, csrf_token: sess.csrfToken, expires_at: new Date(sess.expiresAt).toISOString() });
  });

  app.get('/api/auth/session', async (req: any, reply: any) => {
    const sess: SessionRecord | null | undefined = (req as any).session;
    if (!sess) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'no session' } });
    return reply.send({ session_id: sess.id, expires_at: new Date(sess.expiresAt).toISOString() });
  });

  app.delete('/api/auth/session', async (req: any, reply: any) => {
    const cookieName = String(process.env.AUTH_COOKIE_NAME ?? 'sid');
    const sid = readCookie(req, cookieName);
    if (sid) await deleteSession(sid);
    // clear cookies
    const clearSid = `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
    const clearCsrf = `csrf=; Path=/; SameSite=Lax; Max-Age=0`;
    reply.header('Set-Cookie', `${clearSid}, ${clearCsrf}`);
    return reply.send({ ok: true });
  });

  done();
};

export default authSecurityPlugin;


