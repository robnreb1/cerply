// --- Minimal .env loader (loads .env.local then .env if present) ---
import fs from "node:fs";
import path from "node:path";
import { fetch as undiciFetch } from 'undici';
const fetch = globalThis.fetch ?? undiciFetch;

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
import cors from '@fastify/cors';
import crypto from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import authRoutes from './routes/auth';
import { query as dbQuery, single as dbSingle } from './db';



// Run everything inside an async IIFE so we can use await at top-level safely
(async () => {

  // --- App bootstrap ---
const app = Fastify({ logger: true });
app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret',
});
app.register(authRoutes, { prefix: '/api/auth' });
// ---- debug route collection ----
type RouteRow = { method: string; url: string };
const __ROUTES: RouteRow[] = [];
app.addHook('onRoute', (route: any) => {
  const method = Array.isArray(route.method) ? route.method.join(',') : String(route.method);
  __ROUTES.push({ method, url: route.url });
});
await app.register(cors, {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://stg.cerply.com',
    // Note: *.vercel.app wildcards not supported - add specific preview domains as needed
    'https://cerply-web.vercel.app'
  ],
  credentials: true
});



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

  ff_research_v1: process.env.FF_RESEARCH_V1 === 'true',
  ff_materials_kb_v1: process.env.FF_MATERIALS_KB_V1 === 'true',
  ff_certified_paywall_v1: process.env.FF_CERTIFIED_PAYWALL_V1 === 'true',
};
const HAS_DB = Boolean(process.env.DATABASE_URL);
// --- Auth gating flag for module generation ---
const REQUIRE_AUTH_FOR_GENERATE = ['1','true','yes','on'].includes((process.env.REQUIRE_AUTH_FOR_GENERATE ?? '0').toString().toLowerCase());

// Health endpoints
app.get('/api/health', async () => {
  return { ok: true, env: process.env.NODE_ENV ?? 'unknown' };
});

app.get('/health', async () => {
  return { ok: true, note: 'prefer /api/health' };
});

app.get('/flags', async () => ({ flags: FLAGS }));

// Initialize DB tables when a DATABASE_URL is configured
if (HAS_DB) {
  await dbQuery(`
    create table if not exists materials_kb (
      key text primary key,
      modules jsonb not null,
      sources jsonb,
      certified boolean default false,
      certified_by text,
      certified_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists users_pii (
      token_hash text primary key,
      email text,
      name text,
      region text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists learner_state (
      token text primary key,
      strengths jsonb not null default '[]',
      weaknesses jsonb not null default '[]',
      last_plan jsonb,
      last_updated timestamptz not null default now()
    );
  `);
  await dbQuery(`alter table if exists learner_state add column if not exists ratings jsonb not null default '[]';`);
  await dbQuery(`alter table if exists materials_kb add column if not exists rating_sum integer not null default 0;`);
  await dbQuery(`alter table if exists materials_kb add column if not exists rating_count integer not null default 0;`);
  await dbQuery(`
    create table if not exists challenges (
      id bigserial primary key,
      token_hash text,
      message text,
      context jsonb,
      created_at timestamptz not null default now()
    );
  `);
}

// --- Test endpoint ---
app.get('/test', async () => ({ message: 'test endpoint working' }));

app.get('/api/analytics/pilot', async () => {
  return {
    completion21d: 0.67,
    spacedCoverage: 0.45,
    lift: { d7: 0.23, d30: 0.41 }
  };
});

// --- Clarify & Followup (v2.5 — AI-first, no loops) ---
const __v25_LLM_PREVIEW = (process.env.LLM_PREVIEW ?? '').toString().toLowerCase();
const __v25_LLM_ON = ['1','true','yes','on'].includes(__v25_LLM_PREVIEW);
const __v25_OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const __v25_LLM_PLANNER_MODEL = process.env.LLM_PLANNER_MODEL || 'gpt-4o-mini';

function __v25_asciiOnly(s: string): string { return (s || '').replace(/[\x00-\x1F\x7F-\uFFFF]/g, ''); }
function __v25_looksLikeProxyUse(s: string): boolean {
  const t = (s || '').toLowerCase();
  return /\b(write my|solve this|do my|finish my|debug my|answer my (exam|test)|bypass)\b/.test(t);
}
function __v25_topicLanguageFilter(s: string): { ok: boolean; reason?: string } {
  const t = (s || '').toLowerCase();
  const banned = [
    /\b(ns\fw|slur)\b/,                 // placeholder; replace with real list later
    /\bviolence(?:\s+extreme)?\b/,
  ];
  for (const r of banned) if (r.test(t)) return { ok: false, reason: 'content_filtered' };
  return { ok: true };
}
async function __v25_openaiJson<T>(args: { system: string; user: string; schemaHint: string; }): Promise<T | null> {
  if (!__v25_LLM_ON || !__v25_OPENAI_API_KEY) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${__v25_OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: __v25_LLM_PLANNER_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: __v25_asciiOnly(args.system) },
          { role: 'user', content: __v25_asciiOnly(`${args.user}\n\nReturn ONLY JSON that matches:\n${args.schemaHint}`) },
        ],
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const text: string | undefined = j?.choices?.[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch { return null; }
}

function __v25_vendorFrom(text: string): string | null {
  const m = /\b(aqa(?:\s+(?:higher|foundation))?|edexcel|ocr|cie|ocr cambridge)\b/i.exec(text || '');
  return m ? m[1].toUpperCase() : null;
}
function __v25_detectCurriculum(text: string): { stage: 'ks3'|'ks4'|'ks5'|'gcse'|'alevel'|null; subject: string|null } {
  const lower = (text || '').toLowerCase();
  const subjectMap: Record<string,string> = {
    maths: 'Mathematics', math: 'Mathematics', mathematics: 'Mathematics',
    physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology',
    english: 'English', history: 'History', geography: 'Geography',
    science: 'Science'
  };
  let subject: string|null = null;
  for (const k of Object.keys(subjectMap)) if (lower.includes(k)) { subject = subjectMap[k]; break; }
  let stage: 'ks3'|'ks4'|'ks5'|'gcse'|'alevel'|null = null;
  if (/\bks\s*3|key\s*stage\s*3\b/.test(lower)) stage = 'ks3';
  else if (/\bks\s*4|key\s*stage\s*4\b/.test(lower)) stage = 'ks4';
  else if (/\bks\s*5|key\s*stage\s*5\b/.test(lower)) stage = 'ks5';
  else if (/\bgcse\b/.test(lower)) stage = 'gcse';
  else if (/\b(a[-\s]?level|alevel|advanced level)\b/.test(lower)) stage = 'alevel';
  return { stage, subject };
}
function __v25_clarifyHeuristic(text: string) {
  // Detect if the user likely wants to learn from proprietary/internal material
  const looksLikeUpload = /\b(upload|attach|transcript|meeting notes?|minutes|recording|slides?|pdf|docx|pptx?|policy|handbook|internal|proprietary|my\s+notes?)\b/i.test(text || '');
  const cur = __v25_detectCurriculum(text);
  const v = __v25_vendorFrom(text);
  const chips = [
    ...(looksLikeUpload
      ? ['Upload a file', 'Paste text', 'Use a URL']
      : [
          'Baseline me first',
          'Skip grammar, focus vocab',
          'Exam strategy focus',
          'Daily 10-min drills',
          'Include audio practice',
          v ? `Keep ${v}` : 'AQA Higher',
        ]),
  ].slice(0, 6);
  const question = looksLikeUpload
    ? 'Do you want to upload a file or paste text to learn from your materials?'
    : (cur.stage && cur.subject)
      ? `Okay — I can pull the ${cur.stage.toUpperCase()} ${cur.subject} coverage. What’s your current level: Foundation, Intermediate, or Advanced?`
      : v
        ? `Great — ${v}. What’s your target grade or exam date?`
        : 'Which syllabus/level is this (e.g., AQA Higher vs Edexcel)?';
  return { question, chips };
}
function __v25_appendHeuristic(plan: { id: string; title: string }[] | undefined, message: string) {
  const title = (message || '').replace(/^(please\s*)?(add|include)\s*/i, '').trim() || 'Additional topic';
  return [ ...(plan ?? []), { id: `mod-${Date.now()}` , title } ];
}
function __v25_removeHeuristic(plan: { id: string; title: string }[] | undefined, message: string) {
  const needle = (message || '').replace(/^(please\s*)?(remove|drop|exclude)\s*/i, '').trim().toLowerCase();
  if (!needle) return plan ?? [];
  return (plan ?? []).filter(m => !m.title.toLowerCase().includes(needle));
}
function __v25_withTiming(handler: any, name: string) {
  return async (req: any, reply: any) => {
    const t0 = Date.now();
    try {
      const out = await handler(req, reply);
      req?.log?.info?.({ route: name, ms: Date.now() - t0 }, 'latency');
      return out;
    } catch (e) {
      req?.log?.error?.({ route: name, ms: Date.now() - t0, err: e }, 'error');
      throw e;
    }
  };
}

// Clarify: one sharp question + 3–6 chips
app.post('/api/ingest/clarify', __v25_withTiming(async (req: any, reply: any) => {
  const k = tokenHashFromReq(req);
  if (!allowRequestNow(k)) return reply.code(429).send({ error: { code: 'RATE_LIMIT', message: 'Too many requests' } });
  const { text } = (req.body ?? {}) as { text?: string };
  const t = (text ?? '').trim();
  if (!t) return reply.code(400).send({ ok: false, error: 'Missing text' });
  if (__v25_looksLikeProxyUse(t)) return reply.code(400).send({ ok: false, error: 'Declined: proxy-style request' });
  const filter = __v25_topicLanguageFilter(t);
  if (!filter.ok) return reply.code(400).send({ error: { code: 'FILTERED', message: 'Topic/language not allowed' } });

  let result = __v25_clarifyHeuristic(t);
  const __cur0 = __v25_detectCurriculum(t);
  const __looksUpload0 = /\b(upload|attach|transcript|meeting notes?|minutes|recording|slides?|pdf|docx|pptx?|policy|handbook|internal|proprietary|my\s+notes?)\b/i.test(t);
  if (!__looksUpload0 && !(__cur0.stage && __cur0.subject)) {
    const llm = await __v25_openaiJson<{ question: string; chips: string[] }>({
      system: 'Ask ONE concise clarifier about scope/level/timeline/resources (not a quiz). Propose 3–6 short chips. ASCII only.',
      user: `Brief: ${t}`,
      schemaHint: `{"question":"string","chips":["string"]}`,
    });
    if (llm?.question && Array.isArray(llm?.chips) && llm.chips.length >= 3) {
      result = {
        question: __v25_asciiOnly(llm.question.slice(0, 240)),
        chips: llm.chips.slice(0, 6).map(c => __v25_asciiOnly(c.slice(0, 60))),
      };
    }
  }
  reply.header('cache-control', 'no-store').header('x-api', 'ingest-clarify');
  return reply.send({ ok: true, ...result });
}, 'ingest_clarify'));

// Followup: append / revise / hint (no loops)
app.post('/api/ingest/followup', __v25_withTiming(async (req: any, reply: any) => {
  const { brief, plan, message } = (req.body ?? {}) as { brief?: string; plan?: { id: string; title: string }[]; message?: string };
  const msg = (message ?? '').trim();
  if (!msg) return reply.code(400).send({ ok: false, error: 'Missing message' });
  if (__v25_looksLikeProxyUse(msg)) return reply.code(400).send({ ok: false, error: 'Declined: proxy-style request' });

  if (/^(please\s*)?(add|include)\b/i.test(msg)) {
    const next = __v25_appendHeuristic(plan, msg);
    return reply.header('cache-control','no-store').header('x-api','ingest-followup').send({ ok: true, action: 'append', modules: next });
  }
  if (/^(please\s*)?(remove|drop|exclude)\b/i.test(msg)) {
    const next = __v25_removeHeuristic(plan, msg);
    return reply.header('cache-control','no-store').header('x-api','ingest-followup').send({ ok: true, action: 'revise', modules: next });
  }

  const llm = await __v25_openaiJson<{ action: 'append'|'revise'|'hint'; modules?: { id: string; title: string }[]; text?: string }>({
    system: 'Update a learning plan from followups. Respond with action append/revise/hint. ASCII only.',
    user: `Brief: ${brief ?? ''}\nCurrentPlan: ${JSON.stringify(plan ?? [])}\nMessage: ${msg}`,
    schemaHint: `{"action":"append|revise|hint","modules":[{"id":"string","title":"string"}],"text":"string"}`,
  });

  if (llm?.action === 'append' && Array.isArray(llm.modules)) {
    return reply.header('cache-control','no-store').header('x-api','ingest-followup').send({ ok: true, action: 'append', modules: llm.modules });
  }
  if (llm?.action === 'revise' && Array.isArray(llm.modules)) {
    return reply.header('cache-control','no-store').header('x-api','ingest-followup').send({ ok: true, action: 'revise', modules: llm.modules });
  }
  const hint = llm?.text || 'Tell me what changed: scope, level, or assessment style?';
  return reply.header('cache-control','no-store').header('x-api','ingest-followup').send({ ok: true, action: 'hint', text: __v25_asciiOnly(hint.slice(0, 280)) });
}, 'ingest_followup'));

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

// --- Materials KB (in-memory MVP) ---
type KbRecord = {
  key: string;
  modules: ModuleOutline[];
  sources?: string[];
  certified?: boolean;
  certifiedBy?: string;
  certifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

// --- Simple in-memory stores (MVP) ---
const _genLedger: GenLedger[] = [];
const _groups: Group[] = [];
const _challenges: Challenge[] = [];
const _attempts: ChallengeAttempt[] = [];
const _certPacks: Record<string, CertifiedPack> = {};
const _kb: Map<string, KbRecord> = new Map();

// ---------------------
// Helpers
// ---------------------
function isAuthed(req: FastifyRequest): boolean {
  const h = req.headers as any;
  const bearer = String(h['authorization'] ?? '').trim();
  const uid = String(h['x-user-id'] ?? '').trim();
  const cookie = String(h['cookie'] ?? '').trim();
  const hasCookie = /(?:^|;\s*)cerply_(?:auth|session)=/.test(cookie);
  return (bearer.startsWith('Bearer ') && bearer.length > 7) || uid.length > 0 || hasCookie;
}

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

// Parse simple time bounds from free text (e.g., "by end of March", "by 2026-03-31")
function parseBound(text: string): { deadlineISO?: string; weeks?: number } {
  const lower = (text || '').toLowerCase();
  const now = new Date();
  // ISO-like
  const iso = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  let deadline: Date | null = null;
  if (iso) {
    const d = new Date(iso[1]);
    if (!isNaN(d.getTime())) deadline = d;
  }
  // Month name patterns ("by end of March", "by March 15")
  if (!deadline) {
    const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    for (let mi = 0; mi < months.length; mi++) {
      const mname = months[mi];
      const reEnd = new RegExp(`by\\s+(?:end\\s+of\\s+)?${mname}(?:\\s+(20\\d{2}))?`);
      const reMid = new RegExp(`by\\s+${mname}\\s+(\n?\r?)(\n?)`);
      const m = lower.match(reEnd);
      if (m) {
        const year = m[1] ? Number(m[1]) : now.getFullYear();
        // choose last day of month
        const d = new Date(Date.UTC(year, mi + 1, 0));
        deadline = d; break;
      }
    }
  }
  if (!deadline) return {};
  const ms = Math.max(0, deadline.getTime() - now.getTime());
  const weeks = Math.max(1, Math.ceil(ms / (7 * 24 * 3600 * 1000)));
  return { deadlineISO: deadline.toISOString(), weeks };
}

/**
 * Propose logically grouped modules (not time-boxed).
 * Titles avoid generic words and aim to be specific and useful.
 */
function proposeModules(topic: string, _mins: number, isIntro: boolean, focus?: string): ModuleOutline[] {
  // choose module count from topic heaviness and intro flag (3–6)
  const heavy = ['Astrophysics','Quantum Mechanics','Mathematics','Biology','Computer Science','Physics','Economics','Regulation','Chemistry','History'];
  let n = heavy.includes(topic) ? (isIntro ? 3 : 5) : (isIntro ? 3 : 4);
  n = clamp(n, 3, 6);

  const titles: string[] = [];

  // Optional fundamentals if intro
  if (isIntro) titles.push(`${topic} essentials`);

  // Focus gets a dedicated slot if provided
  if (focus) titles.push(`Deep dive: ${focus}`);

  // Core knowledge, methods, examples, pitfalls, frontiers
  titles.push(`Key ideas in ${topic}`);
  titles.push(`${topic} methods & tools`);
  titles.push(`${topic} in practice (cases)`);
  titles.push(`Common pitfalls & misconceptions`);
  titles.push(`Debates & frontier topics in ${topic}`);

  // normalise: title case with British English vibe and remove trailing punctuation
  const seen = new Set<string>();
  const picked = titles
    .map(t => t.replace(/[.?!]+$/,''))
    .filter(t => (seen.has(t) ? false : (seen.add(t), true)))
    .slice(0, n);

  // estMinutes is optional; provide a light default to keep UI compatible
  return picked.map((title: string, i: number) => ({
    id: `mod-${String(i + 1).padStart(2, '0')}`,
    title,
    estMinutes: 10,
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

// ---------------------
// Request budgeting & rate limiting (in-memory)
// ---------------------
const REQUESTS_PER_MIN = Number(process.env.REQUESTS_PER_MIN ?? 60);
const LLM_BUDGET_CENTS_PER_DAY = Number(process.env.LLM_BUDGET_CENTS_PER_DAY ?? 100);
const _rateBucket: Map<string, { count: number; resetAt: number }> = new Map();
const _budgetDay: Map<string, { day: string; cents: number }> = new Map();

function tokenHashFromReq(req: FastifyRequest): string {
  try {
    const anyReq = req as any;
    const raw = anyReq.cookies?.['cerply_session'] || anyReq.cookies?.['cerply_auth'] || '';
    if (raw) return crypto.createHash('sha256').update(String(raw)).digest('hex');
  } catch {}
  return String((req as any).ip ?? 'anon');
}

function allowRequestNow(key: string): boolean {
  const now = Date.now();
  const b = _rateBucket.get(key) ?? { count: 0, resetAt: now + 60_000 };
  if (now > b.resetAt) { b.count = 0; b.resetAt = now + 60_000; }
  if (b.count >= REQUESTS_PER_MIN) return false;
  b.count += 1; _rateBucket.set(key, b); return true;
}

function allowLlmSpend(key: string, cents: number): boolean {
  const today = new Date().toISOString().slice(0,10);
  const row = _budgetDay.get(key) ?? { day: today, cents: 0 };
  if (row.day !== today) { row.day = today; row.cents = 0; }
  if (row.cents + cents > LLM_BUDGET_CENTS_PER_DAY) return false;
  row.cents += cents; _budgetDay.set(key, row); return true;
}

async function planModulesLLM(intent: { topic: string; mins: number; isIntro: boolean; focus?: string }): Promise<LlmPlan> {
  if (!LLM_PLANNER_ENABLED) throw new Error('LLM planner disabled by env');
  if (LLM_PROVIDER !== 'openai') throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const sys = [
    'You are an expert curriculum planner. Break a user brief into a small set of logically grouped modules (not time-boxed).',
    'Return STRICT JSON ONLY with shape: { "modules": [ { "id": "mod-01", "title": "string", "estMinutes": number? }, ... ] } . Do not include any other keys or prose.',
    'Choose 3–6 strong modules. "estMinutes" is OPTIONAL; if you include it, keep each between 8 and 20.',
    'Titles must be specific and useful. Avoid generic words like "About", "Module", "Core Concepts", or placeholders.',
    'If a focus is provided, include exactly one dedicated module for that focus where it fits naturally.',
    'If isIntro=true and the topic likely requires prerequisites, include ONE short essentials/fundamentals module; otherwise do not add basics.',
    'Prefer concrete nouns and actions (e.g., "Friedmann equations and cosmic expansion" over "Core concepts").',
    'British English. No trailing punctuation in titles.'
  ].join(' ');

  const u = JSON.stringify({
    topic: intent.topic,
    timeBudgetMinutes: intent.mins,
    isIntro: intent.isIntro,
    focus: intent.focus ?? null
  });

  const body = {
    model: LLM_MODEL,
    temperature: 0.1,
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

// Known curriculum stubs (cheap, extendable). Prefer research when enabled.
const CURRICULA: Record<string, string[]> = {
  'ks3:Mathematics': [
    'Number and place value',
    'Fractions, decimals, and percentages',
    'Algebraic expressions and equations',
    'Geometry and measures',
    'Statistics and probability',
  ],
  'gcse:Mathematics': [
    'Number operations and indices',
    'Algebra: expressions, equations, and graphs',
    'Geometry and trigonometry',
    'Probability and statistics',
    'Ratio, proportion, and rates of change',
  ],
  'alevel:Mathematics': [
    'Proof and algebraic techniques',
    'Functions, sequences, and series',
    'Calculus: differentiation and integration',
    'Vectors and geometry in 2D/3D',
    'Statistics and mechanics',
  ],
};

function curriculumModules(stage: string|null, subject: string|null): ModuleOutline[] | null {
  if (!stage || !subject) return null;
  const key = `${stage}:${subject}`;
  const titles = CURRICULA[key];
  if (!titles) return null;
  return titles.map((title, i) => ({ id: `mod-${String(i + 1).padStart(2,'0')}`, title, estMinutes: 10 }));
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
app.get('/__routes', async (_req: FastifyRequest, reply: FastifyReply) => {
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
app.get('/__routes.json', async (_req: FastifyRequest, reply: FastifyReply) => {
  reply.type('application/json').send({ routes: __ROUTES, ts: new Date().toISOString() });
});

// Whoami (which process is serving this port)
app.get('/__whoami', async (_req: FastifyRequest, reply: FastifyReply) => {
  reply.type('application/json').send({
    pid: process.pid,
    cwd: process.cwd(),
    node: process.version,
    startedAt: new Date().toISOString(),
    note: 'Fastify API process'
  });
});

// Simple hello (useful smoke test)
app.get('/__hello', async (_req: FastifyRequest, reply: FastifyReply) => {
  reply.type('application/json').send({ ok: true, name: 'cerply-api' });
});

// Minimal dev probe
app.get('/__dev', async (_req: FastifyRequest, reply: FastifyReply) => {
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
  const k = tokenHashFromReq(req);
  if (!allowRequestNow(k)) return reply.code(429).send({ error: { code: 'RATE_LIMIT', message: 'Too many requests' } });
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

    // Check KB first (cheap cache by normalized key)
    const key = text.trim().toLowerCase().slice(0, 240);
    if (FLAGS.ff_materials_kb_v1 && key) {
      const hit = _kb.get(key);
      if (hit?.modules?.length) {
        reply.header('x-cache', 'kb-hit');
        reply.header('cache-control', 'no-store');
        reply.header('x-api', 'ingest-preview');
        return reply.send({ ok: true, modules: hit.modules, diagnostics: { source: 'kb', certified: !!hit.certified } });
      }
    }

    // New logic: choose preview implementation based on brief length
    const f = __v25_topicLanguageFilter(text);
    if (!f.ok) return reply.code(400).send({ error: { code: 'FILTERED', message: 'Topic/language not allowed' } });
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    let modules: ModuleOutline[] = [];
    let impl = 'v1-outline';
    let diag: any = undefined;
    let planner: 'llm' | 'heuristic' | undefined;
    let modelUsed = '';
    let citations: string[] = [];

    if (wordCount < 120) {
      const intent = analyzeIntent(text);

      // Curriculum fast-path (e.g., KS3 Maths)
      const __cur = __v25_detectCurriculum(text);
      const __curMods = curriculumModules(__cur.stage, __cur.subject);
      if (__curMods && __curMods.length) {
        modules = __curMods;
        impl = 'v0-curriculum';
        planner = 'heuristic';
        const subj = __cur.subject || 'Subject';
        citations = [`https://en.wikipedia.org/wiki/${encodeURIComponent(String(subj))}`];
        diag = { curriculum: { stage: __cur.stage, subject: __cur.subject }, count: modules.length, planner: 'heuristic', citations };
      }

      // Try LLM planner if enabled; fall back to heuristic
      if (!modules.length && LLM_PLANNER_ENABLED && OPENAI_API_KEY) {
        if (!allowLlmSpend(k, 5)) return reply.code(402).send({ error: { code: 'BUDGET_EXCEEDED', message: 'Daily LLM budget exceeded' } });
        try {
          const llm = await planModulesLLM(intent);
          modules = llm.modules;
          impl = 'v3-llm';
          planner = 'llm';
          modelUsed = llm.model ?? LLM_MODEL;
          // Heuristic citation to core topic
          citations = [`https://en.wikipedia.org/wiki/${encodeURIComponent(String(intent.topic))}`];
          diag = {
            topic: intent.topic,
            mins: intent.mins,
            isIntro: intent.isIntro,
            focus: intent.focus ?? null,
            count: modules.length,
            planner: 'llm',
            citations
          };
        } catch (e) {
          (req as any).log?.warn?.({ err: String(e) }, 'LLM planner failed; using heuristic');
          modules = proposeModules(intent.topic, intent.mins, intent.isIntro, intent.focus);
          impl = 'v2-multi';
          planner = 'heuristic';
          citations = [`https://en.wikipedia.org/wiki/${encodeURIComponent(String(intent.topic))}`];
          diag = {
            topic: intent.topic,
            mins: intent.mins,
            isIntro: intent.isIntro,
            focus: intent.focus ?? null,
            count: modules.length,
            planner: 'heuristic',
            reason: 'llm_failed',
            citations
          };
        }
      }
      if (!modules.length) {
        modules = proposeModules(intent.topic, intent.mins, intent.isIntro, intent.focus);
        impl = 'v2-multi';
        planner = 'heuristic';
        citations = [`https://en.wikipedia.org/wiki/${encodeURIComponent(String(intent.topic))}`];
        diag = {
          topic: intent.topic,
          mins: intent.mins,
          isIntro: intent.isIntro,
          focus: intent.focus ?? null,
          count: modules.length,
          planner: 'heuristic',
          reason: 'llm_disabled',
          citations
        };
      }
    } else {
      modules = outlineFromText(text);
      impl = 'v1-outline';
      planner = 'heuristic';
      const kws = extractKeywords(text).slice(0, 2);
      citations = kws.map(k => `https://en.wikipedia.org/wiki/${encodeURIComponent(k)}`);
      diag = { count: modules.length, planner: 'heuristic', citations };
    }

    reply.header('cache-control', 'no-store');
    reply.header('x-api', 'ingest-preview');
    reply.header('x-preview-impl', impl);
    if (planner) reply.header('x-planner', planner);
    if (modelUsed) reply.header('x-model', modelUsed);
    const payload = diag ? { ok: true, modules, diagnostics: diag } : { ok: true, modules };

    // Save into KB for reuse (cheap cache) if enabled
    if (FLAGS.ff_materials_kb_v1 && key && modules.length) {
      const now = new Date().toISOString();
      const rec = _kb.get(key);
      _kb.set(key, {
        key,
        modules,
        sources: rec?.sources,
        certified: rec?.certified,
        certifiedBy: rec?.certifiedBy,
        certifiedAt: rec?.certifiedAt,
        createdAt: rec?.createdAt ?? now,
        updatedAt: now,
      });
      reply.header('x-cache-write', 'kb-saved');
    }

    return reply.send(payload);
  } catch (err: any) {
    (req as any).log?.error?.({ err }, 'ingest/preview failed');
    return reply.code(500).send({ error: { code: 'INTERNAL', message: 'preview failed' } });
  }
}

// Register preview on both URLs
app.post('/api/ingest/preview', handleIngestPreview);
app.post('/ingest/preview', handleIngestPreview);


app.post('/api/ingest/generate', async (req: FastifyRequest, reply: FastifyReply) => {
  if (REQUIRE_AUTH_FOR_GENERATE && !isAuthed(req)) {
    reply.header('www-authenticate', 'Bearer realm="cerply"');
    return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to create modules', hint: 'Send Authorization: Bearer <token> or x-user-id header' } });
  }
  const b = ((req as any).body ?? {}) as { modules?: { id: string; title: string; estMinutes?: number }[] };
  const mods = Array.isArray(b.modules) ? b.modules : [];
  if (mods.length === 0) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'modules[] required' } });

  // Produce simple drafts per module: explanation + one MCQ + one free-form prompt
  const items = mods.map((m: { id: string; title: string }, i: number) => {
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
type LearnerState = { strengths: string[]; weaknesses: string[]; lastUpdated: string };
const _learnerByToken = new Map<string, LearnerState>();

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
  // Update simple learner model using cookie token (dev stub)
  const tokenRaw = (req as any).cookies?.['cerply_session'] || (req as any).cookies?.['cerply_auth'] || '';
  const token = tokenRaw ? crypto.createHash('sha256').update(String(tokenRaw)).digest('hex') : '';
  if (token) {
    let st: LearnerState | null = null;
    if (HAS_DB) {
      const row = await dbSingle<{ strengths: any; weaknesses: any; last_updated: string }>('select strengths, weaknesses, last_updated from learner_state where token=$1', [token]);
      if (row) st = { strengths: row.strengths ?? [], weaknesses: row.weaknesses ?? [], lastUpdated: row.last_updated };
    }
    st = st ?? _learnerByToken.get(token) ?? { strengths: [], weaknesses: [], lastUpdated: new Date().toISOString() };
    const key = (item.stem || '').slice(0, 60);
    const arr = correct ? st.strengths : st.weaknesses;
    if (!arr.find(s => s.includes(key))) arr.unshift(key);
    st.lastUpdated = new Date().toISOString();
    _learnerByToken.set(token, st);
    if (HAS_DB) {
      await dbQuery(
        `insert into learner_state (token, strengths, weaknesses, last_updated)
         values ($1,$2,$3,now())
         on conflict (token) do update set strengths=excluded.strengths, weaknesses=excluded.weaknesses, last_updated=now()`,
        [token, JSON.stringify(st.strengths), JSON.stringify(st.weaknesses)]
      );
    }
  }
  return reply.send({ correct, correctIndex: item.correctIndex, explainer: correct ? 'Nice! You chose the best answer.' : 'Review the stem and options; focus on the key concept.' });
});

// Learner state endpoint
app.get('/api/learn/state', async (req: FastifyRequest, reply: FastifyReply) => {
  const tokenRaw = (req as any).cookies?.['cerply_session'] || (req as any).cookies?.['cerply_auth'] || '';
  const token = tokenRaw ? crypto.createHash('sha256').update(String(tokenRaw)).digest('hex') : '';
  if (!token) return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Sign in' } });
  const st: LearnerState = _learnerByToken.get(token) ?? { strengths: [], weaknesses: [], lastUpdated: new Date().toISOString() };
  return reply.send({ ok: true, state: st });
});

// Ratings endpoint
app.post('/api/ratings', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req as any).body as { key?: string; kind?: 'plan'|'lesson'; rating?: number };
  const rating = Math.max(1, Math.min(5, Number(body?.rating ?? 0)));
  const key = (body?.key ?? '').toString().slice(0, 240);
  if (!key || !rating) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'key and rating required' } });
  const tokenRaw = (req as any).cookies?.['cerply_session'] || (req as any).cookies?.['cerply_auth'] || '';
  const token = tokenRaw ? crypto.createHash('sha256').update(String(tokenRaw)).digest('hex') : '';
  if (!token) return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Sign in' } });
  // Update learner ratings
  if (HAS_DB) {
    const row = await dbSingle<any>('select ratings from learner_state where token=$1', [token]).catch(() => null);
    const ratings = Array.isArray(row?.ratings) ? row.ratings : [];
    ratings.unshift({ key, kind: body?.kind ?? 'plan', rating, ts: new Date().toISOString() });
    await dbQuery('update learner_state set ratings=$2, last_updated=now() where token=$1', [token, JSON.stringify(ratings)]).catch(async () => {
      await dbQuery('insert into learner_state (token, strengths, weaknesses, last_plan, ratings) values ($1, $2, $3, $4, $5) on conflict (token) do update set ratings=excluded.ratings, last_updated=now()', [token, '[]', '[]', null, JSON.stringify(ratings)]);
    });
  }
  // Aggregate material rating if matches KB key
  if (HAS_DB) {
    await dbQuery('update materials_kb set rating_sum=rating_sum+$2, rating_count=rating_count+1 where key=$1', [key.toLowerCase(), rating]).catch(() => null);
  }
  return reply.send({ ok: true });
});

// Challenge logging
app.post('/api/challenge/log', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req as any).body as { message?: string; context?: any };
  const message = (body?.message ?? '').toString().slice(0, 2000);
  if (!message) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'message required' } });
  const tokenRaw = (req as any).cookies?.['cerply_session'] || (req as any).cookies?.['cerply_auth'] || '';
  const token = tokenRaw ? crypto.createHash('sha256').update(String(tokenRaw)).digest('hex') : '';
  if (HAS_DB) {
    await dbQuery('insert into challenges (token_hash, message, context) values ($1,$2,$3)', [token || null, message, JSON.stringify(body?.context ?? {})]).catch(() => null);
  }
  return reply.send({ ok: true });
});

// Privacy export/delete stubs
app.get('/api/privacy/export', async (req: FastifyRequest, reply: FastifyReply) => {
  const tokenRaw = (req as any).cookies?.['cerply_session'] || (req as any).cookies?.['cerply_auth'] || '';
  if (!tokenRaw) return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Sign in' } });
  const token = crypto.createHash('sha256').update(String(tokenRaw)).digest('hex');
  const learner = await dbSingle<any>('select strengths, weaknesses, last_updated, last_plan from learner_state where token=$1', [token]).catch(() => null);
  const pii = await dbSingle<any>('select email, name, region, created_at, updated_at from users_pii where token_hash=$1', [token]).catch(() => null);
  return reply.send({ ok: true, learner: learner ?? null, pii: pii ?? null });
});

app.post('/api/privacy/delete', async (req: FastifyRequest, reply: FastifyReply) => {
  const tokenRaw = (req as any).cookies?.['cerply_session'] || (req as any).cookies?.['cerply_auth'] || '';
  if (!tokenRaw) return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Sign in' } });
  const token = crypto.createHash('sha256').update(String(tokenRaw)).digest('hex');
  if (HAS_DB) {
    await dbQuery('delete from learner_state where token=$1', [token]).catch(() => null);
    await dbQuery('delete from users_pii where token_hash=$1', [token]).catch(() => null);
  }
  _learnerByToken.delete(token);
  return reply.send({ ok: true });
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
// Teams push/progress (stubs)
// ---------------------
app.post('/api/teams/assign', async (req: FastifyRequest, reply: FastifyReply) => {
  const body = (req as any).body as { teamId?: string; modules?: ModuleOutline[] };
  if (!body?.teamId || !Array.isArray(body?.modules)) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'teamId and modules required' } });
  return reply.send({ ok: true, assigned: body.modules.length, teamId: body.teamId });
});

app.get('/api/teams/progress', async (req: FastifyRequest, reply: FastifyReply) => {
  const q = (req as any).query as { teamId?: string };
  if (!q?.teamId) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'teamId required' } });
  return reply.send({ ok: true, teamId: q.teamId, completion: 0.0, learners: 0 });
});

// ---------------------
// Research (ff_research_v1)
// ---------------------
if (FLAGS.ff_research_v1) {
  const _fetchCache: Map<string, { text: string; fetchedAt: number; keywords: string[]; url: string }> = new Map();
  const TTL_MS = 60 * 60 * 1000; // 1h

  app.get('/api/research/fetch', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = (req as any).query as { url?: string };
    const rawUrl = (q?.url ?? '').toString().trim();
    if (!rawUrl) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'url required' } });
    const url = rawUrl.replace(/\s+/g, '');

    const cached = _fetchCache.get(url);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) return reply.send(cached);

    try {
      const r = await fetch(url);
      const html = await r.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const keywords = extractKeywords(text);
      const out = { text: text.slice(0, 100000), fetchedAt: Date.now(), keywords, url };
      _fetchCache.set(url, out);
      return reply.send(out);
    } catch (e: any) {
      return reply.code(502).send({ error: { code: 'UPSTREAM_FETCH_FAILED', message: 'unable to fetch url', details: { url } } });
    }
  });

  app.get('/api/research/search', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = (req as any).query as { q?: string };
    const query = (q?.q ?? '').toString().trim();
    if (!query) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'q required' } });
    const BRAVE = process.env.BRAVE_API_KEY || '';
    const SERP = process.env.SERPAPI_KEY || '';
    if (!BRAVE && !SERP) {
      return reply.code(501).send({ error: { code: 'NOT_CONFIGURED', message: 'search provider not configured' } });
    }
    try {
      if (BRAVE) {
        const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
          headers: { 'x-rapidapi-key': BRAVE },
        });
        const j = await r.json().catch(() => ({}));
        const items = (j?.web?.results ?? []).slice(0, 10).map((it: any) => ({ title: it?.title, url: it?.url, snippet: it?.description }));
        return reply.send({ provider: 'brave', items });
      }
      const r = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${SERP}`);
      const j = await r.json().catch(() => ({}));
      const items = (j?.organic_results ?? []).slice(0, 10).map((it: any) => ({ title: it?.title, url: it?.link, snippet: it?.snippet }));
      return reply.send({ provider: 'serpapi', items });
    } catch (e: any) {
      return reply.code(502).send({ error: { code: 'SEARCH_FAILED', message: 'search failed', details: { query } } });
    }
  });
}

// ---------------------
// Materials KB (ff_materials_kb_v1)
// ---------------------
if (FLAGS.ff_materials_kb_v1) {
  // Lookup by normalized key (e.g., topic or hash of source text)
  app.get('/api/materials/lookup', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = (req as any).query as { key?: string };
    const key = (q?.key ?? '').toString().trim().toLowerCase();
    if (!key) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'key required' } });
    if (HAS_DB) {
      const row = await dbSingle<{ modules: any; sources?: any; certified?: boolean; certified_by?: string; certified_at?: string; created_at?: string; updated_at?: string }>(
        'select modules, sources, certified, certified_by, certified_at, created_at, updated_at from materials_kb where key=$1',
        [key]
      );
      if (row) return reply.send({ ok: true, found: true, record: { key, modules: row.modules, sources: row.sources, certified: row.certified, certifiedBy: row.certified_by, certifiedAt: row.certified_at, createdAt: row.created_at, updatedAt: row.updated_at } });
    }
    const hit = _kb.get(key);
    if (!hit) return reply.send({ ok: true, found: false });
    return reply.send({ ok: true, found: true, record: hit });
  });

  // Save or update a plan for a key
  app.post('/api/materials/save', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req as any).body as { key?: string; modules?: ModuleOutline[]; sources?: string[] };
    const key = (body?.key ?? '').toString().trim().toLowerCase();
    const modules = Array.isArray(body?.modules) ? body!.modules! : [];
    if (!key || modules.length === 0) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'key and modules required' } });
    if (FLAGS.ff_certified_paywall_v1 && /\(certified\)/i.test(key) && !isAuthed(req)) {
      return reply.code(402).send({ error: { code: 'PAYWALL', message: 'Certified content requires subscription' } });
    }
    const now = new Date().toISOString();
    const prev = _kb.get(key);
    const rec: KbRecord = {
      key,
      modules,
      sources: Array.isArray(body?.sources) ? body!.sources! : prev?.sources,
      certified: prev?.certified ?? false,
      certifiedBy: prev?.certifiedBy,
      certifiedAt: prev?.certifiedAt,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    _kb.set(key, rec);
    if (HAS_DB) {
      await dbQuery(
        `insert into materials_kb (key, modules, sources, certified, certified_by, certified_at, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,coalesce($7, now()), now())
         on conflict (key) do update set modules=excluded.modules, sources=excluded.sources, certified=excluded.certified, certified_by=excluded.certified_by, certified_at=excluded.certified_at, updated_at=now()`,
        [key, JSON.stringify(modules), rec.sources ? JSON.stringify(rec.sources) : null, rec.certified ?? false, rec.certifiedBy ?? null, rec.certifiedAt ?? null, rec.createdAt ?? null]
      );
    }
    return reply.send({ ok: true });
  });

  // Certify a key (human review)
  app.post('/api/materials/certify', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req as any).body as { key?: string; by?: string };
    const key = (body?.key ?? '').toString().trim().toLowerCase();
    if (!key) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'key required' } });
     if (!isAuthed(req)) return reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Sign in' } });
    const rec = _kb.get(key);
    if (!rec) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'no record for key' } });
    rec.certified = true;
    rec.certifiedBy = (body?.by ?? 'expert').toString();
    rec.certifiedAt = new Date().toISOString();
    rec.updatedAt = rec.certifiedAt;
    _kb.set(key, rec);
    if (HAS_DB) {
      await dbQuery('update materials_kb set certified=true, certified_by=$2, certified_at=now(), updated_at=now() where key=$1', [key, rec.certifiedBy]);
    }
    return reply.send({ ok: true });
  });
}

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