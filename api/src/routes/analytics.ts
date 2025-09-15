/* Lightweight analytics POST (DB-aware) */
export async function registerAnalyticsRoutes(app: any) {
  // POST /api/analytics/event  { type, payload? }
  app.post('/api/analytics/event', async (req: any, reply: any) => {
    reply.header('x-api', 'analytics-event');
    const body = (req.body || {}) as { type?: string; payload?: any };
    const type = (body.type || '').trim();
    if (!type) return reply.code(400).send({ ok:false, error:'missing-type' });

    const sess = (req as any)?.cookies?.cerply_session || null;
    const db: any = (app as any).db;

    // lazy-load models to avoid esbuild/tsx quirks on top-level require
    const { events } = require('../db/observability');

    app.log?.info?.({ event:type, payload:body.payload, user: !!sess }, 'analytics.event');

    if (!db?.insert) return { ok:true, db:false };  // DB not bound → still OK

    try {
      await db.insert(events).values({
        userId: null, type, payload: body.payload ?? null,
      });
      return { ok:true, db:true };
    } catch (e:any) {
      return reply.code(500).send({ ok:false, db:true, error: e?.message || 'db-insert-failed' });
    }
  });
}
