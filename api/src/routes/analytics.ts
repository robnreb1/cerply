/* Lightweight analytics POST (DB-aware, CJS export, lazy require) */
module.exports.registerAnalyticsRoutes = async function registerAnalyticsRoutes(app: any) {
  app.post('/api/analytics/event', async (req: any, reply: any) => {
    reply.header('x-api', 'analytics-event');
    const body = (req.body || {}) as { type?: string; payload?: any };
    const type = (body.type || '').trim();
    if (!type) return reply.code(400).send({ ok: false, error: 'missing-type' });

    const sess = (req as any)?.cookies?.cerply_session || null;
    const db: any = (app as any).db;

    // lazy-load model to avoid top-level require quirks
    const { events } = require('../db/observability');

    app.log?.info?.({ event: type, user: !!sess }, 'analytics.event');

    if (!db?.insert) return { ok: true, db: false }; // DB not bound → OK

    try {
      await db.insert(events).values({ userId: null, type, payload: body.payload ?? null });
      return { ok: true, db: true };
    } catch (e: any) {
      return reply.code(500).send({ ok: false, db: true, error: e?.message || 'db-insert-failed' });
    }
  });
};
