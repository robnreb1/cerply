import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

/**
 * security.auth — minimal global auth/session surface.
 * Requirements:
 *  - Public certified endpoints MUST be accessible without auth:
 *      * GET /api/certified/artifacts/**
 *      * POST /api/certified/verify
 *  - Admin endpoints under /certified/** remain gated by security.admin (x-admin-token).
 *  - Do not emit 401 for public certified paths.
 */
const plugin: FastifyPluginAsync = async (app) => {

  // Early public bypass to avoid any other global 401s.
  app.addHook('onRequest', async (req: FastifyRequest, _reply: FastifyReply) => {
    const url = req.url || '';
    if (url.startsWith('/api/certified/artifacts') || url === '/api/certified/verify') {
      // Public surface: allow through with no auth/session requirement.
      return;
    }
    // For all other paths, leave to dedicated plugins (admin/orchestrator) or route-level checks.
    // If you add session loading here in the future, ensure it does NOT 401 public paths above.
  });

  // No-op onSend; headers handled by other plugins (security.cors / security.headers / security.certified).
};

export default plugin;