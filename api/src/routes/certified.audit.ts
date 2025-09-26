import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export type CertifiedAuditLine = {
  ts: string;
  request_id?: string;
  action: 'plan' | 'verify';
  engines?: string[];
  lock_algo?: string;
  lock_hash_prefix?: string;
  citations_count?: number;
  ok?: boolean;
};

const RING: CertifiedAuditLine[] = [];

function pushLine(line: CertifiedAuditLine) {
  const max = Math.max(100, parseInt(process.env.MAX_AUDIT_BUFFER || '1000', 10));
  RING.push(line);
  if (RING.length > max) RING.shift();
}

export function emitAudit(line: CertifiedAuditLine) {
  try { pushLine({ ...line, ts: new Date().toISOString() }); } catch {}
}

export async function registerCertifiedAuditPreview(app: FastifyInstance) {
  app.get('/api/certified/_audit_preview', async (req: FastifyRequest, reply: FastifyReply) => {
    if (String(process.env.FF_CERTIFIED_AUDIT_PREVIEW || 'false').toLowerCase() !== 'true') {
      return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'FF_CERTIFIED_AUDIT_PREVIEW disabled' } });
    }
    const q = (req as any).query as { limit?: string };
    const limit = Math.max(1, Math.min(1000, parseInt(q?.limit || '100', 10)));
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(200).send({ lines: RING.slice(-limit).reverse() });
  });
}
