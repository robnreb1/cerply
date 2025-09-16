/* Minimal DB health: returns 200 JSON; no static imports to avoid toolchain quirks */
export async function registerDbHealth(app: any) {
  app.get('/api/db/health', async (_req: any, reply: any) => {
    reply.header('x-api', 'db-health');
    const db: any = (app as any).db;
    if (!db?.execute) {
      return { ok: false, db: false, note: 'No DB bound in this env' };
    }
    try {
      const r = await db.execute('select 1 as up');
      return { ok: true, db: true, host: (db?.config?.host || 'unknown'), up: r?.[0]?.up === 1 };
    } catch (e: any) {
      reply.code(500);
      return { ok: false, db: true, error: e?.message || 'db-error' };
    }
  });
}


