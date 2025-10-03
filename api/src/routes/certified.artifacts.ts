/**
 * Public Certified Artifacts routes
 * [OKR: O1.KR2, O3.KR1] — CDN-ready artifact delivery with proper headers
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { readArtifact, getArtifactsDir, canonicalize, sha256Hex } from '../lib/artifacts';
import { fromBase64, verify as verifySignature } from '../lib/ed25519';

function setPublicHeaders(reply: FastifyReply) {
  reply.header('access-control-allow-origin', '*');
  try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
  reply.header('referrer-policy', 'no-referrer');
  reply.header('x-content-type-options', 'nosniff');
}

export async function registerCertifiedArtifactsRoutes(app: FastifyInstance) {
  // GET /api/certified/artifacts/:artifactId — JSON artifact [OKR: O1.KR2]
  app.get('/api/certified/artifacts/:artifactId', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const prisma = new PrismaClient();
    try {
      const { artifactId } = (req as any).params as { artifactId: string };
      const cleanId = artifactId.replace(/\.json$/, '');

      const record = await prisma.publishedArtifact.findUnique({ where: { id: cleanId } });
      if (!record) {
        setPublicHeaders(reply);
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'artifact not found' } });
      }

      const artifact = await readArtifact(getArtifactsDir(), cleanId);
      if (!artifact) {
        setPublicHeaders(reply);
        return reply.code(404).send({ error: { code: 'FILE_NOT_FOUND', message: 'artifact file not found on disk' } });
      }

      setPublicHeaders(reply);
      reply.header('etag', `W/"${artifact.sha256}"`);
      reply.header('cache-control', 'public, max-age=300');
      reply.header('content-type', 'application/json');
      return reply.code(200).send(artifact);
    } catch (err: any) {
      setPublicHeaders(reply);
      return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  });

  // GET /api/certified/artifacts/:artifactId.sig — Binary signature [OKR: O1.KR2]
  app.get('/api/certified/artifacts/:artifactId.sig', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const prisma = new PrismaClient();
    try {
      const { artifactId } = (req as any).params as { artifactId: string };
      const record = await prisma.publishedArtifact.findUnique({ where: { id: artifactId }, select: { signature: true } });
      if (!record) {
        setPublicHeaders(reply);
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'artifact not found' } });
      }

      setPublicHeaders(reply);
      reply.header('cache-control', 'public, max-age=300');
      reply.header('content-type', 'application/octet-stream');
      return reply.code(200).send(fromBase64(record.signature));
    } catch (err: any) {
      setPublicHeaders(reply);
      return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  });

}

export default registerCertifiedArtifactsRoutes;

