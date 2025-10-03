import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';

const toBuffer = (p: any): Buffer => {
  if (Buffer.isBuffer(p)) return p;
  if (typeof p === 'string') return Buffer.from(p);
  try { return Buffer.from(JSON.stringify(p)); } catch { return Buffer.from(String(p ?? '')); }
};

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onSend', async (request, reply, payload) => {
    const url = request.raw.url || request.url || '';
    const status = reply.statusCode;

    // --- Public artifact responses ---
    if (/^\/api\/certified\/artifacts\/[^/]+(?:\.sig)?$/.test(url)) {
      if (!reply.hasHeader('Cache-Control')) {
        reply.header('Cache-Control', 'public, max-age=300, must-revalidate');
      }
      // For JSON (non-.sig) ensure ETag and permissive CORS
      if (!url.endsWith('.sig') && status === 200) {
        if (!reply.hasHeader('ETag')) {
          const buf = toBuffer(payload);
          const sha = crypto.createHash('sha256').update(buf).digest('hex');
          reply.header('ETag', `"${sha}"`);
        }
        if (!reply.hasHeader('access-control-allow-origin')) reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
      }
      return payload;
    }

    // --- Verify endpoint responses ---
    if (url === '/api/certified/verify') {
      // 404 unknown => keep 404 but normalize error shape
      if (status === 404) {
        try {
          const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
          if (parsed?.error?.code) return payload;
        } catch {}
        return JSON.stringify({ error: { code: 'NOT_FOUND' } });
      }

      // Other errors => map to 200 { ok:false, reason }
      if (status >= 400) {
        reply.code(200);
        return JSON.stringify({ ok: false, reason: 'signature_invalid' });
      }

      // Success => ensure ok:true and sha256 when inline artifact is present
      try {
        const obj = typeof payload === 'string' ? JSON.parse(payload) : (payload ?? {});
        if (obj && obj.ok === true && obj.sha256 == null) {
          const body: any = (request as any).body;
          if (body?.artifact) {
            const buf = toBuffer(JSON.stringify(body.artifact));
            const sha = crypto.createHash('sha256').update(buf).digest('hex');
            obj.sha256 = sha;
          }
        }
        if (!reply.hasHeader('access-control-allow-origin')) reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return JSON.stringify(obj);
      } catch {
        return payload;
      }
    }

    return payload;
  });
};

export default plugin;