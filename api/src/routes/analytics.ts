/* eslint-disable @typescript-eslint/no-explicit-any */
export async function registerAnalyticsRoutes(app: any) {
  app.post('/api/analytics/event', async (req: any, reply: any) => {
    reply.header('x-api','analytics-event');
    const body = (req.body || {}) as any;
    const type = String(body.type || '');
    const payload = (body.payload ?? {});
    if (!type) return reply.code(400).send({ ok:false, error:'missing type' });

    let dbw = false;
    try {
      const db = (app as any).db;
      if (db?.execute) {
        await db.execute(
          `insert into events(user_id, type, payload) values ($1,$2,$3)`,
          [null, type, payload]
        );
        dbw = true;
      }
    } catch {}
    return { ok:true, db:dbw };
  });

  app.get('/api/analytics/events.csv', async (_req: any, reply: any) => {
    reply.header('x-api','analytics-events-csv');
    reply.header('content-type','text/csv; charset=utf-8');
    let rows:any[] = []; let dbUsed=false;
    try {
      const db = (app as any).db;
      if (db?.execute) {
        rows = await db.execute(`select to_char(ts,'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ts, type, payload from events order by ts desc limit 2000`);
        dbUsed = true;
      }
    } catch {}
    if (!dbUsed) return 'ok,db=false';
    const lines = ['ts,type,payload'];
    for (const r of rows) lines.push(`${r.ts},${JSON.stringify(r.type)},${JSON.stringify(r.payload)}`);
    return lines.join('\n');
  });

  // Pilot metrics (24h window): events, attempts, items, ledger spend
  app.get('/api/analytics/pilot', async (_req: any, reply: any) => {
    reply.header('x-api','analytics-pilot');
    const out:any = { ok:true, db:false, windowHours:24, events:{ total:0, byType:{} }, attempts:0, items:0, ledgerCents:0 };

    try {
      const db = (app as any).db;
      if (!db?.execute) return out;

      const [ev, evTypes, att, it, led] = await Promise.all([
        db.execute(`select count(*)::int as n from events where ts >= now() - interval '24 hours'`),
        db.execute(`select type, count(*)::int as n from events where ts >= now() - interval '24 hours' group by 1 order by 2 desc`),
        db.execute(`select count(*)::int as n from attempts where created_at >= now() - interval '24 hours'`),
        db.execute(`select count(*)::int as n from items where created_at >= now() - interval '24 hours'`),
        db.execute(`select coalesce(sum(cost_cents)::int,0) as c from gen_ledger where ts >= now() - interval '24 hours'`)
      ]);

      out.db = true;
      out.events.total = ev?.[0]?.n || 0;
      for (const r of (evTypes||[])) out.events.byType[r.type] = r.n;
      out.attempts = att?.[0]?.n || 0;
      out.items    = it?.[0]?.n || 0;
      out.ledgerCents = led?.[0]?.c || 0;
    } catch {}
    return out;
  });
}
