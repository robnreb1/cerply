/* eslint-disable @typescript-eslint/no-explicit-any */
export async function registerVersionRoutes(app: any) {
  app.get('/api/version', async (_req: any, reply: any) => {
    // Prefer specific build-time env vars, fallback to Render/runtime vars, then 'unknown'
    const commit = process.env.COMMIT_SHA 
      || process.env.RENDER_GIT_COMMIT 
      || process.env.GIT_SHA 
      || process.env.IMAGE_SHA 
      || process.env.IMAGE_REVISION 
      || 'unknown';
    
    const builtAt = process.env.BUILD_TIMESTAMP 
      || process.env.IMAGE_CREATED 
      || 'unknown';
    
    const imageTag = process.env.IMAGE_TAG || 'unknown';
    
    const runtime = {
      channel: process.env.RUNTIME_CHANNEL || (process.env.NODE_ENV === 'production' ? 'prod' : 'staging')
    };
    
    const data = {
      service: 'api',
      commit,
      built_at: builtAt,
      image_tag: imageTag,
      node: process.version,
      runtime,
      now: new Date().toISOString(),
    };
    
    // Set response headers for easy inspection
    reply.header('x-image-revision', commit);
    reply.header('x-image-created', builtAt);
    reply.header('x-image-tag', imageTag);
    reply.header('x-runtime-channel', runtime.channel);
    
    return data;
  });
}


