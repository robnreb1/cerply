import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// ---- Evidence Coverage (stub) ----
type CoverageGap = { id: string; kind: string; detail: string; suggestion: string };
type CoverageSummary = { objectives: number; items: number; covered: number; gaps: number };
type CoverageResp = { scopeId: string; summary: CoverageSummary; gaps: CoverageGap[] };

function handleCoverage(req: any, reply: any) {
  const q = (req.query as any) || {};
  const scopeId = (q.scopeId as string) || 'demo';
  const resp: CoverageResp = {
    scopeId,
    summary: { objectives: 3, items: 12, covered: 7, gaps: 5 },
    gaps: [
      { id: 'g1', kind: 'missing_control', detail: 'No evidence for password rotation', suggestion: 'Capture password policy update confirmations quarterly.' },
      { id: 'g2', kind: 'stale_evidence', detail: 'MFA attestations older than 6 months', suggestion: 'Trigger re-attestation flow for all members.' },
      { id: 'g3', kind: 'insufficient_sample', detail: 'Only 3/10 endpoints show patch status', suggestion: 'Ingest MDM report for all endpoints weekly.' },
      { id: 'g4', kind: 'orphan_objective', detail: 'Objective without traceable evidence node', suggestion: 'Define at least one ECS for objective SEC-3.' },
      { id: 'g5', kind: 'data_quality', detail: 'Some evidence blobs missing timestamp', suggestion: 'Normalize ingest to require ISO-8601 timestamps.' },
    ],
  };
  return reply.send(resp);
}

// Register both canonical and /api alias
app.get('/evidence/coverage', handleCoverage);
app.get('/api/evidence/coverage', handleCoverage);

const port = Number(process.env.PORT ?? 8080);
await app.listen({ host: '0.0.0.0', port });