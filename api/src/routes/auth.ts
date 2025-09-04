// api/src/routes/auth.ts
import { FastifyPluginAsync } from 'fastify';
import '@fastify/cookie'; // bring setCookie/clearCookie/cookies types into Fastify

const authRoutes: FastifyPluginAsync = async (app) => {
  const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'cerply_session';
  const isProd = process.env.NODE_ENV === 'production';

  // POST /api/auth/login — dev stub that "issues" a magic link
  app.route({
    method: 'POST',
    url: '/login',
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', minLength: 3 } },
      },
    },
    handler: async (req, reply) => {
      const { email } = req.body as { email: string };
      // TODO: in prod send an email; for dev just return a callback URL
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64url');
      const callback = `/api/auth/callback?token=${token}`;
      return reply.send({ ok: true, dev: true, next: callback });
    },
  });

  // GET /api/auth/callback — set httpOnly cookie
  app.route({
    method: 'GET',
    url: '/callback',
    schema: {
      querystring: {
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string', minLength: 16 } },
      },
    },
    handler: async (req, reply) => {
      const { token } = req.query as { token: string };
      if (!token) return reply.code(400).send({ ok: false, error: 'missing token' });

      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return reply.code(204).send();
    },
  });

  // POST /api/auth/logout — clear cookie
  app.route({
    method: 'POST',
    url: '/logout',
    handler: async (_req, reply) => {
      reply.clearCookie(COOKIE_NAME, { path: '/' });
      return reply.code(204).send();
    },
  });

  // GET /api/auth/me — minimal session echo
  app.route({
    method: 'GET',
    url: '/me',
    handler: async (req, reply) => {
      const token = req.cookies?.[COOKIE_NAME];
      if (!token) return reply.code(401).send({ ok: false, user: null });
      return reply.send({ ok: true, user: { id: 'dev', email: 'dev@local', sessionToken: token } });
    },
  });
};

export default authRoutes;