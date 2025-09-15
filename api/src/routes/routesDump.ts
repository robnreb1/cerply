/* __routes.json → dumps app.printRoutes() for ops checks (pure CJS) */
/* eslint-disable @typescript-eslint/no-explicit-any */
module.exports.registerRoutesDump = async function registerRoutesDump(app: any) {
  app.get('/__routes.json', async (_req: any, reply: any) => {
    const text = app.printRoutes ? app.printRoutes() : '';
    reply.header('x-api', 'routes-dump');
    return { ok: true, text, hasDbHealth: String(text).includes('/api/db/health') };
  });
};

