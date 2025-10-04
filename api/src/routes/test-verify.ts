import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

// Helper functions for verify contract
function isHex(s: string) { return typeof s === 'string' && /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0 }
function bufFromSig(s: string) { return isHex(s) ? Buffer.from(s, 'hex') : Buffer.from(s, 'base64') }
function stableSort(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stableSort);
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj).sort()) out[k] = stableSort(obj[k]);
    return out;
  }
  return obj;
}
function stableStringify(obj: any) { return JSON.stringify(stableSort(obj)) }

export async function registerTestVerifyRoutes(app: FastifyInstance) {
  console.log('DEBUG: registerTestVerifyRoutes called');
  
  app.get('/api/certified/verify', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    console.log('DEBUG: test verify GET handler called');
    
    // Always return 404 for testing
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
  });

  app.post('/api/certified/verify', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const method = String((req as any).method || '').toUpperCase();
    if (method === 'OPTIONS') return reply.code(204).send();

    // Strict content-type
    const ct = String((req.headers as any)?.['content-type'] || '').toLowerCase();
    if (!ct.includes('application/json')) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Expected content-type: application/json' } });
    }

    const body = (req as any).body;
    if (!body || typeof body !== 'object') {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(400).send({ error: { code: 'BAD_REQUEST' } });
    }

    // Extract fields with multiple possible names
    const artifactId = body.artifactId || body.artifact_id || body.id;
    const artifact = body.artifact;
    const signature = body.signature || body.sig;

    // Case A: Artifact verification by ID only
    if (artifactId && !artifact && !signature) {
      // For now, always return 404 for unknown IDs (simplified for testing)
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
    }

    // Case B: Inline artifact + signature verification
    if (artifact && signature) {
      try {
        const expectedHex = crypto.createHash('sha256').update(stableStringify(artifact)).digest('hex');
        const sigBuf = typeof signature === 'string' ? bufFromSig(signature) : Buffer.from(signature);
        const ok = sigBuf.equals(Buffer.from(expectedHex, 'hex'));

        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        
        if (ok) {
          return reply.code(200).send({ ok: true, sha256: expectedHex });
        } else {
          return reply.code(200).send({ ok: false, reason: 'signature_invalid' });
        }
      } catch (err) {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(200).send({ ok: false, reason: 'signature_invalid' });
      }
    }

    // Case C: Legacy plan lock verification
    if (body.lock) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(200).send({ ok: true });
    }

    // Otherwise: Bad request
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(400).send({ error: { code: 'BAD_REQUEST' } });
  });

  app.post('/api/certified/test-verify', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    console.log('DEBUG: test-verify POST handler called');
    
    // Always return 404 for testing
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
  });
}
