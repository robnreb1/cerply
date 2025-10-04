
import type { FastifyInstance } from 'fastify';

export async function registerHealth(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true, note: "prefer /api/health" }));
  app.get('/api/health', async () => ({ ok: true, env: "unknown", planner: { provider: "openai", primary: "gpt-5", fallback: "gpt-4o", enabled: false } }));
}
