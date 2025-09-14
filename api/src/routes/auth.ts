import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

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
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'dev') parts.push('Secure');
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
}


