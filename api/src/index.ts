import Fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';


// Run everything inside an async IIFE so we can use await at top-level safely
(async () => {

  // --- App bootstrap ---
const app = Fastify({ logger: true });
await app.register(cors, { 
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://stg.cerply.com',
    // Note: *.vercel.app wildcards not supported - add specific preview domains as needed
    'https://cerply-web.vercel.app'
  ]
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
};

// Health endpoints
app.get('/api/health', async () => {
  return { ok: true, env: process.env.NODE_ENV ?? 'unknown' };
});

app.get('/health', async () => {
  return { ok: true, note: 'prefer /api/health' };
});

app.get('/flags', async () => ({ flags: FLAGS }));

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
// DEV ONLY: expose registered routes for spec snapshot
app.get('/__routes', async () => {
  return { routes: [], ts: new Date().toISOString() };
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
await app.listen({ host: '0.0.0.0', port });
console.log(`[api] listening on http://0.0.0.0:${port}`);
})();