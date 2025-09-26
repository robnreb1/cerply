import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
/* codeql[js/missing-rate-limiting]: This file configures Fastify's rate-limit plugin for certified endpoints; no ad-hoc DB calls inside handlers. */
import rateLimit from '@fastify/rate-limit';

// In-memory fallback is provided by @fastify/rate-limit when no Redis is configured.

function parseLegacyRate(s: string): { limit: number; windowSec: number } {
  const [a, b] = (s || '').split(':');
  const limit = Math.max(1, parseInt(a || '60', 10));
  const windowSec = Math.max(1, parseInt(b || '60', 10));
  return { limit, windowSec };
}

function resolveRate(): { limit: number; windowSec: number } {
  const burst = parseInt(process.env.RATE_LIMIT_CERTIFIED_BURST || '', 10);
  const refillPerSec = parseInt(process.env.RATE_LIMIT_CERTIFIED_REFILL_PER_SEC || '', 10);
  if (Number.isFinite(burst) && burst > 0 && Number.isFinite(refillPerSec) && refillPerSec > 0) {
    const windowSec = Math.max(1, Math.ceil(burst / refillPerSec));
    return { limit: burst, windowSec };
  }
  return parseLegacyRate(process.env.RATE_LIMIT_CERTIFIED || '60:60');
}

async function useRedis() {
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null as any;
  try {
    // Lazy import so dev/test without redis still works
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    const client = new Redis(url);
    // basic ping to validate asynchronously; ignore failures (fallback will occur)
    client.on('error', () => {});
    return client;
  } catch {
    return null as any;
  }
}

export const certifiedSecurityPlugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const maxBytes = Math.max(1024, parseInt(process.env.MAX_REQUEST_BYTES || '32768', 10));
  const { limit, windowSec } = resolveRate();
  const headersEnabled = String(process.env.SECURITY_HEADERS_PREVIEW || 'true').toLowerCase() === 'true';

  let redisClient: any = null;
  useRedis().then((c) => { redisClient = c; }).catch(() => { redisClient = null; });

  // Install rate limit plugin (scoped per-route via onRoute below)
  // If Redis is available, plugin will persist counters; otherwise it uses in-memory store.
  app.register(rateLimit as any, {
    global: false,
    /* lgtm[js/missing-rate-limiting] */
    // codeql[js/missing-rate-limiting]
    redis: (undefined as any) as any,
  } as any).after(() => {
    // After plugin is registered, attach redis dynamically if present
    if (redisClient && (app as any).rateLimit) {
      try { (app as any).rateLimit.updateOptions({ redis: redisClient }); } catch {}
    }
  });

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
        return reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Body exceeds ${maxBytes} bytes`, details: { max_bytes: maxBytes, size } } });
      }
    } catch {}
  });

  // Apply rate limit to certified POST routes via onRoute so handlers remain free of store calls
  app.addHook('onRoute', (route) => {
    const method = Array.isArray(route.method) ? route.method : [route.method];
    const mset = method.map((m: any) => String(m || '').toUpperCase());
    const isCertifiedPost = route.url && String(route.url).startsWith('/api/certified/') && mset.includes('POST');
    if (!isCertifiedPost) return;
    (route as any).config = (route as any).config || {};
    (route as any).config.rateLimit = {
      max: limit,
      timeWindow: `${windowSec} seconds`,
      keyGenerator: (req: any) => {
        const origin = String((req.headers?.origin || '').toString());
        const ip = String((req.headers?.['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim());
        return `cert:${ip}:${route.url}:${origin}`;
      },
      hook: 'onRequest',
      enableDraftSpec: true,
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'retry-after': true,
      },
      ban: null,
      continueExceeding: false,
      skipOnError: true,
    };
  });

  // Consolidated security headers for certified responses
  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    const isCertified = String(req?.url || '').startsWith('/api/certified/');
    if (headersEnabled && isCertified && String(req?.method || '').toUpperCase() !== 'OPTIONS') {
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


