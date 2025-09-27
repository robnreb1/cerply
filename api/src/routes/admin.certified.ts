import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { SourceCreateReq, ItemIngestReq, ItemQuery, ItemStatus } from '../schemas/admin.certified';
import { append, upsertIndex, makeId, sha256Hex } from '../store/adminCertifiedStore';

function enabled(): boolean {
  return String(process.env.ADMIN_PREVIEW || 'false').toLowerCase() === 'true';
}

function tokenOk(headers: Record<string, any>): boolean {
  const expected = String(process.env.ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const got = String((headers['x-admin-token'] ?? headers['X-Admin-Token'] ?? '')).trim();
  // Bearer-style is allowed; accept raw equality too for local dev
  const bearer = got.toLowerCase().startsWith('bearer ')
    ? got.slice(7).trim()
    : got;
  return bearer.length > 0 && bearer === expected;
}

function sizeWithinLimit(req: any): boolean {
  const limit = Number(process.env.ADMIN_MAX_REQUEST_BYTES || 32 * 1024);
  const hdrLen = Number((req.headers?.['content-length'] ?? '0')) || 0;
  let calc = 0;
  try { calc = Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8'); } catch {}
  const size = Math.max(hdrLen, calc);
  return size <= limit;
}

function applyCors(reply: FastifyReply) {
  reply.header('access-control-allow-origin', '*');
  try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
}

export async function registerAdminCertifiedRoutes(app: FastifyInstance) {
  if (!enabled()) return;

  // Ensure rate-limit plugin is present (non-global) for per-route configs (satisfies static checks)
  try {
    const rl = (await import('@fastify/rate-limit')).default as any;
    // Safe to re-register; no-op if already registered globally elsewhere
    await app.register(rl, { global: false } as any);
  } catch {}

  // Preflight: OPTIONS for all admin endpoints
  app.addHook('onRequest', async (req: any, reply: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      const url = String(req?.url || '');
      if (method === 'OPTIONS' && url.startsWith('/api/admin/certified/')) {
        return reply
          .header('access-control-allow-origin', '*')
          .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
          .header('access-control-allow-headers', 'content-type, x-admin-token, authorization')
          .code(204)
          .send();
      }
    } catch {}
  });

  // Security headers baseline for admin responses
  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    try {
      const url = String(req?.url || '');
      if (!url.startsWith('/api/admin/certified/')) return payload;
      applyCors(reply);
      reply.header('cross-origin-opener-policy', 'same-origin');
      reply.header('cross-origin-resource-policy', 'same-site');
      reply.header('referrer-policy', 'no-referrer');
      reply.header('x-content-type-options', 'nosniff');
    } catch {}
    return payload;
  });

  function authGuard(req: FastifyRequest, reply: FastifyReply): boolean {
    if (!tokenOk(req.headers as any)) {
      applyCors(reply);
      if (!(reply as any).raw?.headersSent) {
        reply.header('www-authenticate', 'Bearer');
        reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'invalid admin token' } });
      }
      return false;
    }
    if (!sizeWithinLimit(req)) {
      applyCors(reply);
      if (!(reply as any).raw?.headersSent) {
        reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'request too large' } });
      }
      return false;
    }
    return true;
  }

  // POST /sources
  app.post('/api/admin/certified/sources', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!authGuard(req, reply)) return;
    const parsed = SourceCreateReq.safeParse((req as any).body);
    if (!parsed.success) {
      applyCors(reply);
      // Avoid writing headers twice when Fastify already started sending
      if ((reply as any).raw?.headersSent) return;
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
    }
    const id = makeId('src');
    const row = { id, ...parsed.data, createdAt: new Date().toISOString() };
    append({ type: 'source', data: row });
    applyCors(reply);
    return reply.send({ source_id: id });
  });

  // GET /sources
  app.get('/api/admin/certified/sources', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!authGuard(req, reply)) return;
    const idx = upsertIndex<any>('source');
    const list = Array.from(idx.values());
    applyCors(reply);
    return reply.send({ sources: list });
  });

  async function probeUrlHead(url: string): Promise<{ sha256: string; mime: string; provenance: any }> {
    // Minimal deterministic probe: fetch HEAD, fallback to GET range(0-1024)
    let mime = 'application/octet-stream';
    let bytes: Buffer | null = null;
    let etag: string | undefined;
    let lastModified: string | undefined;
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) {
        mime = r.headers.get('content-type') || mime;
        etag = r.headers.get('etag') || undefined;
        lastModified = r.headers.get('last-modified') || undefined;
      }
    } catch {}
    if (!etag) {
      try {
        const r2 = await fetch(url, { headers: { Range: 'bytes=0-1023' } });
        if (r2.ok) {
          mime = r2.headers.get('content-type') || mime;
          const arr = new Uint8Array(await r2.arrayBuffer());
          bytes = Buffer.from(arr);
        }
      } catch {}
    }
    const sha = sha256Hex(bytes ?? Buffer.from(url));
    return { sha256: sha, mime, provenance: { method: bytes ? 'range' : 'head', bytesProbed: bytes?.length || 0, etag, lastModified } };
  }

  // POST /items/ingest
  app.post('/api/admin/certified/items/ingest', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!authGuard(req, reply)) return;
    const parsed = ItemIngestReq.safeParse((req as any).body);
    if (!parsed.success) {
      applyCors(reply);
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
    }
    const { title, url, tags } = parsed.data;
    const id = makeId('itm');
    const { sha256, mime, provenance } = await probeUrlHead(url);
    const now = new Date().toISOString();
    const row = { id, title, url, tags, sha256, mime, status: 'pending' as const, createdAt: now, updatedAt: now, provenance };
    append({ type: 'item', data: row });
    applyCors(reply);
    return reply.send({ item_id: id });
  });

  // GET /items
  app.get('/api/admin/certified/items', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!authGuard(req, reply)) return;
    const q = ItemQuery.safeParse((req as any).query);
    if (!q.success) {
      applyCors(reply);
      if ((reply as any).raw?.headersSent) return;
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: q.error.message } });
    }
    const idx = upsertIndex<any>('item');
    let list = Array.from(idx.values());
    if (q.data.status) list = list.filter(r => r.status === q.data.status);
    applyCors(reply);
    return reply.send({ items: list });
  });

  // GET /items/:id
  app.get('/api/admin/certified/items/:id', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!authGuard(req, reply)) return;
    const { id } = (req as any).params as { id: string };
    const idx = upsertIndex<any>('item');
    const row = idx.get(id);
    if (!row) {
      applyCors(reply);
      if ((reply as any).raw?.headersSent) return;
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'item not found' } });
    }
    applyCors(reply);
    return reply.send(row);
  });

  // POST /items/:id/approve
  app.post('/api/admin/certified/items/:id/approve', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!authGuard(req, reply)) return;
    const { id } = (req as any).params as { id: string };
    const idx = upsertIndex<any>('item');
    const row = idx.get(id);
    if (!row) {
      applyCors(reply);
      if ((reply as any).raw?.headersSent) return;
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'item not found' } });
    }
    const next = { ...row, status: 'approved' as const, updatedAt: new Date().toISOString() };
    append({ type: 'item', data: next });
    append({ type: 'audit', data: { request_id: (req as any).id, item_id: id, decision: 'approve', at: new Date().toISOString() } });
    applyCors(reply);
    return reply.send({ ok: true, id, status: 'approved' });
  });

  // POST /items/:id/reject
  app.post('/api/admin/certified/items/:id/reject', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!authGuard(req, reply)) return;
    const { id } = (req as any).params as { id: string };
    const idx = upsertIndex<any>('item');
    const row = idx.get(id);
    if (!row) {
      applyCors(reply);
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'item not found' } });
    }
    const next = { ...row, status: 'rejected' as const, updatedAt: new Date().toISOString() };
    append({ type: 'item', data: next });
    append({ type: 'audit', data: { request_id: (req as any).id, item_id: id, decision: 'reject', at: new Date().toISOString() } });
    applyCors(reply);
    return reply.send({ ok: true, id, status: 'rejected' });
  });
}

export default registerAdminCertifiedRoutes;


