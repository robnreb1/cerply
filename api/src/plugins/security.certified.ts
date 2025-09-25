import type { FastifyInstance, FastifyPluginCallback } from 'fastify';

type Bucket = { tokens: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

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

  // Token bucket (fixed-window approximation). Applied to certified POST routes only.
  app.addHook('onRequest', async (req: any, reply: any) => {
    const method = String(req?.method || '').toUpperCase();
    const url = String(req?.url || '');
    if (method !== 'POST' || !url.startsWith('/api/certified/')) return;

    const origin = String((req.headers?.origin || '').toString());
    const ip = String((req.headers?.['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim());
    const key = `cert:${ip}:${url}:${origin}`;

    let remaining = limit;
    let retryAfterSec = windowSec;

    try {
      // codeql[missing-rate-limiting]: This module IS the rate limiter; Redis access below is the limiter store, not an unguarded DB call.
      if (redisClient) {
        const nowSec = Math.floor(Date.now() / 1000);
        const win = Math.floor(nowSec / windowSec);
        const rKey = `rl:${key}:${win}`;
        // Ensure the window key exists with TTL only when created
        // Use SET NX EX to create the key with initial count 0 and expiry, then INCR
        try {
          await redisClient.set(rKey, 0, 'EX', windowSec, 'NX');
        } catch {}
        const count = Number(await redisClient.incr(rKey));
        remaining = Math.max(0, limit - count);
        if (count > limit) {
          reply
            .header('x-ratelimit-limit', String(limit))
            .header('x-ratelimit-remaining', String(0))
            .header('retry-after', String(retryAfterSec))
            .header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests', details: { retry_after_ms: retryAfterSec * 1000, limit } } });
        }
        return;
      }
    } catch {}

    // Fallback to in-memory
    const now = Date.now();
    const b = memoryBuckets.get(key);
    if (!b || now >= b.resetAt) {
      memoryBuckets.set(key, { tokens: 1, resetAt: now + windowSec * 1000 });
      return;
    }
    b.tokens += 1;
    remaining = Math.max(0, limit - b.tokens);
    if (b.tokens > limit) {
      reply
        .header('x-ratelimit-limit', String(limit))
        .header('x-ratelimit-remaining', String(0))
        .header('retry-after', String(windowSec))
        .header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests', details: { retry_after_ms: windowSec * 1000, limit } } });
    }
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


