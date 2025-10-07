import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../src/index';

describe('M3 API Surface (preview, generate, score, daily/next, ops/usage)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/preview', () => {
    it('returns 200 with valid content', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/preview',
        headers: { 'content-type': 'application/json' },
        payload: { content: 'Learn about quantum mechanics and basic principles' },
      });
      expect(r.statusCode).toBe(200);
      const j = r.json();
      expect(j.data).toBeDefined();
      expect(j.data.summary).toBeDefined();
      expect(Array.isArray(j.data.proposed_modules)).toBe(true);
      expect(j.data.proposed_modules.length).toBeGreaterThan(0);
      expect(Array.isArray(j.data.clarifying_questions)).toBe(true);
      expect(j.meta).toBeDefined();
    });

    it('returns 400 when content is missing', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/preview',
        headers: { 'content-type': 'application/json' },
        payload: {},
      });
      expect(r.statusCode).toBe(400);
      const j = r.json();
      expect(j.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when content is too long', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/preview',
        headers: { 'content-type': 'application/json' },
        payload: { content: 'x'.repeat(50001) },
      });
      expect(r.statusCode).toBe(400);
      const j = r.json();
      expect(j.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/generate', () => {
    it('returns 200 with schema-valid modules', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/generate',
        headers: { 'content-type': 'application/json' },
        payload: {
          modules: [
            { title: 'Introduction to React', topics: ['components', 'props', 'state'] },
            { title: 'Advanced Patterns', topics: ['hooks', 'context'] },
          ],
        },
      });
      expect(r.statusCode).toBe(200);
      const j = r.json();
      expect(Array.isArray(j.modules)).toBe(true);
      expect(j.modules.length).toBeGreaterThan(0);
      
      // Validate schema compliance
      const mod = j.modules[0];
      expect(mod.id).toBeDefined();
      expect(mod.title).toBeDefined();
      expect(Array.isArray(mod.lessons)).toBe(true);
      expect(Array.isArray(mod.items)).toBe(true);
      
      if (mod.items.length > 0) {
        const item = mod.items[0];
        expect(item.id).toBeDefined();
        expect(item.type).toMatch(/^(mcq|free)$/);
        expect(item.prompt).toBeDefined();
      }
    });

    it('returns 400 when modules array is missing', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/generate',
        headers: { 'content-type': 'application/json' },
        payload: {},
      });
      expect(r.statusCode).toBe(400);
      const j = r.json();
      expect(j.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when modules array is empty', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/generate',
        headers: { 'content-type': 'application/json' },
        payload: { modules: [] },
      });
      expect(r.statusCode).toBe(400);
      const j = r.json();
      expect(j.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/score', () => {
    it('returns 200 with schema-valid score', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/score',
        headers: { 'content-type': 'application/json' },
        payload: {
          item_id: 'item-123',
          user_answer: 'correct answer',
          expected_answer: 'correct answer',
        },
      });
      expect(r.statusCode).toBe(200);
      const j = r.json();
      expect(typeof j.score).toBe('number');
      expect(j.score).toBeGreaterThanOrEqual(0);
      expect(j.score).toBeLessThanOrEqual(1);
      expect(['easy', 'medium', 'hard']).toContain(j.difficulty);
      expect(Array.isArray(j.misconceptions)).toBe(true);
      expect(typeof j.next_review_days).toBe('number');
      expect(j.next_review_days).toBeGreaterThanOrEqual(0);
    });

    it('returns lower score for incorrect answer', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/score',
        headers: { 'content-type': 'application/json' },
        payload: {
          item_id: 'item-123',
          user_answer: 'wrong answer',
          expected_answer: 'correct answer',
        },
      });
      expect(r.statusCode).toBe(200);
      const j = r.json();
      expect(j.score).toBeLessThan(0.8);
    });

    it('returns 400 when item_id is missing', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/score',
        headers: { 'content-type': 'application/json' },
        payload: { user_answer: 'test' },
      });
      expect(r.statusCode).toBe(400);
      const j = r.json();
      expect(j.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/daily/next', () => {
    it('returns 200 with prioritized queue', async () => {
      const r = await app.inject({
        method: 'GET',
        url: '/api/daily/next',
      });
      expect(r.statusCode).toBe(200);
      const j = r.json();
      expect(j.data).toBeDefined();
      expect(Array.isArray(j.data.queue)).toBe(true);
      expect(j.data.queue.length).toBeGreaterThan(0);
      expect(j.meta).toBeDefined();
      expect(j.meta.adaptation_reason).toBeDefined();
      
      const item = j.data.queue[0];
      expect(item.item_id).toBeDefined();
      expect(typeof item.priority).toBe('number');
      expect(item.reason).toBeDefined();
    });
  });

  describe('GET /api/ops/usage/daily', () => {
    it('returns 200 with usage aggregates', async () => {
      // First make some requests to generate usage data
      await app.inject({
        method: 'POST',
        url: '/api/preview',
        headers: { 'content-type': 'application/json' },
        payload: { content: 'test content' },
      });

      const r = await app.inject({
        method: 'GET',
        url: '/api/ops/usage/daily',
      });
      expect(r.statusCode).toBe(200);
      const j = r.json();
      expect(j.data).toBeDefined();
      expect(j.data.generated_at).toBeDefined();
      expect(j.data.today).toBeDefined();
      expect(j.data.yesterday).toBeDefined();
      expect(Array.isArray(j.data.routes)).toBe(true);
      expect(j.meta).toBeDefined();
      expect(Array.isArray(j.meta.cost_graph)).toBe(true);
    });

    it('shows token usage in aggregates', async () => {
      // Generate some usage
      await app.inject({
        method: 'POST',
        url: '/api/generate',
        headers: { 'content-type': 'application/json' },
        payload: { modules: [{ title: 'Test' }] },
      });

      const r = await app.inject({
        method: 'GET',
        url: '/api/ops/usage/daily',
      });
      expect(r.statusCode).toBe(200);
      const j = r.json();
      
      if (j.data.routes && j.data.routes.length > 0) {
        const agg = j.data.routes[0];
        expect(agg.route).toBeDefined();
        expect(typeof agg.requests).toBe('number');
        expect(typeof agg.total_tokens_in).toBe('number');
        expect(typeof agg.total_tokens_out).toBe('number');
        expect(typeof agg.total_cost).toBe('number');
        expect(Array.isArray(agg.models)).toBe(true);
      }
    });
  });

  describe('Method validation', () => {
    it('returns 405 for wrong method on /api/preview', async () => {
      const r = await app.inject({
        method: 'GET',
        url: '/api/preview',
      });
      // May be 404 or 405 depending on route registration
      expect([404, 405]).toContain(r.statusCode);
    });

    it('returns 405 for wrong method on /api/generate', async () => {
      const r = await app.inject({
        method: 'GET',
        url: '/api/generate',
      });
      expect([404, 405]).toContain(r.statusCode);
    });
  });
});
