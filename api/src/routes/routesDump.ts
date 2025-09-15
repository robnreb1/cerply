------------------------------------------------------------------------------
/* __routes.json → dumps app.printRoutes() for ops checks */
export async function registerRoutesDump(app: any) {
  app.get('/__routes.json', async (_req: any, reply: any) => {
    const text = app.printRoutes();
    return { ok:true, text, hasDbHealth: String(text).includes('/api/db/health') };
  });
}
------------------------------------------------------------------------------

