/* eslint-disable @typescript-eslint/no-explicit-any */
export async function registerExportRoutes(app: any) {
  app.get('/api/exports', async (_req: any, reply: any) => {
    reply.header('x-api','exports-index');
    return { ok:true, routes:['/api/analytics/events.csv','/api/ledger/export.csv'] };
  });
}
