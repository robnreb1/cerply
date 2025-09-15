/* CSV exports (DB-aware, pure CJS) */
/* eslint-disable @typescript-eslint/no-explicit-any */
function asCsv(rows:any[], cols:string[]) {
  const esc = (v:any) => {
    const s = v==null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  return [cols.join(','), ...rows.map(r=> cols.map(c=> esc(r[c])).join(','))].join('\n') + '\n';
}

module.exports.registerExportRoutes = async function registerExportRoutes(app: any) {
  // Events CSV
  app.get('/api/analytics/events.csv', async (req:any, reply:any) => {
    const db: any = (app as any).db;
    if (!db?.execute) return reply.code(200).send('ok,db=false\n');
    const q:any = req.query || {};
    const from = q.from ? new Date(String(q.from)) : new Date(Date.now()-7*86400e3);
    const to   = q.to   ? new Date(String(q.to))   : new Date();
    const rows = await db.execute(
      `select ts, type, to_jsonb(payload) as payload from events where ts >= $1 and ts < $2 order by ts desc`,
      [from, to]
    );
    reply.header('content-type','text/csv; charset=utf-8');
    return asCsv(rows, ['ts','type','payload']);
  });

  // Ledger CSV
  app.get('/api/ledger/export.csv', async (req:any, reply:any) => {
    const db: any = (app as any).db;
    if (!db?.execute) return reply.code(200).send('ok,db=false\n');
    const q:any = req.query || {};
    const from = q.from ? new Date(String(q.from)) : new Date(Date.now()-7*86400e3);
    const to   = q.to   ? new Date(String(q.to))   : new Date();
    const rows = await db.execute(
      `select created_at, model_used, cost_cents, item_id from gen_ledger where created_at >= $1 and created_at < $2 order by created_at desc`,
      [from, to]
    );
    reply.header('content-type','text/csv; charset=utf-8');
    return asCsv(rows, ['created_at','model_used','cost_cents','item_id']);
  });
};


