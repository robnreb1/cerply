/* /api/analytics/pilot → last 24h summary (DB-aware, pure CJS) */
/* eslint-disable @typescript-eslint/no-explicit-any */
module.exports.registerAnalyticsPilot = async function registerAnalyticsPilot(app: any) {
  app.get('/api/analytics/pilot', async (_req: any, reply: any) => {
    reply.header('x-api', 'analytics-pilot');

    const db: any = (app as any).db;
    if (!db?.execute) {
      return { ok: true, db: false, windowHours: 24, events: {}, ledger: { totalCents: 0, byModel: [] } };
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000);

    const eventsByType = await db.execute(
      `select type, count(*)::int as count
         from events
        where ts >= $1
        group by type
        order by type`,
      [since]
    );

    const byModel = await db.execute(
      `select model_used as model, coalesce(sum(cost_cents),0)::int as cents
         from gen_ledger
        where ts >= $1
        group by model_used
        order by model_used`,
      [since]
    );

    const total = await db.execute(
      `select coalesce(sum(cost_cents),0)::int as cents
         from gen_ledger
        where ts >= $1`,
      [since]
    ).then((r:any)=> r[0]?.cents ?? 0);

    const ev:any = {};
    for (const row of (eventsByType || [])) ev[row.type] = row.count;

    return { ok: true, db: true, windowHours: 24, events: ev, ledger: { totalCents: total, byModel } };
  });
};

