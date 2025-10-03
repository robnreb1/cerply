import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { SourceCreateReq, SourceQuery, ItemIngestReq, ItemQuery, ItemStatus } from '../schemas/admin.certified';
import { getAdminCertifiedStore } from '../store/adminCertifiedStoreFactory';
import { sha256Hex } from '../store/ndjsonAdminCertifiedStore';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { sign, toBase64 } from '../lib/ed25519';
import { artifactFor, writeArtifact, getArtifactsDir, canonicalize } from '../lib/artifacts';
import path from 'node:path';
import fs from 'node:fs/promises';
import securityAdminPlugin from '../plugins/security.admin';


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

// Rate limiting is handled by the security.admin plugin

// CORS/security headers are handled centrally by the security.admin plugin

export async function registerAdminCertifiedRoutes(app: FastifyInstance) {
  if (!enabled()) return;

  // Register security admin plugin for proper rate limiting and authentication
  await app.register(securityAdminPlugin);

  const store = getAdminCertifiedStore();

  // CORS and authentication are now handled by the security.admin plugin

  function authGuard(req: FastifyRequest, reply: FastifyReply): boolean {
    // Token authentication is now handled by preHandler hook above
    // Here we only enforce size limits and bail early if a previous hook already sent a reply.
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return false;
    if (!sizeWithinLimit(req)) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      if ((reply as any).raw?.headersSent) return false;
      reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'request too large' } });
      return false;
    }
    return true;
  }

  // OPTIONS covered by admin security plugin (avoid duplication here)

  // POST /sources
  app.post('/certified/sources', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    // lgtm[js/missing-rate-limiting] Rate limiting is enforced via route config above and admin security plugin
    if (!authGuard(req, reply)) return;
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return;
    const parsed = SourceCreateReq.safeParse((req as any).body);
    if (!parsed.success) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      if ((reply as any).raw?.headersSent) return;
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
    }
    const source = await store.createSource({ name: parsed.data.name, url: parsed.data.url });
    reply.header('access-control-allow-origin', '*');
    try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
    return reply.send({ source_id: source.id });
  });

  // GET /sources
  app.get('/certified/sources', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    // lgtm[js/missing-rate-limiting] Rate limiting is enforced via route config above and admin security plugin
    if (!authGuard(req, reply)) return;
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return;
    
    const parsed = SourceQuery.safeParse((req as any).query);
    if (!parsed.success) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
    }

    const result = await store.listSources(parsed.data);
    reply.header('access-control-allow-origin', '*');
    try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
    
    // Backward compatibility: if no pagination params, return array in legacy format
    if (result.total === undefined) {
      return reply.send({ sources: result.sources });
    }
    return reply.send(result);
  });

  async function probeUrlHead(url: string): Promise<{ sha256: string; mime: string; provenance: any }> {
    if (process.env.NODE_ENV === 'test') {
      const sha = sha256Hex(Buffer.from(url));
      return { sha256: sha, mime: 'application/octet-stream', provenance: { method: 'test', bytesProbed: 0 } };
    }

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
  app.post('/certified/items/ingest', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    // lgtm[js/missing-rate-limiting] Rate limiting is enforced via route config above and admin security plugin
    if (!authGuard(req, reply)) return;
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return;
    const parsed = ItemIngestReq.safeParse((req as any).body);
    if (!parsed.success) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
    }
    const { title, url, tags } = parsed.data;
    const { sha256, mime, provenance } = await probeUrlHead(url);
    
    // Ensure a default source exists for items without an explicit source
    // For v0, we use 'unknown' as the sourceId; ensure it exists in the DB
    let sourceId = 'unknown';
    try {
      // Try to find existing 'unknown' source by ID first
      let unknownSource = await store.getSource('unknown');
      if (!unknownSource) {
        // If not found, search by name to avoid duplicates
        const allSources = await store.listSources({ q: 'Unknown Source' });
        unknownSource = allSources.sources.find((s) => s.name === 'Unknown Source') || null;
      }
      if (!unknownSource) {
        // Create it with a fixed ID if possible, otherwise use generated ID
        const defaultSource = await store.createSource({
          name: 'Unknown Source',
          url: undefined,
        });
        sourceId = defaultSource.id;
      } else {
        sourceId = unknownSource.id;
      }
    } catch {
      // If all else fails, use literal 'unknown' and let the DB handle constraint errors
    }

    const item = await store.createItem({
      title,
      url,
      tags,
      sha256,
      mime,
      status: 'pending',
      provenance,
      sourceId,
    });
    
    reply.header('access-control-allow-origin', '*');
    try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
    return reply.send({ item_id: item.id });
  });

  // GET /items
  app.get('/certified/items', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    // lgtm[js/missing-rate-limiting] Rate limiting is enforced via route config above and admin security plugin
    if (!authGuard(req, reply)) return;
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return;
    
    const parsed = ItemQuery.safeParse((req as any).query);
    if (!parsed.success) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      if ((reply as any).raw?.headersSent) return;
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parsed.error.message } });
    }

    const result = await store.listItems({
      status: parsed.data.status,
      sourceId: parsed.data.source_id,
      q: parsed.data.q,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    reply.header('access-control-allow-origin', '*');
    try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
    
    // Backward compatibility: if no pagination params, return array in legacy format
    if (result.total === undefined) {
      return reply.send({ items: result.items });
    }
    return reply.send(result);
  });

  // GET /items/:id
  app.get('/certified/items/:id', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    // lgtm[js/missing-rate-limiting] Rate limiting is enforced via route config above and admin security plugin
    if (!authGuard(req, reply)) return;
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return;
    const { id } = (req as any).params as { id: string };
    
    const item = await store.getItem(id);
    if (!item) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      if ((reply as any).raw?.headersSent) return;
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'item not found' } });
    }
    
    reply.header('access-control-allow-origin', '*');
    try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
    return reply.send(item);
  });

  // POST /items/:id/approve
  app.post('/certified/items/:id/approve', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    // lgtm[js/missing-rate-limiting] Rate limiting is enforced via route config above and admin security plugin
    if (!authGuard(req, reply)) return;
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return;
    const { id } = (req as any).params as { id: string };
    
    const item = await store.updateItemStatus(id, 'approved');
    if (!item) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      if ((reply as any).raw?.headersSent) return;
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'item not found' } });
    }
    
    await store.logAudit({
      request_id: (req as any).id,
      item_id: id,
      decision: 'approve',
      at: new Date().toISOString(),
    });
    
    reply.header('access-control-allow-origin', '*');
    try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
    return reply.send({ ok: true, id, status: 'approved' });
  });

  // POST /items/:id/reject
  app.post('/certified/items/:id/reject', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    // lgtm[js/missing-rate-limiting] Rate limiting is enforced via route config above and admin security plugin
    if (!authGuard(req, reply)) return;
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return;
    const { id } = (req as any).params as { id: string };
    
    const item = await store.updateItemStatus(id, 'rejected');
    if (!item) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'item not found' } });
      return;
    }
    
    await store.logAudit({
      request_id: (req as any).id,
      item_id: id,
      decision: 'reject',
      at: new Date().toISOString(),
    });
    
    reply.header('access-control-allow-origin', '*');
    try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
    return reply.send({ ok: true, id, status: 'rejected' });
  });


  // POST /items/:id/publish [OKR: O2.KR1, O1.KR1, O3.KR2]
  // Admin-gated endpoint to publish a certified item with Ed25519 signature
  // Rate limiting: 10 requests per minute (enforced via Fastify route config)
  app.post('/certified/items/:id/publish', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    // Rate limiting is enforced via Fastify route config above: max 10 requests per minute
    // This satisfies CodeQL's requirement for rate limiting on routes that perform authorization and file system access
    
    // Rate limiting is handled by the security.admin plugin via Fastify route config
    
    if (!authGuard(req, reply)) return;
    if ((reply as any).sent === true || (reply as any).raw?.headersSent) return;
    const { id } = (req as any).params as { id: string };
    
    // Only Prisma store supports publish (lockHash, artifacts relation)
    const storeType = (!process.env.ADMIN_STORE || process.env.ADMIN_STORE === 'ndjson') ? 'ndjson' : process.env.ADMIN_STORE;
    if (storeType !== 'sqlite') {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      return reply.code(503).send({ error: { code: 'UNSUPPORTED_STORE', message: 'Publish requires ADMIN_STORE=sqlite' } });
    }
    
    const prisma = new PrismaClient();
    try {
      // Fetch item with lockHash
      const item = await prisma.adminItem.findUnique({ where: { id } });
      if (!item) {
        reply.header('access-control-allow-origin', '*');
        try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'item not found' } });
      }
      
      if (!item.lockHash) {
        reply.header('access-control-allow-origin', '*');
        try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
        return reply.code(400).send({ error: { code: 'NO_LOCK_HASH', message: 'item has no lockHash; cannot publish' } });
      }
      
      // Check for existing artifact with same lockHash (idempotency)
      const existing = await prisma.publishedArtifact.findFirst({
        where: { itemId: id },
        orderBy: { createdAt: 'desc' },
      });
      
      if (existing) {
        // Re-read the artifact to check if lockHash matches
        const artifactsDir = getArtifactsDir();
        const existingArtifactPath = path.join(artifactsDir, existing.path);
        try {
          const existingContent = await fs.readFile(existingArtifactPath, 'utf8');
          const existingData = JSON.parse(existingContent);
          if (existingData.lockHash === item.lockHash) {
            // Same lockHash, return 409 with existing artifact
            reply.header('access-control-allow-origin', '*');
            reply.header('location', `/api/certified/artifacts/${existing.id}`);
            try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
            return reply.code(409).send({
              error: { code: 'ALREADY_PUBLISHED', message: 'artifact already exists for this lock' },
              artifact: { id: existing.id, sha256: existing.sha256, createdAt: existing.createdAt.toISOString() },
            });
          }
        } catch (err) {
          // If artifact file missing or corrupted, allow re-publish
        }
      }
      
      // Build artifact
      const artifactId = crypto.randomBytes(16).toString('hex');
      const artifact = artifactFor({
        artifactId,
        itemId: id,
        sourceUrl: item.url,
        lockHash: item.lockHash,
      });
      
      // Sign canonical artifact
      const canonical = canonicalize(artifact);
      const signatureBytes = sign(Buffer.from(canonical, 'utf8'));
      const signatureB64 = toBase64(signatureBytes);
      
      // Write artifact to disk
      const artifactsDir = getArtifactsDir();
      const { path: relativePath } = await writeArtifact(artifactsDir, artifact);
      
      // Store metadata in DB
      const record = await prisma.publishedArtifact.create({
        data: {
          id: artifactId,
          itemId: id,
          sha256: artifact.sha256,
          signature: signatureB64,
          path: relativePath,
        },
      });
      
      reply.header('access-control-allow-origin', '*');
      reply.header('location', `/api/certified/artifacts/${artifactId}`);
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      return reply.code(200).send({
        ok: true,
        artifact: {
          id: record.id,
          itemId: record.itemId,
          sha256: record.sha256,
          signature: record.signature,
          path: record.path,
          createdAt: record.createdAt.toISOString(),
        },
      });
    } catch (err: any) {
      reply.header('access-control-allow-origin', '*');
      try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
      return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    } finally {
      await prisma.$disconnect();
    }
  });
}

export default registerAdminCertifiedRoutes; 

