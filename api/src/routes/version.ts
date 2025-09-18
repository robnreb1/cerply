/* eslint-disable @typescript-eslint/no-explicit-any */
export async function registerVersionRoutes(app: any) {
  app.get('/api/version', async (_req: any, reply: any) => {
    const image = {
      tag: process.env.IMAGE_TAG || '',
      revision: (process.env.IMAGE_REVISION || process.env.IMAGE_SHA || ''),
      created: process.env.IMAGE_CREATED || '',
    };
    const data = {
      ok: true,
      image,
      node: process.version,
      now: new Date().toISOString(),
    };
    reply.header('x-api', 'version');
    if (image.tag !== undefined) reply.header('x-image-tag', String(image.tag));
    if (image.revision !== undefined) reply.header('x-image-revision', String(image.revision));
    if (image.created !== undefined) reply.header('x-image-created', String(image.created));
    return data;
  });
}


