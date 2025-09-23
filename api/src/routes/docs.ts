import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function registerDocsRoutes(app: FastifyInstance) {
  const enabled = String(process.env.PREVIEW_DOCS ?? 'false').toLowerCase() === 'true';
  if (!enabled) return;

  app.get('/api/openapi.json', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const p = join(__dirname, '..', 'openapi', 'build', 'openapi.json');
      const txt = readFileSync(p, 'utf8');
      reply.header('content-type', 'application/json; charset=utf-8');
      return reply.send(txt);
    } catch {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'openapi.json not found' } });
    }
  });

  app.get('/api/docs', async (_req: FastifyRequest, reply: FastifyReply) => {
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Cerply API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"/>
  </head>
  <body>
    <div id="swagger"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger' });
    </script>
  </body>
</html>`;
    reply.header('content-type', 'text/html; charset=utf-8');
    return reply.send(html);
  });
}


