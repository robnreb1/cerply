/* /api/version — returns image/tag/sha and sets headers (CJS for tsx runtime) */
/* eslint-disable @typescript-eslint/no-explicit-any */
module.exports.registerVersionRoutes = async function registerVersionRoutes(app: any) {
  app.get('/api/version', async (_req: any, reply: any) => {
    const data = {
      ok: true,
      version: require('../../package.json').version,
      image: {
        tag: process.env.IMAGE_TAG ?? 'unknown',
        sha: process.env.IMAGE_SHA ?? 'unknown',
        created: process.env.IMAGE_CREATED ?? 'unknown',
      },
      node: process.version,
      now: new Date().toISOString(),
    };
    reply.header('x-api', 'version');
    if (data.image.sha)     reply.header('x-image-revision', String(data.image.sha));
    if (data.image.tag)     reply.header('x-image-tag', String(data.image.tag));
    if (data.image.created) reply.header('x-image-created', String(data.image.created));
    return data;
  });
};


