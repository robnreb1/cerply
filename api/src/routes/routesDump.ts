/* __routes.json → dumps routes and verifies presence of db-health (pure CJS) */
/* eslint-disable @typescript-eslint/no-explicit-any */
module.exports.registerRoutesDump = async function registerRoutesDump(app: any) {
  app.get('/__routes.json', async (_req: any, reply: any) => {
    const text = app.printRoutes ? app.printRoutes() : '';
    const hasDbHealth = typeof app.hasRoute === 'function'
      ? !!app.hasRoute({ method: 'GET', url: '/api/db/health' })
      : String(text).includes('/api/db/health');
    reply.header('x-api', 'routes-dump');
    return { ok: true, text, hasDbHealth };
  });
};

