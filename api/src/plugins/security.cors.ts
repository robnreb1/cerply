import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

type Opts = {
  prefixes?: string[];
};

/**
 * security.cors — unified CORS for admin (/certified) and public (/api/certified) endpoints.
 * - Admin preview routes: ACAO:*, no ACAC, OPTIONS → 204
 * - Public artifact routes: ACAO:*, no ACAC, ETag unaffected, Cache hints handled at route
 * - Security headers (Referrer-Policy, X-Content-Type-Options) applied to certified paths
 */
const plugin: FastifyPluginAsync<Opts> = async (app, opts) => {
  const defaultPrefixes = ['/api', '/api/certified', '/certified', '/api/orchestrator', '/api/auth'];
  const prefixes = Array.from(new Set([...(opts?.prefixes ?? []), ...defaultPrefixes]));

  const matches = (url: string) =>
    prefixes.some((p) => url === p || url.startsWith(p + '/'));

  const isCertifiedPublic = (url: string) =>
    url.startsWith('/api/certified/');

  const isCertifiedAdmin = (url: string) =>
    url.startsWith('/certified/');

  function setCorsHeaders(reply: FastifyReply, originHeader?: string | string[]) {
    // Invariants: ACAO:*, no ACAC
    reply.header('access-control-allow-origin', '*');
    // Do NOT set access-control-allow-credentials for these surfaces
    if ((reply as any).removeHeader) {
      try { (reply as any).removeHeader('access-control-allow-credentials'); } catch {}
    }
    // Respect requested headers if supplied, otherwise provide a common baseline
    const acrh = Array.isArray(originHeader) ? originHeader.join(',') : (originHeader || 'content-type,authorization,x-admin-token,x-requested-with');
    reply.header('access-control-allow-headers', acrh);
    reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    reply.header('access-control-max-age', '600');
  }

  function setSecurityHeaders(reply: FastifyReply) {
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Content-Type-Options', 'nosniff');
  }

  // Preflight handling
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const url = (req.url || '/');
    if (!matches(url)) return;

    if (req.method === 'OPTIONS') {
      setCorsHeaders(reply, (req.headers as any)['access-control-request-headers']);
      // 204 no body
      return reply.code(204).send();
    }

    // Non-OPTIONS: set base CORS
    setCorsHeaders(reply);
  });

  // Security headers for certified surfaces
  app.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload: any) => {
    const url = (req.url || '/');
    if (isCertifiedPublic(url) || isCertifiedAdmin(url)) {
      setSecurityHeaders(reply);
    }
    return payload;
  });
};

export default plugin;