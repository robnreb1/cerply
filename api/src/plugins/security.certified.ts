import type { FastifyInstance, FastifyPluginCallback } from 'fastify';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function parseRate(s: string): { limit: number; windowSec: number } {
  const [a, b] = (s || '').split(':');
  const limit = Math.max(1, parseInt(a || '60', 10));
  const windowSec = Math.max(1, parseInt(b || '60', 10));
  return { limit, windowSec };
}

export const certifiedSecurityPlugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const maxBytes = Math.max(1024, parseInt(process.env.MAX_REQUEST_BYTES || '65536', 10));
  const { limit, windowSec } = parseRate(process.env.RATE_LIMIT_CERTIFIED || '60:60');
  const previewHeaders = String(process.env.SECURITY_HEADERS_PREVIEW || 'false').toLowerCase() === 'true';

  // Request size limit (for JSON bodies) specific to certified routes
  app.addHook('preValidation', async (req: any, reply: any) => {
    const url = String(req?.url || '');
    if (!url.startsWith('/api/certified/')) return;
    try {
      const hdrLen = Number((req.headers?.['content-length'] ?? '0')) || 0;
      let calcLen = 0;
      try { calcLen = Buffer.byteLength(JSON.stringify((req as any).body ?? {}), 'utf8'); } catch {}
      const size = Math.max(hdrLen, calcLen);
      if (size > maxBytes) {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Body exceeds ${maxBytes} bytes`, details: { limit: maxBytes, size } } });
      }
    } catch {}
  });

  // Simple IP+route+origin token bucket (preview only)
  app.addHook('onRequest', async (req: any, reply: any) => {
    const url = String(req?.url || '');
    if (!url.startsWith('/api/certified/')) return;
    const origin = String((req.headers?.origin || '').toString());
    const ip = String((req.headers?.['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim());
    const key = `${ip}:${url}:${origin}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now >= b.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
      return;
    }
    b.count += 1;
    if (b.count > limit) {
      const remaining = 0;
      reply
        .header('x-ratelimit-limit', String(limit))
        .header('x-ratelimit-remaining', String(remaining))
        .header('retry-after', String(windowSec))
        .header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    }
  });

  // Conservative security headers for certified responses (preview toggle)
  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    if (previewHeaders && String(req?.url || '').startsWith('/api/certified/') && String(req?.method || '').toUpperCase() !== 'OPTIONS') {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('Referrer-Policy', 'no-referrer');
      reply.header('Cross-Origin-Resource-Policy', 'same-origin');
      reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    }
    return payload;
  });

  done();
};

export default certifiedSecurityPlugin;


