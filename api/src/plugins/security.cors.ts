import type { FastifyInstance, FastifyPluginCallback } from 'fastify';

type CorsPluginOpts = { prefixes: string[] };

export const registerSecurityCors: FastifyPluginCallback<CorsPluginOpts> = (app: FastifyInstance, opts, done) => {
  const prefixes = (opts?.prefixes || []).map(s => s.replace(/\/$/, ''));

  // OPTIONS 204 for each prefix
  app.addHook('onRequest', async (req: any, reply: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      if (method !== 'OPTIONS') return;
      const url = String(req?.url || '');
      if (!prefixes.some(p => url.startsWith(p + '/'))) return;
      reply
        .header('access-control-allow-origin', '*')
        .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
        .header('access-control-allow-headers', 'content-type, authorization')
        .code(204)
        .send();
    } catch {}
  });

  // For non-OPTIONS responses on these prefixes, enforce ACAO:* and strip ACAC and debug header
  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    try {
      if ((reply as any).hijacked === true || (reply as any).raw?.headersSent) return payload;
      const method = String(req?.method || '').toUpperCase();
      if (method === 'OPTIONS') return payload;
      const url = String(req?.url || '');
      if (!prefixes.some(p => url.startsWith(p + '/'))) return payload;
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      try { (reply as any).removeHeader?.('x-cors-certified-hook'); } catch {}
    } catch {}
    return payload;
  });

  done();
};

export default registerSecurityCors;


