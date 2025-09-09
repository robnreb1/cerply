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
import type { FastifyRequest, FastifyReply } from 'fastify';


// Run everything inside an async IIFE so we can use await at top-level safely
(async () => {

  // --- App bootstrap ---
const app = Fastify({ logger: true });
// ---- debug route collection ----
type RouteRow = { method: string; url: string };
const __ROUTES: RouteRow[] = [];
app.addHook('onRoute', (route) => {
  const method = Array.isArray(route.method) ? route.method.join(',') : String(route.method);
  __ROUTES.push({ method, url: route.url });
});
await app.register(cors, {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://stg.cerply.com',
    // Note: *.vercel.app wildcards not supported - add specific preview domains as needed
    'https://cerply-web.vercel.app',
    'https://cerply.com',
    'https://www.cerply.com',
    'https://cerply.co.uk',
    'https://www.cerply.co.uk'
  ],
  credentials: true
});
await app.register(fastifyCookie);



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
app.get('/api/health', async () => {
  return { ok: true, env: process.env.NODE_ENV ?? 'unknown' };
});

app.get('/health', async () => {
  return { ok: true, note: 'prefer /api/health' };
});

app.get('/flags', async () => ({ flags: FLAGS }));

// --- Test endpoint ---
app.get('/test', async () => ({ message: 'test endpoint working' }));

app.get('/api/analytics/pilot', async () => {
  return {
    completion21d: 0.67,
    spacedCoverage: 0.45,
    lift: { d7: 0.23, d30: 0.41 }
  };
});

// ---------------------
// Auth (per spec)
// ---------------------
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'cerply_session';
const isProd = process.env.NODE_ENV === 'production';

app.post('/api/auth/login', async (req, reply) => {
  const { email } = ((req as any).body ?? {}) as { email?: string };
  if (!email || typeof email !== 'string') {
    return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'missing email' } });
  }
  const token = Buffer.from(`${email}:${Date.now()}`).toString('base64url');
  const next = `/api/auth/callback?token=${token}`;
  return reply.send({ ok: true, dev: true, next });
});

app.get('/api/auth/callback', async (req, reply) => {
  const q = (req as any).query as { token?: string; redirect?: string };
  const token = q?.token;
  if (!token) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'missing token' } });
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  const target = q?.redirect && /^https?:\/\//i.test(q.redirect) ? q.redirect : 'http://localhost:3000/';
  return reply.redirect(302, target);
});

app.get('/api/auth/me', async (req, reply) => {
  const cookie = (req as any).cookies?.[COOKIE_NAME];
  if (!cookie) return reply.code(401).send({ ok: false, user: null });
  return reply.send({ ok: true, user: { id: 'dev', email: 'dev@local' } });
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
  let topic = raw.split(/[.,\n]/)[0].trim() || 'Learning Topic';
  const bigMap: Record<string, string> = {
    astrophysics: 'Astrophysics',
    'quantum mechanics': 'Quantum Mechanics',
    mathematics: 'Mathematics',
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
const LLM_PLANNER_ENABLED = (() => {
  const v = (process.env.LLM_PREVIEW ?? process.env.LLM_PLANNER ?? '').toString().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
})();
const LLM_MODEL = (process.env.LLM_PLANNER_MODEL ?? 'gpt-4o-mini').toString();
const LLM_PROVIDER = (process.env.LLM_PLANNER_PROVIDER ?? 'openai').toString().toLowerCase();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';

type LlmPlan = { modules: ModuleOutline[]; raw?: any; model?: string };

async function planModulesLLM(intent: { topic: string; mins: number; isIntro: boolean; focus?: string }): Promise<LlmPlan> {
  if (!LLM_PLANNER_ENABLED) throw new Error('LLM planner disabled by env');
  if (LLM_PROVIDER !== 'openai') throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const sys = [
    'You are a curriculum planner who breaks a user brief into a small set of logical learning modules for a first session.',
    'Return STRICT JSON with shape: { "modules": [ { "id": "mod-01", "title": "string", "estMinutes": number }, ... ] }',
    'Choose 2–6 modules based on the time budget (per-module 5–25 minutes).',
    'Titles must be specific to the topic/focus (avoid generic words like "About").',
    'If a focus is given, include one module for it.',
    'Do NOT include explanations; only module metadata.',
  ].join(' ');

  const u = JSON.stringify({
    topic: intent.topic,
    timeBudgetMinutes: intent.mins,
    isIntro: intent.isIntro,
    focus: intent.focus ?? null
  });

  const body = {
    model: LLM_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: `User brief JSON:\n${u}` }
    ]
  };

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`OpenAI HTTP ${r.status}: ${errText.slice(0, 200)}`);
  }

  const data = await r.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content ?? '';
  let parsed: any = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('LLM did not return valid JSON');
  }
  const mods: ModuleOutline[] = Array.isArray(parsed?.modules)
    ? parsed.modules.map((m: any, i: number) => ({
        id: typeof m?.id === 'string' ? m.id : `mod-${String(i + 1).padStart(2, '0')}`,
        title: String(m?.title ?? `Module ${i + 1}`),
        estMinutes: Math.max(5, Math.min(25, Number(m?.estMinutes ?? 10)))
      }))
    : [];

  if (mods.length === 0) throw new Error('LLM returned empty modules');

  return { modules: mods.slice(0, 6), raw: parsed, model: LLM_MODEL };
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

// JSON route table (based on onRoute hook)
app.get('/__routes.json', async (_req, reply) => {
  reply.type('application/json').send({ routes: __ROUTES, ts: new Date().toISOString() });
});

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

    reply.header('cache-control', 'no-store');
    reply.header('x-api', 'ingest-parse');
    return reply.send({
      ok: true,
      parsed: { kind, text },
      bytes: Buffer.byteLength(text, 'utf8'),
      ts: new Date().toISOString(),
    });
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
  try {
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
      return reply.code(422).send({ error: { code: 'INVALID_TOPIC', message: 'That does not look like a learnable topic. Try a subject and focus, e.g., "GCSE Maths focus algebra" or "German speaking for travel".' } });
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
          modelUsed = llm.model ?? LLM_MODEL;
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
          modules = proposeModules(intent.topic, intent.mins, intent.isIntro, intent.focus);
          impl = 'v2-multi';
          planner = 'heuristic';
          diag = {
            topic: intent.topic,
            mins: intent.mins,
            isIntro: intent.isIntro,
            focus: intent.focus ?? null,
            count: modules.length,
            planner: 'heuristic',
            reason: 'llm_failed'
          };
        }
      } else {
        modules = proposeModules(intent.topic, intent.mins, intent.isIntro, intent.focus);
        impl = 'v2-multi';
        planner = 'heuristic';
        diag = {
          topic: intent.topic,
          mins: intent.mins,
          isIntro: intent.isIntro,
          focus: intent.focus ?? null,
          count: modules.length,
          planner: 'heuristic',
          reason: 'llm_disabled',
          bounds
        };
      }
    } else {
      modules = outlineFromText(text);
      impl = 'v1-outline';
      planner = 'heuristic';
      diag = { count: modules.length, planner: 'heuristic' };
    }

    reply.header('cache-control', 'no-store');
    reply.header('x-api', 'ingest-preview');
    reply.header('x-preview-impl', impl);
    if (planner) reply.header('x-planner', planner);
    if (modelUsed) reply.header('x-model', modelUsed);
    return reply.send(diag ? { ok: true, modules, diagnostics: diag } : { ok: true, modules });
  } catch (err: any) {
    (req as any).log?.error?.({ err }, 'ingest/preview failed');
    return reply.code(500).send({ error: { code: 'INTERNAL', message: 'preview failed' } });
  }
}

// Register preview on both URLs
app.post('/api/ingest/preview', handleIngestPreview);
app.post('/ingest/preview', handleIngestPreview);

// ---------------------
// Ingest: clarify (per spec)
// ---------------------
app.post('/api/ingest/clarify', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = ((req as any).body ?? {}) as { text?: string };
  const input = (body.text ?? '').toString();
  const lower = input.toLowerCase();
  const chips: string[] = [];
  let question = 'Before I plan, which exam board and level applies?';

  if (/gcse|a-level|a level|ks3|ks4|ks5/.test(lower)) {
    if (/gcse|ks4/.test(lower)) chips.push('Level: GCSE');
    if (/a-level|a level|ks5/.test(lower)) chips.push('Level: A-Level');
    if (/ks3/.test(lower)) chips.push('Level: KS3');
    if (!/(aqa|edexcel|ocr)/.test(lower)) chips.push('Board: AQA', 'Board: Edexcel', 'Board: OCR');
  } else if (/german|french|spanish|maths|physics|chemistry|biology|computer science/.test(lower)) {
    chips.push('Beginner', 'Intermediate', 'Advanced');
  }

  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'ingest-clarify');
  return reply.send({ question, chips });
});

// ---------------------
// Ingest: followup (per spec)
// ---------------------
app.post('/api/ingest/followup', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = ((req as any).body ?? {}) as {
    message?: string;
    modules?: { id: string; title: string; estMinutes?: number }[];
  };
  const message = (body.message ?? '').toString();
  const modules = Array.isArray(body.modules) ? body.modules : [];
  const lower = message.toLowerCase();

  // add/include → updated-plan
  const addMatch = lower.match(/(?:add|include)\s+(.+?)(?:\.|$)/);
  if (addMatch && modules.length) {
    const title = `Focus: ${addMatch[1].trim()}`;
    const exists = modules.some(m => m.title.toLowerCase() === title.toLowerCase());
    const updated = exists ? modules : [...modules, { id: `mod-${String(modules.length + 1).padStart(2, '0')}`, title, estMinutes: 10 }];
    reply.header('cache-control', 'no-store');
    reply.header('x-api', 'ingest-followup');
    return reply.send({ action: 'updated-plan', modules: updated });
  }

  // generate/create items → generated-items
  if (/(generate|create).*(items|lesson|questions)/.test(lower) && modules.length) {
    const items = modules.map((m, i) => ({
      moduleId: m.id,
      title: m.title,
      explanation: `Overview of "${m.title}"`,
      questions: { mcq: mkItem(`Which statement best captures "${m.title}"?`, i), free: { prompt: `In 2–3 sentences, explain "${m.title}" to a colleague.` } }
    }));
    reply.header('cache-control', 'no-store');
    reply.header('x-api', 'ingest-followup');
    return reply.send({ action: 'generated-items', items });
  }

  // default → refine
  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'ingest-followup');
  return reply.send({ action: 'refine', brief: message, message });
});

app.post('/api/ingest/generate', async (req: FastifyRequest, reply: FastifyReply) => {
  // Auth gate (spec): require session when REQUIRE_AUTH_FOR_GENERATE is set
  const REQUIRE = (process.env.REQUIRE_AUTH_FOR_GENERATE ?? '').toString();
  const mustAuth = REQUIRE === '1' || REQUIRE.toLowerCase() === 'true';
  if (mustAuth) {
    const cookie = (req as any).cookies?.[COOKIE_NAME];
    if (!cookie) {
      reply.header('www-authenticate', 'Session realm="cerply"');
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Login required to generate items' } });
    }
  }
  const b = ((req as any).body ?? {}) as { modules?: { id: string; title: string; estMinutes?: number }[] };
  const mods = Array.isArray(b.modules) ? b.modules : [];
  if (mods.length === 0) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'modules[] required' } });

  // Produce simple drafts per module: explanation + one MCQ + one free-form prompt
  const items = mods.map((m, i) => {
    const expl = `Overview of "${m.title}". Key takeaways are summarized in plain language to build intuition before testing.`;
    const mcq = mkItem(`Which statement best captures "${m.title}"?`, i);
    const free = { prompt: `In 2–3 sentences, explain "${m.title}" to a colleague.` };
    return { moduleId: m.id, title: m.title, explanation: expl, questions: { mcq, free } };
  });

  // Optional lightweight generation ledger
  if (FLAGS.ff_cost_guardrails_v1) {
    const now = new Date().toISOString();
    for (const row of items) {
      _genLedger.push({ itemId: row.questions.mcq.id, modelUsed: 'mock:router', costCents: 1, createdAt: now });
    }
  }

  reply.header('cache-control', 'no-store');
  reply.header('x-api', 'ingest-generate');
  return reply.send({ ok: true, items });
});

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

app.post('/learn/next', async (req: FastifyRequest, reply: FastifyReply) => {
  const sessionId = (req as any).body?.sessionId as string | undefined;
  let sid = sessionId;
  if (!sid || !_sessions.has(sid)) {
    sid = crypto.randomUUID();
    _sessions.set(sid, { idx: 0 });
  }
  const s = _sessions.get(sid)!;
  const item = BANK[s.idx % BANK.length];
  s.idx++;
  return reply.send({ sessionId: sid, item });
});

app.post('/learn/submit', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req as any).body as { sessionId?: string; itemId?: string; answerIndex?: number };
  if (!body?.sessionId || !_sessions.has(body.sessionId)) {
    return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Unknown sessionId' } });
  }
  const item = BANK.find(i => i.id === body.itemId);
  if (!item) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Unknown itemId' } });
  const correct = Number(body.answerIndex) === item.correctIndex;
  return reply.send({ correct, correctIndex: item.correctIndex, explainer: correct ? 'Nice! You chose the best answer.' : 'Review the stem and options; focus on the key concept.' });
});

// ---------------------
// v2.3 flagged routes
// ---------------------

// Connectors (ff_connectors_basic_v1)
app.post('/import/url', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_connectors_basic_v1) return reply.code(501).send({ error: 'ff_connectors_basic_v1 disabled' });
  const body = (req as any).body as { url?: string; scopeId?: string; template?: string };
  if (!body?.url) return reply.code(400).send({ error: 'Missing url' });
  const chunks = [`[stub] extracted summary from ${body.url}`, `[stub] key points from ${body.url}`];
  return { scopeId: body.scopeId ?? 'demo', template: body.template ?? 'policy', chunks };
});

// Preflight for /import/file
app.options('/import/file', async (_req: FastifyRequest, reply: FastifyReply) => reply.code(204).send());

// Robust file import: accepts text or base64; PDFs/DOCX return a stub chunk
app.post('/import/file', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_connectors_basic_v1) return reply.code(501).send({ error: 'ff_connectors_basic_v1 disabled' });

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
    return reply.code(400).send({ error: 'Missing name or content' });
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
      return reply.code(400).send({ error: 'Content empty after decoding' });
    }
    
    const chunks = chunkPlaintext(normalized);
    if (chunks.length === 0) {
      return reply.send({ scopeId, template, chunks: [normalized.slice(0, 500)] });
    }

    return reply.send({ scopeId, template, chunks });
  } catch (e: any) {
    (req as any).log?.error?.({ err: e }, 'import/file failure');
    return reply.code(500).send({ error: e?.message || 'import failed' });
  }
});

app.post('/import/transcript', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_connectors_basic_v1) return reply.code(501).send({ error: 'ff_connectors_basic_v1 disabled' });
  const body = (req as any).body as { content?: string; scopeId?: string; template?: string };
  if (!body?.content) return reply.code(400).send({ error: 'Missing content' });
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
  if (!FLAGS.ff_quality_bar_v1) return reply.code(501).send({ error: 'ff_quality_bar_v1 disabled' });
  const body = (req as any).body as { items: MCQItem[] };
  if (!body?.items?.length) return reply.code(400).send({ error: 'Missing items' });
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
  if (!FLAGS.ff_certified_sla_status_v1) return reply.code(501).send({ error: 'ff_certified_sla_status_v1 disabled' });
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
  if (!FLAGS.ff_marketplace_ledgers_v1) return reply.code(501).send({ error: 'ff_marketplace_ledgers_v1 disabled' });
  return {
    month: new Date().toISOString().slice(0,7),
    payouts: [
      { role: 'author', percent: 8, amountCents: 12345 },
      { role: 'validator', percent: 2, amountCents: 3086 }
    ]
  };
});

// Groups & Challenges (ff_group_challenges_v1)
app.post('/groups', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_group_challenges_v1) return reply.code(501).send({ error: 'ff_group_challenges_v1 disabled' });
  const body = (req as any).body as { name?: string };
  if (!body?.name) return reply.code(400).send({ error: 'Missing name' });
  const g: Group = { id: crypto.randomUUID(), name: body.name, createdAt: new Date().toISOString() };
  _groups.push(g);
  return g;
});
app.post('/challenges', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_group_challenges_v1) return reply.code(501).send({ error: 'ff_group_challenges_v1 disabled' });
  const body = (req as any).body as { groupId?: string; packId?: string; windowDays?: number; prizeText?: string };
  if (!body?.groupId || !body?.packId) return reply.code(400).send({ error: 'Missing groupId or packId' });
  const ch: Challenge = { id: crypto.randomUUID(), groupId: body.groupId, packId: body.packId, windowDays: body.windowDays ?? 14, prizeText: body.prizeText, createdAt: new Date().toISOString() };
  _challenges.push(ch);
  return ch;
});
app.get('/challenges/:id/leaderboard', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!FLAGS.ff_group_challenges_v1) return reply.code(501).send({ error: 'ff_group_challenges_v1 disabled' });
  const { id } = (req as any).params as { id: string };
  const rows = _attempts.filter(a => a.challengeId === id).sort((a,b) => b.score - a.score).slice(0, 50);
  return { challengeId: id, leaderboard: rows };
});

// ---------------------
// Listen
// ---------------------
const port = Number(process.env.PORT ?? 8080);

// Ensure all routes are registered and (if available) print them
await app.ready();
if ((app as any).printRoutes) {
  try {
    console.log('[api] routes:\n' + (app as any).printRoutes());
  } catch (e) {
    console.log('[api] routes: printRoutes() threw:', e);
  }
} else {
  console.log('[api] routes: (printRoutes unavailable)');
}

await app.listen({ host: '0.0.0.0', port });
console.log(`[api] listening on http://0.0.0.0:${port}`);
})();