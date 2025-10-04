import crypto from 'node:crypto';
import type { FastifyServerOptions, FastifyInstance } from 'fastify';
import { createApp } from './index';

// Unified app builder used by tests and production bootstrap
export async function buildApp(_opts?: FastifyServerOptions) {
  // Build the base app (this wires plugins/routes in production order)
  const app: FastifyInstance = await createApp();

  // Global normalization for Certified routes (applies to all existing routes)
  app.addHook('onSend', async (request, reply, payload) => {
    try {
      const url = request.raw?.url || (request as any).url || '';
      const status = reply.statusCode;

      // Normalize public artifact responses (JSON and .sig)
      if (/^\/api\/certified\/artifacts\/[^/]+(?:\.sig)?$/.test(url)) {
        // Cache for 5 minutes
        if (!reply.hasHeader('cache-control')) {
          reply.header('cache-control', 'public, max-age=300, must-revalidate');
        }

        // JSON artifact (non-.sig): add ETag and permissive CORS on success
        if (!url.endsWith('.sig') && status === 200) {
          if (!reply.hasHeader('etag')) {
            const buf =
              Buffer.isBuffer(payload)
                ? payload
                : Buffer.from(
                    typeof payload === 'string' ? payload : JSON.stringify(payload ?? {})
                  );
            const sha = crypto.createHash('sha256').update(buf).digest('hex');
            reply.header('etag', `"${sha}"`);
          }
          if (!reply.hasHeader('access-control-allow-origin')) {
            reply.header('access-control-allow-origin', '*');
          }
          reply.removeHeader('access-control-allow-credentials');
        }

        return payload;
      }

      // Verify endpoint: only set CORS headers, let handler manage response format
      if (typeof url === 'string' && url.startsWith('/api/certified/verify')) {
        if (!reply.hasHeader('access-control-allow-origin')) {
          reply.header('access-control-allow-origin', '*');
        }
        reply.removeHeader('access-control-allow-credentials');
      }

      return payload;
    } catch {
      // Never break the response on hook errors
      return payload;
    }
  });

  return app;
}

export default buildApp;