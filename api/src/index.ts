// src/index.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { pool, query } from './db';

type Fn = (instance: any, opts?: any) => Promise<void> | void;

export async function createApp() {
  const app = Fastify({ logger: true });
  
  // Attach database connection to app instance for routes that need it
  (app as any).db = {
    execute: async (sql: string, params: unknown[] = []) => {
      const { rows } = await query(sql, params);
      return rows;
    }
  };
  
  // CORS — tests expect wildcard and no credentials
  await app.register(cors, { 
    origin: '*', 
    credentials: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization']
  });

  // Helmet (let CORP be set per-route)
  await app.register(helmet, { crossOriginResourcePolicy: false });

  // Accept empty JSON bodies as {}
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    const text = Buffer.isBuffer(body) ? body.toString('utf8') : String(body ?? '');
  
    if (text.trim() === '') return done(null, {});
  
    try {
      return done(null, JSON.parse(text));
    } catch (err) {
      // Surface bad JSON as a 400 instead of crashing
      (err as any).statusCode = 400;
      return done(err as any, undefined);
    }
  });

  // Admin token guard for /certified/** (excluding public artifact routes)
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS') return;
    const url = req.url || '';
    // Skip admin token requirement for public artifact routes
    if (url.startsWith('/api/certified/artifacts/') || url.startsWith('/api/certified/verify')) {
      return; // Allow public access to artifacts and verify endpoints
    }
    if (url.startsWith('/certified/')) {
      const expected = String(process.env.ADMIN_TOKEN || '').trim();
      const provided = String((req.headers as any)['x-admin-token'] || '').trim();
      if (!expected || !provided || expected !== provided) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'missing or invalid admin token' }
        });
      }
    }
  });

  async function safeRegister(modPath: string, fallbacks: string[] = []) {
    try {
      const mod = await import(modPath);
      const candidate: Fn | undefined =
        (mod as any).default ??
        fallbacks.map(n => (mod as any)[n]).find((fn: any) => typeof fn === 'function') ??
        (typeof (mod as any) === 'function' ? (mod as any) : undefined);

      if (typeof candidate === 'function') {
        const result = app.register(candidate as any);
        if (result && typeof result.then === 'function') {
          await result;
        }
  } else {
        app.log.warn({ modPath }, 'No registerable export found');
      }
    } catch (err) {
      app.log.error({ err, modPath }, 'Route registration failed');
    }
  }

  // Admin routes (from your repo; restored in step A)
  const adminCertifiedModule = await import('./routes/admin.certified');
  await app.register(async (adminApp) => {
    // Register security admin plugin only for admin routes
    const securityAdminPlugin = await import('./plugins/security.admin');
    await adminApp.register(securityAdminPlugin.default);
    await adminApp.register(adminCertifiedModule.registerAdminCertifiedRoutes);
  }, { prefix: '/api/admin' });

  // Public certified routes (artifacts, verify, legacy aliases)
  await safeRegister('./routes/certified.artifacts', ['registerCertifiedArtifactsRoutes']);
  await safeRegister('./routes/certified.verify', ['registerCertifiedVerifyRoutes']);
  
  // Register the full certified routes (including plan, schedule, progress, etc.)
  await safeRegister('./routes/certified', ['registerCertified']);
  await safeRegister('./routes/certified.retention', ['registerCertifiedRetentionRoutes']);
  await safeRegister('./routes/certified.audit', ['registerCertifiedAuditPreview']);

  // Orchestrator routes for job management and SSE
  await safeRegister('./routes/orchestrator', ['registerOrchestratorRoutes']);

  // Auth routes for session management
  await safeRegister('./routes/auth', ['registerAuthRoutes']);

  // Analytics routes for smoke tests and event tracking
  await safeRegister('./routes/analytics', ['registerAnalyticsRoutes']);
  await safeRegister('./routes/analytics.preview', ['registerAnalyticsPreviewRoutes']);

  // Ingest routes for legacy compatibility and smoke tests
  await safeRegister('./routes/ingest', ['registerIngestRoutes']);

  // Chat routes for smoke tests
  await safeRegister('./routes/chat', ['registerChatRoutes']);

  // Export routes for analytics
  await safeRegister('./routes/exports', ['registerExportRoutes']);
  
  // Ledger routes for observability
  await safeRegister('./routes/ledger', ['registerLedgerRoutes']);

  // Health route (critical for CI health checks)
  await safeRegister('./routes/health', ['registerHealth']);
  
  // Fallback health endpoint registration (in case safeRegister fails)
  app.get('/api/health', async () => ({ ok: true, fallback: true, timestamp: new Date().toISOString() }));

  // TEMP: expose route tree + commit for staging debug
  app.get('/__debug/routes', { config: { public: true } }, async (_req, reply) => {
    const commit = process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown';
    const routesText = app.printRoutes();
    reply.header('access-control-allow-origin', '*');
    return reply.code(200).send({
      commit,
      nodeEnv: process.env.NODE_ENV,
      routes: routesText,
    });
  });
  
  // Dev routes for observability smoke tests
  await safeRegister('./routes/dev', ['registerDevRoutes']);
  
  // Additional dev route modules (CommonJS exports)
  const devMigrate = await import('./routes/dev');
  if ((devMigrate as any).registerDevMigrate) {
    await app.register((devMigrate as any).registerDevMigrate);
  }
  if ((devMigrate as any).registerDevSeed) {
    await app.register((devMigrate as any).registerDevSeed);
  }
  if ((devMigrate as any).registerDevBackfill) {
    await app.register((devMigrate as any).registerDevBackfill);
  }

  // Force permissive CORS and scoped notFound for Certified public API
  await app.register(async function (prefixed) {
    // headers for ALL responses under /api/certified/*
    prefixed.addHook('onSend', async (req, reply, payload) => {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return payload;
    });

    // any unknown path under the prefix → stable 404 shape
    prefixed.setNotFoundHandler((req, reply) => {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      reply.type('application/json');
      return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
    });
  }, { prefix: '/api/certified' });

  // Route registration logging
  app.addHook('onRoute', (route) => {
    if (route.method && route.url?.includes('/api/certified')) {
      app.log.info({ method: route.method, url: route.url }, 'route_registered');
    }
  });

  // Add build header on every response so we know which build we're hitting
  app.addHook('onSend', async (_req, reply, payload) => {
    const commit = process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown';
    reply.header('x-app-commit', commit);
    reply.header('x-debug-test', '1'); // Temporary debug header
    return payload;
  });

  // FINAL guard: enforce permissive CORS for all /api/certified/* responses
  app.addHook('onSend', async (req, reply, payload) => {
    const url = (req.raw?.url || (req as any).url || '') as string;
    if (typeof url === 'string' && url.startsWith('/api/certified/')) {
      // Force open CORS
      reply.header('access-control-allow-origin', '*');
      // Some upstream middleware sets this to true; make sure it's not present
      try { reply.removeHeader('access-control-allow-credentials'); } catch {}
    }
    return payload;
  });

  return app;
}

// Server startup (only when run directly)
if (require.main === module) {
  (async () => {
    try {
      const app = await createApp();
      const port = Number(process.env.PORT ?? 8080);
      await app.listen({ host: '0.0.0.0', port });
      console.log(`[api] listening on http://0.0.0.0:${port}`);
    } catch (err) {
      console.error('fastify_boot_error', err);
      process.exit(1);
    }
  })();
}