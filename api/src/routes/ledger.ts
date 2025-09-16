/* eslint-disable @typescript-eslint/no-explicit-any */
export async function registerLedgerRoutes(app: any) {
  app.get('/api/ledger/totals', async (req: any, reply: any) => {
    reply.header('x-api', 'ledger-totals');
    const db: any = (app as any).db;
    if (!db?.execute) return { ok: false, db: false, totals: [] };

    const q: any = req.query || {};
    const from = q.from ? new Date(String(q.from)) : null;
    const to   = q.to   ? new Date(String(q.to))   : null;

    let where = '';
    const args: any[] = [];
    if (from) { args.push(from); where += (where ? ' AND ' : '') + `ts >= $${args.length}`; }
    if (to)   { args.push(to);   where += (where ? ' AND ' : '') + `ts <  $${args.length}`; }

    const byModel = await db.execute(
      `select model_used as model, coalesce(sum(cost_cents),0)::int as cents
       from gen_ledger ${where ? 'where ' + where : ''} group by model_used order by model_used`,
      args
    );

    const totalRow = await db.execute(
      `select coalesce(sum(cost_cents),0)::int as cents from gen_ledger ${where ? 'where ' + where : ''}`,
      args
    );
    const total = totalRow?.[0]?.cents ?? 0;

    return { ok: true, db: true, totals: byModel, totalCents: total };
  });

  app.get('/api/ledger/alarm', async (_req: any, reply: any) => {
    reply.header('x-api','ledger-alarm');
    const thresh = Number(process.env.BUDGET_DAILY_CENTS || '');
    const enabled = Number.isFinite(thresh) && thresh > 0;

    let db = false, total = 0;
    try {
      const dbc = (app as any).db;
      if (dbc?.execute) {
        const row = await dbc.execute(
          `select coalesce(sum(cost_cents)::int,0) as c
             from gen_ledger
            where ts >= now() - interval '24 hours'`
        );
        total = (row && row[0] && row[0].c) || 0;
        db = true;
      }
    } catch {}

    const over = enabled ? total > thresh : false;
    if (enabled && over) reply.header('x-alarm','budget-breached-24h');
    return { ok:true, db, enabled, windowHours:24, thresholdCents: enabled?thresh:null, totalCents: total, over };
  });

  app.get('/api/ledger/export.csv', async (_req: any, reply: any) => {
    reply.header('x-api','ledger-export-csv');
    reply.header('content-type','text/csv; charset=utf-8');
    let rows:any[] = []; let dbUsed=false;
    try {
      const db = (app as any).db;
      if (db?.execute) {
        rows = await db.execute(
          `select to_char(ts,'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ts,
                  coalesce(model_used,'unknown') as model_used,
                  coalesce(cost_cents,0)::int as cost_cents,
                  coalesce(item_id,'') as item_id
             from gen_ledger
            order by ts desc
            limit 2000`
        );
        dbUsed = true;
      }
    } catch {}
    if (!dbUsed) return 'ok,db=false';
    const lines = ['ts,model_used,cost_cents,item_id'];
    for (const r of rows) lines.push(`${r.ts},${JSON.stringify(r.model_used)},${r.cost_cents},${JSON.stringify(r.item_id)}`);
    return lines.join('\n');
  });
}
