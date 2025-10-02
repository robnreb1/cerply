import type { FastifyInstance, FastifyPluginCallback } from 'fastify';

type CorsPluginOpts = { prefixes: string[] };

export const registerSecurityCors: FastifyPluginCallback<CorsPluginOpts> = (app: FastifyInstance, opts, done) => {
  const prefixes = (opts?.prefixes || []).map(s => s.replace(/\/$/, ''));
  // Exclude admin, orchestrator, and auth paths to avoid overlapping with their scoped plugins
  const isManagedPath = (url: string) => prefixes.some(p => url.startsWith(p + '/'))
    && !url.startsWith('/api/admin/')
    && !url.startsWith('/api/orchestrator/')
    && !url.startsWith('/api/auth/');

  // OPTIONS 204 for each prefix
  app.addHook('onRequest', async (req: any, reply: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      if (method !== 'OPTIONS') return;
      const url = String(req?.url || '');
      if (!isManagedPath(url)) return;
      // Guard: if already handled, skip
      if ((reply as any).hijacked === true || (reply as any).raw?.headersSent) return;
      reply
        .header('access-control-allow-origin', '*')
        .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
        .header('access-control-allow-headers', 'content-type, authorization, x-admin-token')
        .code(204)
        .send();
    } catch {}
  });

  // For non-OPTIONS responses on these prefixes, enforce headers early in preHandler; avoid onSend mutations
  app.addHook('preHandler', async (req: any, reply: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      if (method === 'OPTIONS') return;
      const url = String(req?.url || '');
      if (!isManagedPath(url)) return;
      if ((reply as any).raw?.headersSent) return;
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      try { (reply as any).removeHeader?.('x-cors-certified-hook'); } catch {}
    } catch {}
  });

  done();
};

export default registerSecurityCors;


