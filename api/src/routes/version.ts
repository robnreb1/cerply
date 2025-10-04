/* eslint-disable @typescript-eslint/no-explicit-any */
export async function registerVersionRoutes(app: any) {
  app.get('/api/version', async (_req: any, reply: any) => {
    // Debug: log all IMAGE_* and GIT_* environment variables
    const envDebug = {
      IMAGE_TAG: process.env.IMAGE_TAG,
      IMAGE_REVISION: process.env.IMAGE_REVISION,
      IMAGE_CREATED: process.env.IMAGE_CREATED,
      GIT_SHA: process.env.GIT_SHA,
      IMAGE_SHA: process.env.IMAGE_SHA,
    };
    console.log('Version endpoint debug - env vars:', envDebug);
    
    const image = {
      tag: process.env.IMAGE_TAG || '',
      revision: (process.env.IMAGE_REVISION || process.env.GIT_SHA || process.env.IMAGE_SHA || ''),
      created: process.env.IMAGE_CREATED || '',
    };
    const runtime = {
      channel: process.env.RUNTIME_CHANNEL || (process.env.NODE_ENV === 'production' ? 'prod' : 'staging')
    };
    const data = {
      ok: true,
      image,
      node: process.version,
      now: new Date().toISOString(),
      version: image.tag || image.revision || '',
      gitSha: image.revision || '',
      runtime,
    };
    reply.header('x-api', 'version');
    if (image.tag !== undefined && image.tag !== '') reply.header('x-image-tag', String(image.tag));
    if (image.revision !== undefined && image.revision !== '') reply.header('x-image-revision', String(image.revision));
    if (image.created !== undefined && image.created !== '') reply.header('x-image-created', String(image.created));
    if (runtime.channel !== undefined && runtime.channel !== '') reply.header('x-runtime-channel', String(runtime.channel));
    return data;
  });
}


