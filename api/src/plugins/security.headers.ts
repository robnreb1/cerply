import type { FastifyInstance } from 'fastify';

export default async function securityHeaders(app: FastifyInstance) {
  app.addHook('onRequest', async (req: any, reply: any) => {
    if (reply.sent) return;

    // Always-on conservative defaults
    reply.header('referrer-policy', 'no-referrer');
    reply.header('cross-origin-opener-policy', 'same-origin');

    // Conditional CORP: set a global default for non-certified only
    const url = String(req.url || '');
    const isCertified = url.startsWith('/api/certified/');
    if (!isCertified) {
      if (!reply.hasHeader('cross-origin-resource-policy')) {
        reply.header('cross-origin-resource-policy', 'same-site');
      }
    }
  });

  // Finalizer: ensure CORP cannot be overwritten by later hooks/plugins.
  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    // never touch hijacked admin replies
    if (reply.raw?.headersSent || reply.sent) return payload;
    const url = String(req.url || '');
    if (url.startsWith('/api/admin/')) return payload;
    const method = String(req.method || '').toUpperCase();
    if (method === 'OPTIONS') return payload;
    const inPreview = process.env.CERTIFIED_PREVIEW === 'true' || process.env.SECURITY_HEADERS_PREVIEW === 'true' || process.env.NODE_ENV === 'test';
    if (inPreview && url.startsWith('/api/certified/')) {
      reply.header('cross-origin-resource-policy', 'same-origin');
    }
    return payload;
  });
}


