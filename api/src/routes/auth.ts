import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { createSession } from '../session';
import { readCookie } from '../session';

type Session = { email: string; createdAt: number };
const SESSIONS = new Map<string, Session>();

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildCookie(token: string) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const parts = [
    `cerply_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export function readSession(req: any): Session | null {
  const raw = (req.headers?.cookie as string | undefined) || '';
  const token = raw
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith('cerply_session='))?.split('=')[1];
  if (!token) return null;
  return SESSIONS.get(token) || null;
}

export async function registerAuthRoutes(app: FastifyInstance) {
  // DEV login – returns a callback URL that sets the cookie
  app.post('/api/auth/login', async (req, reply) => {
    reply.header('x-api', 'auth-login');
    const body = (req.body as any) || {};
    const email = String(body.email || process.env.DEV_MAGIC_USER_EMAIL || 'dev@cerply.dev');
    const token = makeToken();
    SESSIONS.set(token, { email, createdAt: Date.now() });
    const next = `/api/auth/callback?token=${token}`;
    return { ok: true, next };
  });

  // Callback – sets cookie and returns next hop
  app.get('/api/auth/callback', async (req, reply) => {
    reply.header('x-api', 'auth-callback');
    const token = (req.query as any)?.token as string | undefined;
    if (!token || !SESSIONS.has(token)) {
      return reply.code(400).send({ ok: false, error: 'invalid-token' });
    }
    reply.header('Set-Cookie', buildCookie(token));
    return { ok: true, next: '/api/auth/me' };
  });

  // Who am I?
  app.get('/api/auth/me', async (req, reply) => {
    reply.header('x-api', 'auth-me');
    const sess = readSession(req);
    if (!sess) return { ok: false, user: null };
    return { ok: true, user: { email: sess.email } };
  });

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.header('x-api', 'auth-logout');
    reply.header('Set-Cookie', 'cerply_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return { ok: true };
  });

  // Session creation endpoint for CSRF tests
  app.post('/api/auth/session', async (req, reply) => {
    reply.header('x-api', 'auth-session');
    const session = await createSession();

    // Set both session and CSRF cookies
    reply.header('Set-Cookie', [
      `sid=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
      `csrf=${session.csrfToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    ]);

    return {
      ok: true,
      csrf_token: session.csrfToken,
      session_id: session.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  });

  // Session retrieval endpoint
  app.get('/api/auth/session', async (req, reply) => {
    reply.header('x-api', 'auth-session');
    
    // Check for session cookie
    const cookieName = String(process.env.AUTH_COOKIE_NAME ?? 'sid');
    const sid = readCookie(req, cookieName);
    
    if (!sid) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No session found' } });
    }
    
    // For now, return basic session info (could be enhanced with actual session validation)
    return {
      ok: true,
      session_id: sid,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  });

  // Session deletion endpoint for clearing cookies
  app.delete('/api/auth/session', async (req, reply) => {
    reply.header('x-api', 'auth-session');
    
    // Clear both session and CSRF cookies by setting Max-Age=0
    reply.header('Set-Cookie', [
      'sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'csrf=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    ]);

    return { ok: true };
  });
}


