// --- Minimal .env loader (loads .env.local then .env if present) ---
import fs from "node:fs";
import path from "node:path";

(function initEnv() {
  const files = [".env.local", ".env"];
  for (const f of files) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      if (!raw || /^\s*#/.test(raw)) continue;
      const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let [, key, val] = m;
      // strip surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
})();

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import crypto from 'node:crypto';
import { pool } from './db';
import type { FastifyRequest, FastifyReply } from 'fastify';

import { decideNextAction, extractAppendModuleTitle } from './orchestrator';
import { modulesLoad, modulesStore, analyticsRecord } from './tools';
import { adaptModulesForProfile } from './profileAdapt';
import { isAdminAllowed, hasSessionFromReq, COOKIE_NAME } from './admin';
import { parseEnv } from './env';
import { registerChatRoutes } from './routes/chat';
import { registerIngestRoutes } from './routes/ingest';
import { registerAuthRoutes } from './routes/auth';
import { registerLearnRoutes } from './routes/learn';
import { registerDevRoutes } from './routes/dev';
import { registerDbHealth } from './routes/dbHealth';
import { registerAnalyticsRoutes } from './routes/analytics';
import { registerRoutesDump }     from './routes/routesDump';
import { registerLedgerRoutes }   from './routes/ledger';
import { registerExportRoutes }   from './routes/exports';


// Helper: get session cookie from parsed cookies or raw header
function getSessionCookie(req: FastifyRequest, name: string): string | undefined {
  const parsed = (req as any).cookies?.[name];
  if (parsed) return parsed as string;
  const raw = String((req.headers as any)['cookie'] || '');
  const parts = raw.split(/;\s*/).map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx > 0) {
      const k = p.slice(0, idx);
      const v = p.slice(idx + 1);
      if (k === name) return v;
    }
  }
  return undefined;
}

// --- Local types to avoid cross-file coupling (orchestrator does not export these) ---
type OrchestratorModule = { id: string; title: string; estMinutes: number };
type ChatMsg = { id?: string; role: 'user' | 'assistant' | 'system'; content: string };
type ChatReq = {
  messages: ChatMsg[];
  useFallback?: boolean;
  profile?: { userId?: string; prefs?: Record<string, any> };
};

// --- LLM helpers: guard temperature & JSON mode for GPT-5 family ---
function isGpt5(model: string) {
  return String(model || '').toLowerCase().startsWith('gpt-5');
}
type ChatBody = {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  response_format?: { type: 'json_object' };
  temperature?: number;
};
function makeChatBody(model: string, system: string, user: string, asJson = true, temp = 0.2): ChatBody {
  const body: ChatBody = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    ...(asJson ? { response_format: { type: 'json_object' as const } } : {})
  };
  // GPT‑5 family only supports the default temperature — omit the field entirely.
  if (!isGpt5(model)) {
    body.temperature = temp;
  }
  return body;
}

// --- Test stubs (deterministic) ---
function shouldStubGenerate(req: any) {
  const hdr = String((req.headers as any)['x-generate-impl'] || '');
  return process.env.NODE_ENV === 'test' || hdr === 'v3-stub';
}

function deterministicGenerateStub() {
  return [{
    moduleId: 'stub-01',
    title: 'Deterministic Generate (Stub)',
    explanation: 'Test-only stub output for ingest/generate.',
    questions: {
      mcq: {
        id: 'stub-q1',
        stem: 'Stub MCQ: pick A',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
      },
      free: { prompt: 'Stub: write one sentence.' },
    },
  }];
}


export async function createApp() {
  // --- App bootstrap ---
  const app = Fastify({ logger: true });
  // Explicit CORS preflight for Certified endpoints so tests and browsers see 204 with headers
  app.addHook('onRequest', async (req: any, reply: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      const url = String(req?.url || '');
      if (method === 'OPTIONS' && url.startsWith('/api/certified/')) {
        reply
          .header('access-control-allow-origin', '*')
          .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
          .header('access-control-allow-headers', 'content-type, authorization')
          .code(204)
          .send();
      }
    } catch {}
  });
  
  // ── Observability: per-request duration headers + optional DB sampling ──
  const OBS_PCT = Number(process.env.OBS_SAMPLE_PCT || '0'); // 0..100
  app.addHook('onRequest', async (req:any, _reply:any) => {
    req.__t0 = (global as any).performance?.now ? (global as any).performance.now() : Date.now();
  });
  app.addHook('onSend', async (req:any, reply:any, payload:any) => {
    const t1 = (global as any).performance?.now ? (global as any).performance.now() : Date.now();
    const ms = Math.max(0, Math.round((t1 - (req.__t0 || t1)) * 10) / 10);
    reply.header('Server-Timing', `app;dur=${ms}`);
    reply.header('x-req-ms', String(ms));

    // probabilistic DB sink of latency as event payload
    try {
      if (OBS_PCT > 0 && Math.random() * 100 < OBS_PCT) {
        const db = (app as any).db;
        if (db?.execute) {
          const payload = {
            route: String((req.routerPath || req.url || '')).slice(0, 120),
            method: req.method,
            status: reply.statusCode,
            ms
          };
          await db.execute(`insert into events(user_id, type, payload) values ($1,$2,$3)`, [null, 'latency', payload]);
        }
      }
    } catch {}
    // Inject runtime channel into /api/version response without changing existing fields
    try {
      const routePath = String((req as any).routerPath || (req as any).url || '').trim();
      if (process.env.RUNTIME_CHANNEL && routePath === '/api/version') {
        reply.header('x-runtime-channel', process.env.RUNTIME_CHANNEL);
        if (payload && typeof payload === 'object') {
          return { ...(payload as any), runtime: { channel: process.env.RUNTIME_CHANNEL } };
        }
        if (typeof payload === 'string') {
          const trimmed = payload.trim();
          if (trimmed.startsWith('{')) {
            try {
              const parsed = JSON.parse(trimmed);
              const next = { ...parsed, runtime: { channel: process.env.RUNTIME_CHANNEL } };
              return JSON.stringify(next);
            } catch {}
          }
        }
      }
    } catch {}
    return payload;
  });
  // ────────────────────────────────────────────────────────────────────────
  // Request ID header and availability on req
  app.addHook('onRequest', async (req, reply) => {
    const rid = (req as any).id || (req.headers as any)['x-request-id'] || `req-${Math.random().toString(36).slice(2,8)}`;
    (req as any).id = rid;
    reply.header('x-req-id', String(rid));
  });
  // Validate environment
  parseEnv(process.env);
  // Runtime deploy channel (optional): allows staging/prod to report environment without rebuilds
  const RUNTIME_CHANNEL = process.env.RUNTIME_CHANNEL || '';
// ---- debug route collection ----
type RouteRow = { method: string; url: string };
const __ROUTES: RouteRow[] = [];
app.addHook('onRoute', (route) => {
  const method = Array.isArray(route.method) ? route.method.join(',') : String(route.method);
  __ROUTES.push({ method, url: route.url });
});
// Mark certified routes as public so global guards skip them
app.addHook('onRoute', (route) => {
  if (typeof route.url === 'string' && route.url.startsWith('/api/certified/')) {
    // @ts-ignore augment fastify route config
    (route as any).config = { ...(route as any).config, public: true };
  }
});
const CORS_ORIGINS = String(process.env.CORS_ORIGINS ?? '').trim();
const defaultOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
];
const origins = CORS_ORIGINS ? CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : defaultOrigins;
await app.register(cors, { origin: origins, credentials: true });
await app.register(fastifyCookie);
// Optional security headers (helmet)
try {
  const helmet = (await import('@fastify/helmet')).default as any;
  await app.register(helmet, { contentSecurityPolicy: false });
} catch {}

// Targeted CORS: ensure certified POST responses have ACAO:* and no ACAC
app.addHook('onSend', async (request:any, reply:any, payload:any) => {
  try {
    const method = String(request?.method || '').toUpperCase();
    const url = String(request?.url || (request?.raw && (request.raw as any).url) || '');
    const isCertified = url.startsWith('/api/certified/');
    if (method !== 'OPTIONS' && isCertified) {
      reply.header('Access-Control-Allow-Origin', '*');
      const hasACAC = typeof reply.hasHeader === 'function' && reply.hasHeader('Access-Control-Allow-Credentials');
      if (hasACAC && typeof (reply as any).removeHeader === 'function') {
        (reply as any).removeHeader('Access-Control-Allow-Credentials');
      } else if (hasACAC) {
        reply.header('Access-Control-Allow-Credentials', 'false');
      }
      const debug = (process.env.CERTIFIED_DEBUG_CORS === '1') || (process.env.RUNTIME_CHANNEL === 'staging');
      if (debug) reply.header('x-cors-certified-hook', '1');
    }
  } catch {}
  return payload;
});

// Public-route bypass helper for any global guards (auth/CSRF).
function isPublicURL(url = '') {
  return url.startsWith('/api/certified/');
}

function isPublic(req: any): boolean {
  try {
    const cfg = (req?.routeOptions?.config ?? {}) as Record<string, any>;
    const url = String(req?.url || '');
    return cfg.public === true || req?.method === 'OPTIONS' || isPublicURL(url);
  } catch {
    return false;
  }
}

// Tag public requests so any downstream hooks can skip enforcement safely
app.addHook('onRequest', async (req: any, reply: any) => {
  if (isPublic(req)) {
    (req as any).__isPublicRoute = true;
    return;
  }
  // If you add auth/CSRF checks here in future, please retain the breadcrumb on deny for staging diagnosis
  // Example (pseudo): if (!authorized) { reply.header('x-guard-path','onRequest:blocked'); return reply.code(403).send({ error: { code:'FORBIDDEN', message:'forbidden' } }); }
});

// Mirror guard at preHandler if needed in future; ensure public early return
app.addHook('preHandler', async (req: any, reply: any) => {
  if (isPublic(req)) return;
  // If enforcing CSRF/session here, add breadcrumb header on deny similarly:
  // reply.header('x-guard-path','preHandler:blocked');
});

// Attach simple DB adapter when Postgres is reachable (used by dev routes)
try {
  await pool.query('select 1');
  (app as any).db = {
    execute: async (sql: string, params?: any[]) => {
      const r = await pool.query(sql, params as any);
      return r.rows as any[];
    },
  };
} catch {}

// Rate limit (env-guarded; default on outside test)
try {
  const rateLimit = (await import('@fastify/rate-limit')).default as any;
  const enable = ((): boolean => {
    const v = String(process.env.RATE_LIMIT_ENABLED ?? (process.env.NODE_ENV === 'test' ? 'false' : 'true')).toLowerCase();
    return !(v === 'false' || v === '0' || v === 'off');
  })();
  if (enable) {
    await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
    // Tighter buckets for certain prefixes
    app.addHook('onRoute', (route) => {
      if (typeof route.url === 'string' && (/^\/api\/(certified|ingest)\//.test(route.url))) {
        // @ts-ignore (plugin offers per-route config via routeOptions on recent versions)
        (route as any).config = { ...(route as any).config, rateLimit: { max: 20, timeWindow: '1 minute' } };
      }
    });
  }
} catch {}

// Global error handler → standardized envelope
app.setErrorHandler((err, _req, reply) => {
  const status = (err as any)?.statusCode && Number.isFinite((err as any)?.statusCode) ? (err as any).statusCode : 500;
  const code = status >= 500 ? 'INTERNAL' : 'BAD_REQUEST';
  reply.code(status).send({ error: { code, message: err?.message || 'Internal error' } });
});

// Debug: LLM status (non-sensitive; shows model names and flags only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/llm/status', async (_req, reply) => {
    const enabledFlag = String(process.env.LLM_PREVIEW ?? process.env.LLM_PLANNER ?? '1').toLowerCase();
    const enabled = !(enabledFlag === '0' || enabledFlag === 'false' || enabledFlag === 'off');
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const hasKey = Boolean(OPENAI_API_KEY && String(OPENAI_API_KEY).length > 0);
    const provider = String(process.env.LLM_PLANNER_PROVIDER ?? 'openai');
    const plannerPrimary = String(process.env.LLM_PLANNER_MODEL ?? 'gpt-5');
    const plannerFallback = String(process.env.LLM_PLANNER_FALLBACK_MODEL ?? 'gpt-4o');
    const chatPrimary = String(process.env.CHAT_MODEL ?? plannerPrimary);
    const chatFallback = String(process.env.LLM_PLANNER_FALLBACK_MODEL ?? plannerFallback);
    const itemsPrimary = String(process.env.ITEMS_MODEL ?? 'gpt-5-thinking');
    const itemsFallback = String(process.env.ITEMS_MODEL_FALLBACK ?? 'gpt-4o');
    reply.header('x-api', 'llm-status');
    return reply.send({
      provider,
      enabled,
      hasKey,
      hasApiKey: hasKey,
      planner: { primary: plannerPrimary, fallback: plannerFallback },
      chat: { primary: chatPrimary, fallback: chatFallback },
      items: { primary: itemsPrimary, fallback: itemsFallback }
    });
  });
}



// --- Feature flags (env-driven; off by default) ---
const FLAGS = {
  ff_quality_bar_v1: process.env.FF_QUALITY_BAR_V1 === 'true',
  ff_cost_guardrails_v1: process.env.FF_COST_GUARDRAILS_V1 === 'true',
  ff_group_challenges_v1: process.env.FF_GROUP_CHALLENGES_V1 === 'true',
  ff_connectors_basic_v1: process.env.FF_CONNECTORS_BASIC_V1 === 'true',
  ff_certified_sla_status_v1: process.env.FF_CERTIFIED_SLA_STATUS_V1 === 'true',
  ff_marketplace_ledgers_v1: process.env.FF_MARKETPLACE_LEDGERS_V1 === 'true',
  ff_benchmarks_optin_v1: process.env.FF_BENCHMARKS_OPTIN_V1 === 'true',
  ff_prompts_lib_v1: process.env.FF_PROMPTS_LIB_V1 === 'true',
};

// Health endpoints
app.get('/api/health', async (req, reply) => {
  reply.header('x-api', 'api-health');
  // Advertise default planner choice for quick CLI checks
  reply.header('x-planner-default', modelFamily(PLANNER_PRIMARY));
  const q = (req as any).query as { db?: string } | undefined;
  let dbInfo: any = undefined;
  if (q && String(q.db || '').trim() === '1') {
    const urlStr = String(process.env.DATABASE_URL || '');
    let host = 'unset';
    try { if (urlStr) host = new URL(urlStr).host; } catch {}
    try {
      if (!urlStr) throw new Error('DATABASE_URL not set');
      const r = await pool.query('select 1 as ok');
      dbInfo = { ok: Array.isArray(r?.rows) && r.rows.length > 0, host };
    } catch (e: any) {
      dbInfo = { ok: false, host, error: String(e?.message || e) };
    }
  }
  const body: any = {
    ok: true,
    env: process.env.NODE_ENV ?? 'unknown',
    planner: {
      provider: LLM_PROVIDER,
      primary: PLANNER_PRIMARY,
      fallback: PLANNER_FALLBACK,
      enabled: LLM_PLANNER_ENABLED,
    },
  };
  if (dbInfo) body.db = dbInfo;
  return reply.send(body);
});

app.get('/health', async (_req, reply) => {
  reply.header('x-api', 'health');
  return reply.send({ ok: true, note: 'prefer /api/health' });
});

app.get('/flags', async (_req, reply) => {
  reply.header('x-api', 'flags');
  return reply.send({ flags: FLAGS });
});

// API-prefixed flags (mirror)
app.get('/api/flags', async (_req, reply) => {
  reply.header('x-api', 'flags');
  return reply.send({ flags: FLAGS });
});

// --- Test endpoint ---
app.get('/test', async () => ({ message: 'test endpoint working' }));

 

// Auth routes
await registerAuthRoutes(app);


function modelFamily(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.startsWith('gpt-5')) return 'gpt-5';
  if (n.startsWith('gpt-4o')) return 'gpt-4o';
  return name;
}

await registerChatRoutes(app);
await registerIngestRoutes(app);
await registerLearnRoutes(app);
await registerDevRoutes(app);
const _enableDevRoutes = process.env.ENABLE_DEV_ROUTES === '1';
if (_enableDevRoutes) {
  const { registerDevMigrate } = require('./routes/dev');
  await registerDevMigrate(app);
  const { registerDevSeed } = require('./routes/dev');
  await registerDevSeed(app);
  const { registerDevBackfill } = require('./routes/dev');
  await registerDevBackfill(app);
  const { registerDevStats } = require('./routes/dev');
  await registerDevStats(app);
}
await registerDbHealth(app);

await registerAnalyticsRoutes(app);
await registerRoutesDump(app);
await registerLedgerRoutes(app);
// await registerAnalyticsPilot(app);
await registerExportRoutes(app);
// await registerBudgetAlarm(app);

// Certified pipeline (feature-flagged; returns stubs)
try {
  const { registerCertifiedRoutes } = await import('./routes/certified');
  await registerCertifiedRoutes(app);
} catch {}

// ---------------------
// Learner profile (MVP) — store lightweight preferences
// ---------------------
type LearnerProfile = { userId: string; prefs?: Record<string, any>; updatedAt: string };
const _profiles = new Map<string, LearnerProfile>();

app.get('/api/learner/profile', async (req: FastifyRequest, reply: FastifyReply) => {
  const userId = 'dev';
  const p = _profiles.get(userId) ?? { userId, prefs: {}, updatedAt: new Date().toISOString() };
  return reply.send(p);
});

app.post('/api/learner/profile', async (req: FastifyRequest, reply: FastifyReply) => {
  const userId = 'dev';
  const body = ((req as any).body ?? {}) as { prefs?: Record<string, any> };
  const prev = _profiles.get(userId) ?? { userId, prefs: {}, updatedAt: new Date().toISOString() };
  const merged: LearnerProfile = {
    userId,
    prefs: { ...(prev.prefs ?? {}), ...(body.prefs ?? {}) },
    updatedAt: new Date().toISOString()
  };
  _profiles.set(userId, merged);
  // Best-effort persistence to artefacts for history
  try {
    await pool.query(
      'insert into artefacts (kind, title, content, created_at) values ($1,$2,$3, now())',
      ['learner_profile', `profile:${userId}`, JSON.stringify(merged)]
    );
  } catch {}
  reply.header('cache-control', 'no-store');
  return reply.send({ ok: true, profile: merged });
});

// --- Prompt Library API (🧪 ff_prompts_lib_v1) ---
if (FLAGS.ff_prompts_lib_v1) {
  const { listPrompts, getPrompt } = await import('./promptLoader');
  
  app.get('/api/prompts', async () => {
    const prompts = listPrompts();
    return { prompts };
  });
  
  app.get('/api/prompts/:id', async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const prompt = getPrompt(id);
    if (!prompt) {
      return { error: { code: 'PROMPT_NOT_FOUND', message: 'Prompt not found', details: { id } } };
    }
    return { id, meta: prompt.meta, raw: prompt.raw, template: prompt.template };
  });
}

// ---------------------
// Types
// ---------------------
type MCQItem = {
  id: string;
  stem: string;
  options: string[];      // length 4
  correctIndex: number;   // 0..3
};

type Objective = {
  id: string;
  title: string;
  items: MCQItem[];
};

// --- v2.3 optional metadata types (non-breaking)
interface ItemMeta {
  readability?: number;          // 0..100
  bannedFlags?: string[];
  qualityScore?: number;         // 0..100
  sourceSnippet?: string;
}
interface ItemStats {
  firstTryCorrect?: number;      // 0..1
  avgTimeMs?: number;
  discrimination?: number;
}
type MCQItemAugmented = MCQItem & { meta?: ItemMeta; stats?: ItemStats };

type GenLedger = { itemId: string; modelUsed: string; costCents: number; createdAt: string; reviewTimeSec?: number };

type Group = { id: string; name: string; createdAt: string };
type GroupMember = { groupId: string; userId: string; joinedAt: string };
type Challenge = { id: string; groupId: string; packId: string; windowDays: number; prizeText?: string; createdAt: string };
type ChallengeAttempt = { challengeId: string; userId: string; score: number; completedAt: string };

type CertifiedPack = { id: string; sourceVersion: string; lastChangeDetectedAt: string; publishedUpdateAt?: string; ttuDays?: number };

type PackPrice = { packId: string; currency: string; amountCents: number; isBundle?: boolean };
type Order = { id: string; userId: string; items: { packId: string; qty: number }[]; amountCents: number; createdAt: string };
type PayoutLedger = { packId: string; recipientId: string; amountCents: number; period: string };

type TenantSettings = { tenantId: string; sector?: string; benchmarksOptIn?: boolean };

// --- Simple in-memory stores (MVP) ---
const _genLedger: GenLedger[] = [];
const _groups: Group[] = [];
const _challenges: Challenge[] = [];
const _attempts: ChallengeAttempt[] = [];
const _certPacks: Record<string, CertifiedPack> = {};

// ---------------------
// Helpers
// ---------------------
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 20);
}

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => w.length > 3);
  // naive top-5
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] ?? 0) + 1;
  return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,5).map(([w]) => w);
}

function mkItem(stem: string, idx: number): MCQItem {
  const kw = extractKeywords(stem);
  const correct = `About: ${kw[0] ?? 'topic'}`;
  const distractors = [
    `Unrelated: ${kw[1] ?? 'misc'}`,
    `Partially true: ${kw[2] ?? 'detail'}`,
    `Opposite: ${kw[3] ?? 'antonym'}`,
  ];
  const options = [correct, ...distractors];
  return {
    id: `auto-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    stem,
    options,
    correctIndex: 0,
  };
}
async function extractTextFromBytes(name: string, bytes: Buffer): Promise<string> {
  const head = bytes.subarray(0, 4).toString('utf8');

  // .docx (zip with "PK")
  if (/\.docx$/i.test(name) || head.startsWith('PK')) {
    const mammothMod = await import('mammoth');
    const { value } = await mammothMod.extractRawText({ buffer: bytes });
    return value;
  }

  // .pdf
  if (head.startsWith('%PDF')) {
    try {
      // Use createRequire to avoid debug mode issues in pdf-parse
      const { createRequire } = await import('module');
      // CJS-friendly require shim (avoids import.meta)
const require: NodeRequire = eval('require');
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(bytes);
      return (result?.text ?? '') as string;
    } catch (error) {
      console.error('PDF parsing error:', error);
      // If PDF parsing fails, provide a helpful error message
      if (error && typeof error === 'object' && 'message' in error) {
        const msg = (error as any).message || '';
        if (msg.includes('Invalid PDF structure')) {
          return '[Error: File appears to be corrupted or not a valid PDF. Please check the file and try again.]';
        }
        return `[Error: Unable to extract text from PDF - ${msg}]`;
      }
      return '[Error: Unable to extract text from PDF - Unknown error]';
    }
  }

  // fallback: assume utf-8 text
  return bytes.toString('utf8');
}

function chunkPlaintext(text: string): string[] {
  const clean = text
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ \u00A0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // paragraph-ish chunks
  return clean
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, 200);
}

// ---------------------
// Ingest preview helpers (outline + ids)
// ---------------------
type ModuleOutline = { id: string; title: string; estMinutes?: number };

function makeId(prefix: string, i: number) {
  return `${prefix}-${String(i + 1).padStart(2, '0')}`;
}

/**
 * Create a lightweight module outline from free text.
 * Heuristics: split to paragraph-ish chunks, estimate modules by size,
 * use top keywords to title the first few, then fallback to Module N.
 */
function outlineFromText(text: string): ModuleOutline[] {
  const chunks = chunkPlaintext(text);
  const wordCount = text.trim().split(/\s+/).length;
  // 250–400 words per module target
  const target = 320;
  const rawCount = Math.max(1, Math.min(12, Math.round(wordCount / target)));
  const count = Math.max(1, Math.min(12, rawCount || 1));

  const kws = extractKeywords(text);
  const modules: ModuleOutline[] = [];
  for (let i = 0; i < count; i++) {
    const kw = kws[i] ?? null;
    const title = kw ? `About: ${kw[0].toUpperCase()}${kw.slice(1)}` : `Module ${i + 1}`;
    modules.push({ id: makeId('mod', i), title, estMinutes: 3 + Math.floor(Math.random() * 5) });
  }
  // If the text looks very short, collapse to one overview module
  if (wordCount < 120 && modules.length > 1) {
    return [{ id: 'mod-01', title: 'Overview', estMinutes: 3 }];
  }
  return modules;
}

/**
 * Lightweight intent analysis from a short free-text brief.
 * Extracts topic (normalized), time budget in minutes, intro flag, and optional focus segment.
 */
function analyzeIntent(input: string) {
  const raw = (input || '').trim();
  const lower = raw.toLowerCase();

  // time budget
  let mins = 0;
  const m1 = lower.match(/(\d+)\s*(min|mins|minute|minutes)\b/);
  const h1 = lower.match(/(\d+)\s*(h|hr|hour|hours)\b/);
  if (m1) mins += parseInt(m1[1], 10);
  if (h1) mins += parseInt(h1[1], 10) * 60;

  // intro intent
  const isIntro = /\b(intro|beginner|beginners|basics|foundation|foundations)\b/.test(lower);

  // focus segment ("focus on X")
  const f = lower.match(/\bfocus\s+(on|around)?\s*([a-z0-9\-\s]+)/);
  const focus = f ? f[2].trim().replace(/\.$/, '') : undefined;

  // topic normalization (coarse)
  // Strip polite/control prefixes ("let's do X", "please X", "teach me X", "learn X")
  const stripped = raw
    .replace(/^\s*(let\'?s\s+(do|learn|study)\s+)/i, '')
    .replace(/^\s*(please\s+)/i, '')
    .replace(/^\s*(teach\s+me\s+)/i, '')
    .replace(/^\s*(i\s*(want|would\s+like)\s+to\s+(learn|study)\s+)/i, '')
    .replace(/^\s*(learn|study)\s+/i, '')
    .trim();
  let topic = (stripped || raw).split(/[.,\n]/)[0].trim() || 'Learning Topic';
  const bigMap: Record<string, string> = {
    astrophysics: 'Astrophysics',
    'quantum mechanics': 'Quantum Mechanics',
    mathematics: 'Mathematics',
    algebra: 'Algebra',
    geometry: 'Geometry',
    calculus: 'Calculus',
    statistics: 'Statistics',
    biology: 'Biology',
    chemistry: 'Chemistry',
    'computer science': 'Computer Science',
    economics: 'Economics',
    physics: 'Physics',
    history: 'History',
    regulation: 'Regulation',
  };
  for (const k of Object.keys(bigMap)) {
    if (lower.includes(k)) topic = bigMap[k];
  }

  // Capitalize first word fallback
  if (!Object.values(bigMap).includes(topic)) {
    topic = topic.slice(0, 1).toUpperCase() + topic.slice(1);
  }

  return { topic, mins, isIntro, focus };
}

// Parse lightweight time bounds from free text: deadlines (by <date/month>) or durations (in X weeks/months)
function parseBounds(input: string): { deadlineIso?: string; weeks?: number } {
  const lower = input.toLowerCase();
  const now = new Date();

  // in X weeks/months
  const mWeeks = lower.match(/in\s+(\d{1,2})\s*(week|weeks|wk|w)\b/);
  if (mWeeks) {
    const w = Math.max(1, parseInt(mWeeks[1]!, 10));
    return { weeks: w };
  }
  const mMonths = lower.match(/in\s+(\d{1,2})\s*(month|months|mo|m)\b/);
  if (mMonths) {
    const months = Math.max(1, parseInt(mMonths[1]!, 10));
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return { deadlineIso: d.toISOString() };
  }

  // by <day> <month>, by <month> (assume end of month), by <YYYY-MM-DD>
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','sept','oct','nov','dec'];
  const byIso = lower.match(/by\s+(\d{4}-\d{2}-\d{2})/);
  if (byIso) {
    const d = new Date(byIso[1]!);
    if (!isNaN(+d)) return { deadlineIso: d.toISOString() };
  }
  const byDayMonth = lower.match(/by\s+(\d{1,2})\s+([a-z]{3,})/);
  if (byDayMonth && months.some(m => byDayMonth[2]!.startsWith(m))) {
    const monthIndex = months.findIndex(m => byDayMonth[2]!.startsWith(m));
    const d = new Date(now.getFullYear(), monthIndex, parseInt(byDayMonth[1]!, 10));
    if (!isNaN(+d)) return { deadlineIso: d.toISOString() };
  }
  const byMonth = lower.match(/by\s+([a-z]{3,})\b/);
  if (byMonth) {
    const mi = months.findIndex(m => byMonth[1]!.startsWith(m));
    if (mi >= 0) {
      // end of that month
      const end = new Date(now.getFullYear(), mi + 1, 0);
      return { deadlineIso: end.toISOString() };
    }
  }
  return {};
}

/**
 * Propose a set of modules given topic & constraints.
 * Chooses count primarily from time budget; falls back to scope-based heuristics.
 */
function proposeModules(topic: string, mins: number, isIntro: boolean, focus?: string): ModuleOutline[] {
  // choose module count
  let n =
    mins >= 90 ? 6 :
    mins >= 60 ? 5 :
    mins >= 40 ? 4 :
    mins >= 25 ? 3 :
    2;

  // scope-based bump/cap when no explicit time given
  const heavy = ['Astrophysics', 'Quantum Mechanics', 'Mathematics', 'Biology', 'Computer Science', 'Physics'];
  if (!mins && heavy.includes(topic)) n = Math.max(n, isIntro ? 3 : 5);
  if (isIntro) n = Math.min(n, 4);
  n = clamp(n, 2, 6);

  // per-module minutes (ensure at least 5 and at most 25)
  const per = clamp(Math.floor((mins || (n * 8)) / n), 5, 25);

  // seed titles
  const seeds: string[] = [];
  seeds.push(`${topic}: Foundations`);
  if (focus) seeds.push(`Focus: ${focus}`);
  seeds.push(`${topic}: Core Concepts`);
  seeds.push(`${topic}: Applications`);
  seeds.push(`${topic}: Key Equations & Methods`);
  seeds.push(`${topic}: Review & Practice`);

  // uniq & trim to n
  const seen = new Set<string>();
  const titles = seeds.filter(t => (seen.has(t) ? false : (seen.add(t), true))).slice(0, n);

  return titles.map((title, i) => ({
    id: `mod-${String(i + 1).padStart(2, '0')}`,
    title,
    estMinutes: per,
  }));
}

// ---------------------
// LLM-based planner (optional; OpenAI via fetch, no SDK)
// ---------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const PLANNER_PRIMARY = (process.env.LLM_PLANNER_MODEL ?? 'gpt-5').toString();
const PLANNER_FALLBACK = (process.env.LLM_PLANNER_FALLBACK_MODEL ?? 'gpt-4o').toString();
const LLM_PROVIDER = (process.env.LLM_PLANNER_PROVIDER ?? 'openai').toString().toLowerCase();
const LLM_PLANNER_ENABLED = (() => {
  const v = (process.env.LLM_PREVIEW ?? process.env.LLM_PLANNER ?? '').toString().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  // Default on when an API key is present
  return !!OPENAI_API_KEY;
})();

type LlmPlan = { modules: ModuleOutline[]; raw?: any; model?: string };

async function planModulesLLM(intent: { topic: string; mins: number; isIntro: boolean; focus?: string }): Promise<LlmPlan> {
  if (!LLM_PLANNER_ENABLED) throw new Error('LLM planner disabled by env');
  if (LLM_PROVIDER !== 'openai') throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const sys = [
    'You are a curriculum planner who breaks a user brief into a small set of logical learning modules for a first session.',
    'Return STRICT JSON with shape: { "modules": [ { "id": "mod-01", "title": "string", "estMinutes": number }, ... ] }',
    'Choose module count based on scope and time; there is no fixed preferred range. Per-module 5–25 minutes.',
    'Titles must be specific to the topic/focus (avoid generic words).',
    'If a focus is given, include one module for it.',
    'Do NOT include explanations; only module metadata.'
  ].join(' ');

  const u = JSON.stringify({
    topic: intent.topic,
    timeBudgetMinutes: intent.mins,
    isIntro: intent.isIntro,
    focus: intent.focus ?? null
  });

  const body = (model: string) => makeChatBody(model, sys, `User brief JSON:\n${u}`, true, 0.2);

  async function call(model: string) {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify(body(model))
    });
  }

  let used = PLANNER_PRIMARY;
  let r = await call(PLANNER_PRIMARY);
  if (!r.ok) {
    const r2 = await call(PLANNER_FALLBACK);
    if (!r2.ok) {
      const errText = await r.text().catch(() => '');
      const errText2 = await r2.text().catch(() => '');
      throw new Error(`OpenAI planner failed: ${PLANNER_PRIMARY}→${r.status} ${errText.slice(0,120)} | fallback ${PLANNER_FALLBACK}→${r2.status} ${errText2.slice(0,120)}`);
    }
    r = r2;
    used = PLANNER_FALLBACK;
  }

  const data = await r.json().catch(() => ({} as any));
  const content = data?.choices?.[0]?.message?.content ?? '';
  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch { throw new Error('LLM did not return valid JSON'); }

  const mods: ModuleOutline[] = Array.isArray(parsed?.modules)
    ? parsed.modules.map((m: any, i: number) => ({
        id: typeof m?.id === 'string' ? m.id : `mod-${String(i + 1).padStart(2, '0')}`,
        title: String(m?.title ?? `Module ${i + 1}`),
        estMinutes: Math.max(5, Math.min(25, Number(m?.estMinutes ?? 10)))
      }))
    : [];

  if (mods.length === 0) throw new Error('LLM returned empty modules');

  return { modules: mods.slice(0, 12), raw: parsed, model: used };
}
// ---------------------
// Evidence Coverage (stub)
// ---------------------
type CoverageGap = { id: string; kind: string; detail: string; suggestion: string };
type CoverageSummary = { objectives: number; items: number; covered: number; gaps: number };
type CoverageResp = { scopeId: string; summary: CoverageSummary; gaps: CoverageGap[] };

function handleCoverage(req: FastifyRequest, reply: FastifyReply) {
  const q = (req.query as any) || {};
  const scopeId = (q.scopeId as string) || 'demo';
  const resp: CoverageResp = {
    scopeId,
    summary: { objectives: 3, items: 12, covered: 7, gaps: 5 },
    gaps: [
      { id: 'g1', kind: 'missing_control', detail: 'No evidence for password rotation', suggestion: 'Capture password policy update confirmations quarterly.' },
      { id: 'g2', kind: 'stale_evidence', detail: 'MFA attestations older than 6 months', suggestion: 'Trigger re-attestation flow for all members.' },
      { id: 'g3', kind: 'insufficient_sample', detail: 'Only 3/10 endpoints show patch status', suggestion: 'Ingest MDM report for all endpoints weekly.' },
      { id: 'g4', kind: 'orphan_objective', detail: 'Objective without traceable evidence node', suggestion: 'Define at least one ECS for objective SEC-3.' },
      { id: 'g5', kind: 'data_quality', detail: 'Some evidence blobs missing timestamp', suggestion: 'Normalize ingest to require ISO-8601 timestamps.' },
    ],
  };
  return reply.send(resp);
}
app.get('/evidence/coverage', handleCoverage);
app.get('/api/evidence/coverage', handleCoverage);

// DEV HELPERS: expose routes & process info
app.get('/__routes', async (_req, reply) => {
  const printed = (app as any).printRoutes ? (app as any).printRoutes() : '';
  if (printed && typeof printed === 'string') {
    reply.type('text/plain').send(printed);
  } else {
    // Fallback to JSON list collected via onRoute hook
    reply.type('application/json').send({
      routes: __ROUTES,
      ts: new Date().toISOString(),
      note: 'printRoutes unavailable; returning onRoute snapshot'
    });
  }
});

// JSON route table handled by registerRoutesDump

// Whoami (which process is serving this port)
app.get('/__whoami', async (_req, reply) => {
  reply.type('application/json').send({
    pid: process.pid,
    cwd: process.cwd(),
    node: process.version,
    startedAt: new Date().toISOString(),
    note: 'Fastify API process'
  });
});

// Simple hello (useful smoke test)
app.get('/__hello', async (_req, reply) => {
  reply.type('application/json').send({ ok: true, name: 'cerply-api' });
});

// Minimal dev probe
app.get('/__dev', async (_req, reply) => {
  reply.type('application/json').send({
    hasDevHelpers: true,
    routesCount: __ROUTES.length,
    ts: new Date().toISOString()
  });
});

// ---------------------
// Ingest: parse (normalize raw input into text)  ← simple normalizer used by web/app/api/ingest/parse proxy
// ---------------------
async function handleIngestParse(req: FastifyRequest, reply: FastifyReply) {
  const startedAt = Date.now();
  try {
    // Support JSON {text?, url?} or text/plain
    const ct = String((req.headers as any)['content-type'] || '').toLowerCase();
    let text = '';
    let kind: 'text' | 'url' | 'unknown' = 'unknown';

    if (ct.includes('application/json')) {
      const body = ((req as any).body ?? {}) as { text?: string; url?: string };
      if (typeof body.text === 'string' && body.text.trim()) {
        text = body.text.trim();
        kind = 'text';
      } else if (typeof body.url === 'string' && body.url.trim()) {
        // For now just echo URL; the preview route does real fetch/extract
        text = body.url.trim();
        kind = 'url';
      } else {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Provide text or url' } });
      }
    } else if (ct.includes('text/plain')) {
      const raw = (req as any).body as string;
      text = String(raw ?? '').trim();
      if (!text) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Empty text body' } });
      kind = 'text';
    } else {
      // attempt best-effort
      const raw = (req as any).body as any;
      text = typeof raw === 'string' ? raw.trim() : '';
      if (!text) return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: `Unsupported content-type ${ct || '(none)'}` } });
      kind = 'text';
    }

    // Build a minimal, stable outline
    const bytes = Buffer.byteLength(text, 'utf8');
    const rawSections = text.split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean);
    const sections = rawSections.map((s, i) => ({ id: `sec-${String(i + 1).padStart(2,'0')}`, title: s.split(/\s+/).slice(0, 8).join(' ') }));
    const wordCounts: Record<string, number> = {};
    for (const w of text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
      if (w.length < 3) continue;
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
    const topics = Object.entries(wordCounts).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([term, count], i) => ({ id: `topic-${String(i+1).padStart(2,'0')}`, term, weight: count }));

    reply.header('cache-control', 'no-store');
    reply.header('x-api', 'ingest-parse');
    (req as any).log?.info?.({ route: '/api/ingest/parse', kind, bytes, durationMs: Date.now() - startedAt, reqId: (req as any).id }, 'ingest_parse');
    // Include ok:true for legacy tests while keeping structured response
    return reply.send({ ok: true, sections, topics });
  } catch (err: any) {
    (req as any).log?.error?.({ err }, 'ingest/parse failed');
    return reply.code(500).send({ error: { code: 'INTERNAL', message: 'parse failed' } });
  }
}

// Register on both URLs
app.post('/api/ingest/parse', handleIngestParse);
app.post('/ingest/parse', handleIngestParse);

// Helper: normalize preview input across shapes
function pickText(contentType: string | undefined, body: any, rawText?: string): string | null {
  if (contentType && contentType.includes('text/plain')) return rawText ?? null;
  if (typeof body?.text === 'string') return body.text;
  if (typeof body?.payload?.text === 'string') return body.payload.text;
  if (typeof body?.input?.text === 'string') return body.input.text;
  if (body?.artefact?.kind === 'text' && typeof body.artefact.text === 'string') return body.artefact.text;
  return null;
}

// ---------------------
// Ingest: preview and generate (MVP)
// ---------------------

async function handleIngestPreview(req: FastifyRequest, reply: FastifyReply) {
  const startedAt = Date.now();
  try {
    // Test/stub toggle via header
    const implHeader = String((req.headers as any)['x-preview-impl'] ?? '');
    const forceStub = process.env.NODE_ENV === 'test' || implHeader.toLowerCase() === 'v3-stub';
    if (forceStub) {
      reply.header('cache-control', 'no-store');
      reply.header('x-api', 'ingest-preview');
      reply.header('x-preview-impl', implHeader || 'v3-stub');
      return reply.send({
        ok: true,
        preview: {
          modules: [
            { id: 'stub-01', title: 'Preview: Foundations', estMinutes: 10 },
            { id: 'stub-02', title: 'Preview: Core Concepts', estMinutes: 12 }
          ]
        }
      });
    }
    const ct = String((req.headers as any)['content-type'] || '').toLowerCase();
    const isJson = ct.includes('application/json');
    const body: any = isJson ? ((req as any).body ?? {}) : undefined;
    const rawText: string | undefined = !isJson ? ((req as any).body as string | undefined) : undefined;

    // Legacy shape: { type: 'text'|'url'|'file', payload: string, name?, mime? }
    const legacyType = (body?.type as ('text' | 'url' | 'file' | undefined)) ?? undefined;
    const legacyPayload = (body?.payload as (string | undefined)) ?? undefined;

    let text = '';

    if (legacyType) {
      if (legacyType === 'text') {
        if (!legacyPayload || !legacyPayload.trim()) {
          return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'payload text required' } });
        }
        text = legacyPayload;
      } else if (legacyType === 'url') {
        if (!legacyPayload || !legacyPayload.trim()) {
          return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'url payload required' } });
        }
        const AI_URL = process.env.AI_URL || process.env.NEXT_PUBLIC_AI_URL;
        let extracted = '';
        if (AI_URL) {
          try {
            const r = await fetch(`${AI_URL.replace(/\/+$/, '')}/extract_text`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ url: legacyPayload }),
            });
            if (r.ok) {
              const j = await r.json().catch(() => ({}));
              extracted = (j?.text ?? '').toString();
            }
          } catch { /* ignore and fall back */ }
        }
        if (!extracted) {
          const r = await fetch(legacyPayload);
          const html = await r.text();
          extracted = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
        }
        text = extracted.slice(0, 20000);
      } else if (legacyType === 'file') {
        if (!legacyPayload) {
          return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'base64 payload required' } });
        }
        try {
          const bytes = Buffer.from(legacyPayload, 'base64');
          const name = (body?.name ?? 'upload.bin').toString();
          text = await extractTextFromBytes(name, bytes);
        } catch (e: any) {
          return reply.code(400).send({ error: { code: 'BAD_FILE', message: e?.message || 'unable to decode/parse file' } });
        }
      }
    } else {
      // Lenient shapes:
      // - raw text/plain
      // - { text }
      // - { payload: { text } } or { input: { text } }
      // - { artefact: { kind: 'text', text } }
      // - { url }
      // - { name, contentBase64 }  (optional)
      const picked = pickText(ct, body, rawText);
      if (picked && picked.trim().length > 0) {
        text = picked;
      } else if (typeof body?.url === 'string' && body.url.trim()) {
        const url = body.url.trim();
        const AI_URL = process.env.AI_URL || process.env.NEXT_PUBLIC_AI_URL;
        let extracted = '';
        if (AI_URL) {
          try {
            const r = await fetch(`${AI_URL.replace(/\/+$/, '')}/extract_text`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ url }),
            });
            if (r.ok) {
              const j = await r.json().catch(() => ({}));
              extracted = (j?.text ?? '').toString();
            }
          } catch { /* ignore and fall back */ }
        }
        if (!extracted) {
          const r = await fetch(url);
          const html = await r.text();
          extracted = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
        }
        text = extracted.slice(0, 20000);
      } else if (typeof body?.contentBase64 === 'string' && body.contentBase64) {
        try {
          const name = (body?.name ?? 'upload.bin').toString();
          const bytes = Buffer.from(body.contentBase64, 'base64');
          text = await extractTextFromBytes(name, bytes);
        } catch (e: any) {
          return reply.code(400).send({ error: { code: 'BAD_FILE', message: e?.message || 'unable to decode/parse file' } });
        }
      } else {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'payload text required' } });
      }
    }

    // Guardrails: reject obviously non-learning topics (e.g., everyday objects)
    const isLikelyLearningTopic = (s: string): boolean => {
      const lower = s.toLowerCase().trim();
      if (lower.length < 3) return false;
      // too short or mostly non-letters
      const letters = lower.replace(/[^a-z]/g, '').length;
      if (letters < 3) return false;
      // meta Q&A or brand questions → not a previewable learning topic
      // Allow instructional phrasing like "how to X"
      if (/[?]$/.test(lower) || /\b(why|who|what)\b/.test(lower)) return false;
      if (/\bhow\s+to\b/.test(lower)) return true;
      if (/\bcerply\b/.test(lower)) return false;
      // conversation/control phrases (not topics)
      const controls = [
        "let's go","lets go","go","start","begin","next","proceed","continue","ok","okay","yes","no",
        "thanks","thank you","confirm","generate","do it","let's start","lets start","let us begin"
      ];
      if (controls.some(p => lower === p)) return false;
      // everyday objects or chatter (extendable list)
      const banal = [
        'shoe','shoes','jacket','coat','banana','apple','table','chair','sofa','cup','hello','hi','hey',
        'weather','price','buy','sell','shopping','football team','recipe','lunch','dinner'
      ];
      if (banal.some(w => lower === w || lower.includes(` ${w} `))) return false;
      // whitelist core subjects or patterns
      const subjects = [
        'math','mathematics','algebra','geometry','calculus','statistics','physics','chemistry','biology',
        'computer science','programming','economics','history','german','french','spanish','english',
        'philosophy','law','accounting','finance','astronomy','astrophysics','quantum mechanics','politics'
      ];
      if (subjects.some(k => lower.includes(k))) return true;
      // education keywords
      if (/(gcse|ks3|ks4|ks5|a-level|a level|degree|exam|syllabus|curriculum)/.test(lower)) return true;
      // generic but plausible if has two+ words and not in ban list
      return lower.split(/\s+/).filter(Boolean).length >= 2;
    };

    if (!isLikelyLearningTopic(text)) {
      reply.header('cache-control', 'no-store');
      reply.header('x-api', 'ingest-preview');
      return reply.code(422).send({ error: { code: 'INVALID_TOPIC', message: 'That looks like a question, not a topic to plan. Ask it directly here, or for learning try e.g. "GCSE Maths focus algebra (45 mins)".' } });
    }

    // New logic: choose preview implementation based on brief length
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    let modules: ModuleOutline[] = [];
    let impl = 'v1-outline';
    let diag: any = undefined;
    let planner: 'llm' | 'heuristic' | undefined;
    let modelUsed = '';

    if (wordCount < 120) {
      const intent = analyzeIntent(text);
      const bounds = parseBounds(text);

      // Try LLM planner if enabled; fall back to heuristic
      if (LLM_PLANNER_ENABLED && OPENAI_API_KEY) {
        try {
          const llm = await planModulesLLM(intent);
          modules = llm.modules;
          impl = 'v3-llm';
          planner = 'llm';
          modelUsed = llm.model ?? PLANNER_PRIMARY;
          diag = {
            topic: intent.topic,
            mins: intent.mins,
            isIntro: intent.isIntro,
            focus: intent.focus ?? null,
            count: modules.length,
            planner: 'llm',
            bounds
          };
        } catch (e) {
          (req as any).log?.warn?.({ err: String(e) }, 'LLM planner failed; using heuristic');
          // Hard fail instead of heuristic to avoid templated output
          reply.header('cache-control', 'no-store');
          reply.header('x-api', 'ingest-preview');
          return reply.code(503).send({ error: { code: 'PLANNER_UNAVAILABLE', message: 'Planner unavailable right now. Please try again in a moment.' } });
        }
      } else {
        // Heuristic fallback disabled to avoid templated plans; ask user to refine instead
        reply.header('cache-control', 'no-store');
        reply.header('x-api', 'ingest-preview');
        return reply.code(503).send({
          error: {
            code: 'PLANNER_UNAVAILABLE',
            message: 'I need a little more detail (your goal and focus). Please clarify and I will plan intelligently.',
            details: { reason: 'llm_disabled' }
          }
        });
      }
    } else {
      modules = outlineFromText(text);
      impl = 'v1-outline';
      planner = 'heuristic';
      diag = { count: modules.length, planner: 'heuristic' };
    }

    reply.header('cache-control', 'no-store');
    reply.header('x-api', 'ingest-preview');
    reply.header('x-preview-impl', impl || 'v3-llm');
    if (planner) reply.header('x-planner', planner);
    if (modelUsed) reply.header('x-model', modelUsed);
    const shaped = modules.map((m: any, i: number) => ({
      id: String(m?.id ?? `mod-${String(i + 1).padStart(2,'0')}`),
      title: String(m?.title ?? `Module ${i + 1}`),
      estMinutes: Math.max(5, Math.min(25, Number(m?.estMinutes ?? 10))),
      exampleQuestions: [
        `Explain ${String(m?.title ?? 'this')} in a few sentences.`,
        `Give one example where ${String(m?.title ?? 'this')} applies.`,
      ],
    }));
    (req as any).log?.info?.({ route: '/api/ingest/preview', impl, planner, durationMs: Date.now() - startedAt, reqId: (req as any).id }, 'ingest_preview');
    return reply.send({ modules: shaped });
  } catch (err: any) {
    (req as any).log?.error?.({ err }, 'ingest/preview failed');
    return reply.code(500).send({ error: { code: 'INTERNAL', message: 'preview failed' } });
  }
}

// ---------------------
// Ingest: clarify (per spec)
// ---------------------

// ---------------------
// Ingest: followup (per spec)
// ---------------------


// ---------------------
// /api/items/generate (MVP)
// ---------------------
app.post('/api/items/generate', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req as any).body as {
    chunks?: string[];
    count_objectives?: number;
    items_per_objective?: number;
  };

  const chunks = (body?.chunks ?? []).map(s => String(s)).filter(s => s.trim().length > 0);
  if (chunks.length === 0) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'chunks[] required' } });

  const countObjectives = Math.max(1, Math.min(20, Number(body?.count_objectives ?? 3)));
  const itemsPer = Math.max(1, Math.min(10, Number(body?.items_per_objective ?? 2)));

  const sentences = chunks.flatMap(splitSentences);
  const items: MCQItem[] = [];
  let i = 0;
  for (const s of sentences) {
    items.push(mkItem(s, i++));
    if (items.length >= countObjectives * itemsPer) break;
  }
  // pad with generic stems if not enough sentences
  while (items.length < countObjectives * itemsPer) {
    items.push(mkItem(`Cerply core: adaptive practice focuses on weak areas.`, i++));
  }

  // cost ledger (flagged)
  if (FLAGS.ff_cost_guardrails_v1) {
    const now = new Date().toISOString();
    for (const it of items) {
      _genLedger.push({ itemId: it.id, modelUsed: 'mock:router', costCents: 1, createdAt: now });
    }
  }

  // group into objectives
  const objectives: Objective[] = [];
  for (let oi = 0; oi < countObjectives; oi++) {
    objectives.push({
      id: `obj-${oi + 1}`,
      title: `Objective ${oi + 1}`,
      items: items.slice(oi * itemsPer, (oi + 1) * itemsPer),
    });
  }

  return reply.send({ items, objectives });
});

// ---------------------
// /learn (MVP session)
// ---------------------
const BANK: MCQItem[] = [
  { id: 'd1', stem: "What's Cerply's primary purpose?", options: [
    "Turn complex rules into simple habits (and prove it)",
    "Replace human trainers entirely",
    "Act as a chat/messaging app",
    "Sell hardware devices"
  ], correctIndex: 0 },
  { id: 'd2', stem: "What question format does Cerply mainly use?", options: [
    "Multiple choice","Long essay","Coding tasks","True/False only"
  ], correctIndex: 0 },
  { id: 'd3', stem: "What happens if a learner struggles with a topic?", options: [
    "They get fewer questions on it","They get more targeted practice","Their progress is reset","They are blocked"
  ], correctIndex: 1 },
];
const _sessions = new Map<string, { idx: number }>();

// legacy /learn routes removed in favor of registerLearnRoutes

// ---------------------
// Group 3 — Daily queue & scoring (deterministic MVP)
// ---------------------
type DailyItem = { id: string; moduleId: string; stem: string; options?: string[]; correctIndex?: number; prompt?: string };
const _dailyQueue = new Map<string, DailyItem[]>();

function pickNext(items: DailyItem[]): DailyItem {
  // Deterministic priority: MCQ first, then free, then by id
  const sorted = [...items].sort((a, b) => {
    const aIsMcq = Array.isArray(a.options) && Number.isFinite(a.correctIndex);
    const bIsMcq = Array.isArray(b.options) && Number.isFinite(b.correctIndex);
    if (aIsMcq !== bIsMcq) return aIsMcq ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted[0];
}

app.get('/api/daily/next', async (req: FastifyRequest, reply: FastifyReply) => {
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'daily-next');
  const userId = 'dev';
  let q = _dailyQueue.get(userId);
  if (!q || q.length === 0) {
    // Seed a tiny queue from BANK as a stub
    q = BANK.slice(0, 2).map((it, i) => ({ id: it.id, moduleId: `mod-${i + 1}`, stem: it.stem, options: it.options, correctIndex: it.correctIndex }));
    q.push({ id: 'free-1', moduleId: 'mod-01', stem: 'Explain why spaced repetition helps memory retention.', prompt: 'In 2–3 sentences, explain spaced repetition.' });
    _dailyQueue.set(userId, q);
  }
  const next = pickNext(q);
  return reply.send({ ok: true, item: next });
});

app.post('/api/score', async (req: FastifyRequest, reply: FastifyReply) => {
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'score');
  const body = (req as any).body as { itemId?: string; answerIndex?: number; freeText?: string };
  const userId = 'dev';
  const q = _dailyQueue.get(userId) || [];
  const idx = q.findIndex(x => x.id === body?.itemId);
  if (idx === -1) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Unknown itemId' } });
  const item = q[idx];
  // Remove from queue when answered
  q.splice(idx, 1); _dailyQueue.set(userId, q);

  if (Array.isArray(item.options)) {
    const correct = Number(body?.answerIndex) === item.correctIndex;
    return reply.send({ ok: true, correct, correctIndex: item.correctIndex, rubric: 'Pick the single best answer.' });
  }
  const text = String(body?.freeText || '').trim();
  const correct = /spaced|interval|review|memory/i.test(text);
  return reply.send({ ok: true, correct, rubric: 'Mention spacing/interval/review improves retention.' });
});

// ---------------------
// v2.3 flagged routes
// ---------------------

// Connectors (ff_connectors_basic_v1)
app.post('/import/url', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_connectors_basic_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_connectors_basic_v1 disabled' } });
  const body = (req as any).body as { url?: string; scopeId?: string; template?: string };
  if (!body?.url) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing url' } });
  const chunks = [`[stub] extracted summary from ${body.url}`, `[stub] key points from ${body.url}`];
  return { scopeId: body.scopeId ?? 'demo', template: body.template ?? 'policy', chunks };
});

// Preflight for /import/file
app.options('/import/file', async (_req: FastifyRequest, reply: FastifyReply) => reply.code(204).send());

// Robust file import: accepts text or base64; PDFs/DOCX return a stub chunk
app.post('/import/file', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_connectors_basic_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_connectors_basic_v1 disabled' } });

  const b = ((req as any).body ?? {}) as {
    name?: string;
    content?: string;          // plain text (.txt, .md)
    contentBase64?: string;    // binary (.docx, .pdf) or any base64 text
    mime?: string;
    scopeId?: string;
    template?: string;
  };

  const name = (b.name ?? '').toString().trim();
  const scopeId = (b.scopeId ?? 'demo').toString();
  const template = (b.template ?? 'policy').toString();
  const content = typeof b.content === 'string' ? b.content : '';
  const contentBase64 = typeof b.contentBase64 === 'string' ? b.contentBase64 : '';

  if (!name || (!content && !contentBase64)) {
    (req as any).log?.warn?.({ bodyKeys: Object.keys(b || {}) }, 'import/file missing content');
    return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing name or content' } });
  }

  // Heuristic: treat .pdf/.docx (or PDFs/ZIPs by magic) as binary and skip deep parsing
  const magic = (() => {
    try {
      if (contentBase64) return Buffer.from(contentBase64.slice(0, 16), 'base64').toString('utf8');
    } catch { /* ignore */ }
    return content.slice(0, 4);
  })();
  const isBinary =
    /\.(pdf|docx)$/i.test(name) ||
    magic.startsWith('%PDF') ||
    magic.startsWith('PK');

  try {
    let text = '';
    if (content && content.trim().length > 0) {
      text = content;
    } else if (contentBase64) {
      if (isBinary) {
        const bytes = Buffer.from(contentBase64, 'base64');
        text = await extractTextFromBytes(name, bytes);
      } else {
        text = Buffer.from(contentBase64, 'base64').toString('utf8');
      }
    }

    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Content empty after decoding' } });
    }
    
    const chunks = chunkPlaintext(normalized);
    if (chunks.length === 0) {
      return reply.send({ scopeId, template, chunks: [normalized.slice(0, 500)] });
    }

    return reply.send({ scopeId, template, chunks });
  } catch (e: any) {
    (req as any).log?.error?.({ err: e }, 'import/file failure');
    return reply.code(500).send({ error: { code: 'INTERNAL', message: e?.message || 'import failed' } });
  }
});

app.post('/import/transcript', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_connectors_basic_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_connectors_basic_v1 disabled' } });
  const body = (req as any).body as { content?: string; scopeId?: string; template?: string };
  if (!body?.content) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing content' } });
  const lines = body.content.split(/\n/).map(s => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += 5) chunks.push(lines.slice(i, i + 5).join(' '));
  return { scopeId: body.scopeId ?? 'demo', template: body.template ?? 'podcast', chunks: chunks.slice(0, 10) };
});

// Quality compute (ff_quality_bar_v1)
function approxReadability(text: string): number {
  const words = Math.max(1, text.trim().split(/\s+/).length);
  const sentences = Math.max(1, (text.match(/[.!?]/g) || []).length);
  const vowels = text.replace(/[^aeiouy]/gi, '').length || 1;
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (vowels / words);
  return Math.max(0, Math.min(100, Math.round(score)));
}
function bannedFlags(stem: string): string[] {
  const flags: string[] = [];
  if (/\ball\b|\bnone\b/i.test(stem)) flags.push('all_or_none');
  if (/\bno\b.*\bnot\b/i.test(stem)) flags.push('double_negative');
  return flags;
}
app.post('/curator/quality/compute', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_quality_bar_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_quality_bar_v1 disabled' } });
  const body = (req as any).body as { items: MCQItem[] };
  if (!body?.items?.length) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing items' } });
  const items = body.items.map((it) => {
    const read = approxReadability(it.stem);
    const banned = bannedFlags(it.stem);
    const quality = Math.max(0, Math.min(100, 70 + (read - 60) / 4 - banned.length * 10));
    const out: MCQItemAugmented = { ...it, meta: { readability: read, bannedFlags: banned, qualityScore: Math.round(quality) } };
    return out;
  });
  return { items };
});

// Certified SLA status (ff_certified_sla_status_v1)
app.get('/certified/status', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_certified_sla_status_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_certified_sla_status_v1 disabled' } });
  const q = (req as any).query as { packId?: string };
  const packId = q?.packId ?? 'demo-pack';
  const now = new Date();
  const p: CertifiedPack = _certPacks[packId] ?? {
    id: packId,
    sourceVersion: '2025-08-01',
    lastChangeDetectedAt: new Date(now.getTime() - 9 * 24 * 3600 * 1000).toISOString(),
    publishedUpdateAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
    ttuDays: 7
  };
  _certPacks[packId] = p;
  return p;
});

// Marketplace/Guild ledger summary (ff_marketplace_ledgers_v1)
app.get('/marketplace/ledger/summary', async (_req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_marketplace_ledgers_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_marketplace_ledgers_v1 disabled' } });
  return {
    month: new Date().toISOString().slice(0,7),
    payouts: [
      { role: 'author', percent: 8, amountCents: 12345 },
      { role: 'validator', percent: 2, amountCents: 3086 }
    ]
  };
});

// ---------------------
// Telemetry record endpoint (FS §8.2, §11)
// ---------------------
app.post('/api/analytics/record', async (req: FastifyRequest, reply: FastifyReply) => {
  const event = ((req as any).body ?? {}) as Record<string, any>;
  try {
    await pool.query('insert into artefacts (kind, title, content, created_at) values ($1,$2,$3, now())', [
      'telemetry',
      event?.kind ? String(event.kind) : 'frontend_event',
      JSON.stringify({ ...event, ts: new Date().toISOString() })
    ]);
  } catch {}
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'analytics-record');
  return reply.send({ ok: true });
});

// ---------------------
// Admin-only Cerply Certified workflow stubs (FS §5.3, §9.2)
// ---------------------
function isAdmin(req: FastifyRequest): boolean {
  const allowDev = (process.env.ALLOW_DEV_ADMIN ?? '').toString().toLowerCase();
  const cookie = getSessionCookie(req, COOKIE_NAME);
  const hasSession = typeof cookie === 'string' && cookie.length > 0;
  if ((allowDev === '1' || allowDev === 'true') && hasSession) return true;
  // Optional explicit header for local testing
  const hdr = String((req.headers as any)['x-admin'] || '').toLowerCase();
  return hasSession && (hdr === '1' || hdr === 'true');
}

type CertifiedPlan = { id: string; title: string; estMinutes: number; successCriteria?: string[]; prerequisites?: string[] };
const _certifiedAudit: Array<{ step: string; at: string; payload: any }> = [];

app.post('/api/_legacy_certified/plan', async (req: FastifyRequest, reply: FastifyReply) => {
  const hasSession = hasSessionFromReq(req as any);
  if (!isAdminAllowed(req.headers as any, hasSession)) {
    return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'admin only' } });
  }
  const body = ((req as any).body ?? {}) as { topic?: string };
  const topic = (body?.topic || 'Learning Topic').toString();
  const modules: CertifiedPlan[] = [
    { id: 'mod-01', title: `${topic}: Foundations`, estMinutes: 10, successCriteria: ['Explain key concepts'], prerequisites: [] },
    { id: 'mod-02', title: `${topic}: Core Concepts`, estMinutes: 12, successCriteria: ['Apply basics to examples'] },
  ];
  _certifiedAudit.push({ step: 'plan', at: new Date().toISOString(), payload: { topic, modules, model: 'gpt-5' } });
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'certified-plan');
  reply.header('x-planner', 'llm');
  reply.header('x-model', 'gpt-5');
  return reply.send({ ok: true, modules, auditSize: _certifiedAudit.length });
});

app.post('/api/_legacy_certified/alt-generate', async (req: FastifyRequest, reply: FastifyReply) => {
  const hasSession = hasSessionFromReq(req as any);
  if (!isAdminAllowed(req.headers as any, hasSession)) {
    return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'admin only' } });
  }
  const body = ((req as any).body ?? {}) as { modules?: CertifiedPlan[] };
  const mods = Array.isArray(body?.modules) && body.modules.length ? body.modules : [{ id: 'mod-01', title: 'Foundations', estMinutes: 10 }];
  const items = mods.map((m, i) => ({
    moduleId: m.id,
    title: `${m.title} (Alt)`,
    explanation: `Alternative perspective for ${m.title}.`,
    questions: { mcq: mkItem(`Key point about ${m.title}?`, i), free: { prompt: `Explain ${m.title} differently.` } },
    metadata: { citations: ['[stub] Source A', '[stub] Source B'] }
  }));
  _certifiedAudit.push({ step: 'alt_generate', at: new Date().toISOString(), payload: { count: items.length, model: 'gemini-ultra' } });
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'certified-alt');
  reply.header('x-model', 'gemini-ultra');
  return reply.send({ ok: true, items });
});

app.post('/api/_legacy_certified/review', async (req: FastifyRequest, reply: FastifyReply) => {
  const hasSession = hasSessionFromReq(req as any);
  if (!isAdminAllowed(req.headers as any, hasSession)) {
    return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'admin only' } });
  }
  const body = ((req as any).body ?? {}) as { primary?: any[]; alternative?: any[] };
  const critique = {
    summary: 'Alt version improves clarity; merge key examples; tighten MCQ distractors.',
    changes: [ 'Adopt alternative explanations for Module 1', 'Replace weak distractors in Module 2' ],
    trust: { pitfalls: ['ambiguous distractor'], explainers: ['add concrete example X'], citations: ['[stub] Ref 1'] }
  };
  _certifiedAudit.push({ step: 'review', at: new Date().toISOString(), payload: { critique, model: 'claude-opus' } });
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'certified-review');
  reply.header('x-model', 'claude-opus');
  return reply.send({ ok: true, critique });
});

app.post('/api/_legacy_certified/finalize', async (req: FastifyRequest, reply: FastifyReply) => {
  const hasSession = hasSessionFromReq(req as any);
  if (!isAdminAllowed(req.headers as any, hasSession)) {
    return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'admin only' } });
  }

  const body = ((req as any).body ?? {}) as { modules?: any[]; items?: any[]; notes?: string };
  const packId = `cert-${Date.now().toString(36)}`;

  _certifiedAudit.push({
    step: 'finalize',
    at: new Date().toISOString(),
    payload: {
      packId,
      count: {
        modules: Array.isArray(body.modules) ? body.modules.length : 0,
        items: Array.isArray(body.items) ? body.items.length : 0
      },
      notes: body?.notes ?? null
    }
  });

  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'certified-finalize');
  return reply.send({ ok: true, packId, auditSize: _certifiedAudit.length });
});

// Expert: approve module (admin-only)
app.patch('/api/expert/modules/:id/approve', async (req: FastifyRequest, reply: FastifyReply) => {
  const hasSession = hasSessionFromReq(req as any);
  if (!isAdminAllowed(req.headers as any, hasSession)) {
    return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'admin only' } });
  }

  const { id } = (req.params as { id: string });
  const target = _expertModules[id];
  if (!target) {
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'unknown module' } });
  }
  _certifiedAudit.push({ step: 'approve', at: new Date().toISOString(), payload: { id } });
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'expert-approve');
  return reply.send({ ok: true, id, status: 'approved' });
});

// ---------------------
// Expert Certified endpoints (FS §9.2)
// ---------------------
type ExpertModule = { id: string; title: string; successCriteria?: string[]; prerequisites?: string[]; explainers?: string[]; pitfalls?: string[]; citations?: string[]; status?: 'draft'|'approved' };
const _expertModules: Record<string, ExpertModule> = {};

app.post('/api/expert/modules', async (req: FastifyRequest, reply: FastifyReply) => {
  // Require a session; role could be expanded later
  const cookie = getSessionCookie(req, COOKIE_NAME);
  if (!cookie) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'login required' } });
  const body = ((req as any).body ?? {}) as Partial<ExpertModule>;
  const id = `exp-${Math.random().toString(36).slice(2,8)}`;
  const row: ExpertModule = {
    id,
    title: String(body.title || 'Expert Module'),
    successCriteria: body.successCriteria || [],
    prerequisites: body.prerequisites || [],
    explainers: body.explainers || [],
    pitfalls: body.pitfalls || [],
    citations: body.citations || [],
    status: 'draft'
  };
  _expertModules[id] = row;
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'expert-create');
  return reply.send({ ok: true, id });
});

app.patch('/api/expert/modules/:id', async (req: FastifyRequest, reply: FastifyReply) => {
  const cookie = getSessionCookie(req, COOKIE_NAME);
  if (!cookie) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'login required' } });
  const { id } = (req as any).params as { id: string };
  const body = ((req as any).body ?? {}) as Partial<ExpertModule>;
  const prev = _expertModules[id];
  if (!prev) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'module not found' } });
  const next: ExpertModule = { ...prev, ...body, id };
  _expertModules[id] = next;
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'expert-modules');
  return reply.send({ ok: true, module: next });
});

// NOTE: approval route registered once only; legacy isAdmin()-gated version removed to avoid FST_ERR_DUPLICATED_ROUTE

// Groups & Challenges (ff_group_challenges_v1)
app.post('/groups', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_group_challenges_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_group_challenges_v1 disabled' } });
  const body = (req as any).body as { name?: string };
  if (!body?.name) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing name' } });
  const g: Group = { id: crypto.randomUUID(), name: body.name, createdAt: new Date().toISOString() };
  _groups.push(g);
  return g;
});
app.post('/challenges', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_group_challenges_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_group_challenges_v1 disabled' } });
  const body = (req as any).body as { groupId?: string; packId?: string; windowDays?: number; prizeText?: string };
  if (!body?.groupId || !body?.packId) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing groupId or packId' } });
  const ch: Challenge = { id: crypto.randomUUID(), groupId: body.groupId, packId: body.packId, windowDays: body.windowDays ?? 14, prizeText: body.prizeText, createdAt: new Date().toISOString() };
  _challenges.push(ch);
  return ch;
});
app.get('/challenges/:id/leaderboard', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_group_challenges_v1) return reply.code(501).send({ error: { code: 'FEATURE_DISABLED', message: 'ff_group_challenges_v1 disabled' } });
  const { id } = (req as any).params as { id: string };
  const rows = _attempts.filter(a => a.challengeId === id).sort((a,b) => b.score - a.score).slice(0, 50);
  return { challengeId: id, leaderboard: rows };
});

// ---------------------
  // ---------------------
  // Final global handlers (registered last)
  // ---------------------
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`
      }
    });
  });

  app.setErrorHandler((err, _req, reply) => {
    const status = typeof (err as any)?.statusCode === 'number' ? (err as any).statusCode : 500;
    const code = (typeof (err as any)?.code === 'string' && (err as any).code)
      ? (err as any).code as string
      : (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
    const message = (err as any)?.message || 'Unexpected error';
    reply.code(status).send({ error: { code, message } });
  });

  return app;
}

// Auto-start server only outside tests (can be disabled via FASTIFY_AUTOSTART=false)
if ((process.env.NODE_ENV !== 'test') && ((process.env.FASTIFY_AUTOSTART ?? 'true') !== 'false')) {
  createApp()
    .then(async app => {
      // Ensure /api/version is registered before starting
      try {
        const { registerVersionRoutes } = await import('./routes/version');
        await registerVersionRoutes(app);
      } catch {}

      const address = await app.listen({ port: Number(process.env.PORT ?? 8080), host: process.env.HOST ?? '0.0.0.0' });
      app.log.info({ address }, 'Server listening');
      // --- boot image banner (shows up in Render logs)
      try {
        app.log.info({ tag: process.env.IMAGE_TAG, rev: process.env.IMAGE_REVISION, created: process.env.IMAGE_CREATED }, 'image metadata');
      } catch (e) {
        // noop
      }
      // Augment startup log with runtime channel
      try {
        app.log.info({ tag: process.env.IMAGE_TAG, rev: process.env.IMAGE_REVISION, created: process.env.IMAGE_CREATED, runtimeChannel: (process.env.RUNTIME_CHANNEL || undefined) }, `Server listening at ${address}`);
      } catch {}
    })
    .catch(err => { console.error('fastify_boot_error', err); process.exit(1); });
}

export default createApp;
