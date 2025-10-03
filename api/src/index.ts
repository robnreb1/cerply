// src/index.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

type Fn = (instance: any, opts?: any) => Promise<void> | void;

export async function createApp() {
  const app = Fastify({ logger: true });
  
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

  // Admin token guard for /certified/**
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS') return;
    if ((req.url || '').startsWith('/certified/')) {
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
  await safeRegister('./routes/admin.certified', ['registerAdminCertified']);

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

  // Health route (critical for CI health checks)
  await safeRegister('./routes/health', ['registerHealth']);

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