import type { FastifyPluginAsync } from 'fastify';

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

const certifiedSecurity: FastifyPluginAsync = async (app) => {
  // Baseline security headers early for Certified routes
  app.addHook('preHandler', async (req: any, reply: any) => {
    const url = String(req.url || '');
    if (!url.startsWith('/api/certified/')) return;

    reply.header('referrer-policy', 'no-referrer');
    reply.header('cross-origin-opener-policy', 'same-origin');
    reply.header('cross-origin-resource-policy', 'same-origin');
  });

  // Final word: ensure CORP is same-origin (overrides any global "same-site")
  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    const raw = (reply as any).raw;
    if (raw?.headersSent || reply.sent) return payload; // double-send guard

    const method = String(req.method || '').toUpperCase();
    const url = String(req.url || '');
    if (!url.startsWith('/api/certified/')) return payload;
    if (method === 'OPTIONS') return payload;

    reply.header('referrer-policy', 'no-referrer');
    reply.header('cross-origin-opener-policy', 'same-origin');
    reply.header('cross-origin-resource-policy', 'same-origin');
    return payload;
  });
};

export default certifiedSecurity;


