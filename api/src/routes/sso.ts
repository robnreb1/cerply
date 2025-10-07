/**
 * SSO Authentication Routes
 * Enterprise SSO login flows (Google, SAML, OIDC)
 */

import { FastifyInstance } from 'fastify';
import { ssoService } from '../sso/service';
import { db } from '../db';
import { organizations } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Session store (in production, use Redis or DB)
const SESSIONS = new Map<string, { userId: string; organizationId: string; email: string; role: string; expiresAt: number }>();

export function buildSSOCookie(sessionId: string) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const parts = [
    `cerply.sid=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export function readSSOSession(req: any): { userId: string; email: string; role: string; organizationId: string } | null {
  const raw = (req.headers?.cookie as string | undefined) || '';
  const sessionId = raw
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith('cerply.sid='))?.split('=')[1];

  if (!sessionId) return null;

  const session = SESSIONS.get(sessionId);
  if (!session) return null;

  // Check expiration
  if (session.expiresAt < Date.now()) {
    SESSIONS.delete(sessionId);
    return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    role: session.role,
    organizationId: session.organizationId,
  };
}

export async function registerSSORoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/sso/login
   * Initiate SSO login for a domain/organization
   * Body: { domain: string } or { organizationId: string }
   */
  app.post('/api/auth/sso/login', async (req, reply) => {
    const body = (req.body as any) || {};
    const { domain, organizationId } = body;

    if (!domain && !organizationId) {
      return reply.status(400).send({
        error: { code: 'MISSING_PARAMETER', message: 'Require either domain or organizationId' }
      });
    }

    try {
      // Find organization by domain or ID
      let org;
      if (organizationId) {
        const orgs = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
        org = orgs[0];
      } else if (domain) {
        const orgs = await db.select().from(organizations).where(eq(organizations.domain, domain)).limit(1);
        org = orgs[0];
      }

      if (!org) {
        return reply.status(404).send({
          error: { code: 'ORGANIZATION_NOT_FOUND', message: 'No organization found for this domain' }
        });
      }

      // Check if SSO is configured
      if (!org.ssoConfig) {
        return reply.status(400).send({
          error: { code: 'SSO_NOT_CONFIGURED', message: 'SSO not configured for this organization' }
        });
      }

      // Initiate SSO flow
      const authUrl = await ssoService.initiateLogin(org.id);

      return { ok: true, authUrl };
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'SSO_INIT_FAILED', message: error.message }
      });
    }
  });

  /**
   * GET /api/auth/sso/callback
   * Handle SSO callback from provider
   * Query: { state: string, code: string }
   */
  app.get('/api/auth/sso/callback', async (req, reply) => {
    const query = req.query as any;
    const { state, code } = query;

    if (!state || !code) {
      return reply.status(400).send({
        error: { code: 'MISSING_PARAMETER', message: 'Missing state or code' }
      });
    }

    try {
      // Handle callback
      const ssoSession = await ssoService.handleCallback(state, code);

      // Create session
      const sessionId = crypto.randomBytes(32).toString('hex');
      SESSIONS.set(sessionId, {
        userId: ssoSession.userId,
        email: ssoSession.email,
        role: ssoSession.role,
        organizationId: ssoSession.organizationId,
        expiresAt: ssoSession.expiresAt,
      });

      // Set cookie
      reply.header('Set-Cookie', buildSSOCookie(sessionId));

      // Redirect to app
      const redirectUrl = query.redirect || process.env.WEB_BASE_URL || 'http://localhost:3000';
      return reply.redirect(redirectUrl);
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'SSO_CALLBACK_FAILED', message: error.message }
      });
    }
  });

  /**
   * GET /api/auth/sso/mock/callback
   * Mock SSO callback for development
   * Query: { state: string, mock: 'true' }
   */
  app.get('/api/auth/sso/mock/callback', async (req, reply) => {
    const query = req.query as any;
    const { state, mock } = query;

    if (!state || mock !== 'true') {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Invalid mock callback request' }
      });
    }

    // In mock mode, the "code" is actually the email we want to log in as
    // Default to admin@cerply-dev.local
    const mockEmail = query.email || 'admin@cerply-dev.local';

    try {
      const ssoSession = await ssoService.handleCallback(state, mockEmail);

      // Create session
      const sessionId = crypto.randomBytes(32).toString('hex');
      SESSIONS.set(sessionId, {
        userId: ssoSession.userId,
        email: ssoSession.email,
        role: ssoSession.role,
        organizationId: ssoSession.organizationId,
        expiresAt: ssoSession.expiresAt,
      });

      // Set cookie
      reply.header('Set-Cookie', buildSSOCookie(sessionId));

      // Redirect to app
      const redirectUrl = query.redirect || process.env.WEB_BASE_URL || 'http://localhost:3000';
      return reply.redirect(redirectUrl);
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'MOCK_LOGIN_FAILED', message: error.message }
      });
    }
  });

  /**
   * GET /api/auth/sso/me
   * Get current SSO user info from session
   */
  app.get('/api/auth/sso/me', async (req, reply) => {
    const session = readSSOSession(req);

    if (!session) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      });
    }

    return {
      ok: true,
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        organizationId: session.organizationId,
      }
    };
  });

  /**
   * POST /api/auth/sso/logout
   * Clear SSO session
   */
  app.post('/api/auth/sso/logout', async (req, reply) => {
    const raw = (req.headers?.cookie as string | undefined) || '';
    const sessionId = raw
      .split(';')
      .map(s => s.trim())
      .find(s => s.startsWith('cerply.sid='))?.split('=')[1];

    if (sessionId) {
      SESSIONS.delete(sessionId);
    }

    // Clear cookie
    reply.header('Set-Cookie', 'cerply.sid=; Path=/; HttpOnly; Max-Age=0');

    return { ok: true };
  });
}

