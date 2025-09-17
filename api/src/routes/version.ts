/* eslint-disable @typescript-eslint/no-explicit-any */
export async function registerVersionRoutes(app: any) {
  app.get('/api/version', async (_req: any, reply: any) => {
    const image = {
      tag: process.env.IMAGE_TAG ?? 'unset',
      revision: (process.env.IMAGE_REVISION ?? process.env.IMAGE_SHA) ?? 'unset',
      created: process.env.IMAGE_CREATED ?? 'unset',
    };
    const data = {
      ok: true,
      image,
      node: process.version,
      now: new Date().toISOString(),
    };
    reply.header('x-api', 'version');
    if (image.tag) reply.header('x-image-tag', String(image.tag));
    if (image.revision) reply.header('x-image-revision', String(image.revision));
    if (image.created) reply.header('x-image-created', String(image.created));
    return data;
  });
}


