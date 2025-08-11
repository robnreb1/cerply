
import type { FastifyInstance } from 'fastify';
import { computeECS } from '../utils/ecs.js';

export function registerEvidence(app: FastifyInstance) {
  app.get('/evidence/coverage', async (req) => {
    const totalObligations = 12;
    const evidenced = 9;
    return {
      scopeId: (req.query as any).scopeId || 'demo-scope',
      ecs: computeECS(totalObligations, evidenced),
      totals: { totalObligations, evidenced },
      gaps: ['obl-3', 'obl-7', 'obl-11']
    };
  });
}
