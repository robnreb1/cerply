// api/src/routes/ingest.ts
import type { FastifyInstance } from 'fastify';
import runLLM from '../11m/run';

/** ---------- small helpers ---------- */
type PlannedModule = {
  id?: string;
  title: string;
  estMinutes?: number;
  rationale?: string;
  prerequisite?: boolean;
  bloom?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
};

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function truthyEnv(v: any): boolean {
  if (!v) return false;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

const LLM_PLANNER_ENABLED = truthyEnv(process.env.LLM_PREVIEW ?? process.env.LLM_PLANNER);
const DEFAULT_PLANNER_MODEL = process.env.LLM_PLANNER_MODEL || 'gpt-4o-mini';

/** Extract plain text topic + optional time budget from incoming payload */
function coerceTextPayload(body: any): { text: string; timeBudgetMinutes?: number } {
  if (!body) return { text: '' };
  // straight text
  if (typeof body.text === 'string' && body.text.trim()) {
    return { text: body.text.trim(), timeBudgetMinutes: guessTime(body.text) };
  }
  // artefact wrapper
  if (body.artefact && typeof body.artefact?.text === 'string') {
    return { text: body.artefact.text.trim(), timeBudgetMinutes: guessTime(body.artefact.text) };
  }
  // url string (treat as text label)
  if (typeof body.url === 'string' && body.url.trim()) {
    return { text: body.url.trim(), timeBudgetMinutes: undefined };
  }
  // anything else: stringify
  return { text: String(body).trim() };
}

/** naive time extractor: “45 mins”, “20 minutes” → 45/20 */
function guessTime(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.toLowerCase().match(/(\d{1,3})\s*(min|mins|minutes|m)\b/);
  if (m) {
    const val = parseInt(m[1], 10);
    if (Number.isFinite(val)) return clampNumber(val, 5, 180);
  }
  return undefined;
}

/** Basic heuristic fallback modules when LLM is off/unavailable */
function heuristicModules(topic: string, timeBudgetMinutes?: number): PlannedModule[] {
  const t = (topic || 'Topic').trim();
  // Make it a bit less generic, but still deterministic
  const seeds = [
    `${t}: Key Ideas`,
    `${t}: Worked Examples`,
    `${t}: Common Pitfalls`,
    `${t}: Check Your Understanding`,
    `${t}: Apply It`,
    `${t}: Quick Review`,
  ];
  // pick a sensible count vs time budget
  const per = 8; // default 8 mins/module
  const maxByTime = timeBudgetMinutes ? Math.max(3, Math.min(10, Math.round(timeBudgetMinutes / per))) : 4;
  const count = clampNumber(maxByTime, 3, 8);
  return seeds.slice(0, count).map((title, i) => ({
    id: `mod-${String(i + 1).padStart(2, '0')}`,
    title: title.slice(0, 96),
    estMinutes: clampNumber(Math.round(timeBudgetMinutes ? timeBudgetMinutes / count : 6), 4, 12),
  }));
}

/** Try to plan modules with an LLM (JSON-only) */
async function planModulesLLM(topic: string, timeBudgetMinutes?: number) {
  const model = DEFAULT_PLANNER_MODEL;
  const system =
    'You are a master curriculum planner. Given a topic and (optional) time budget for an initial learning session, propose a concise, high-quality module outline that helps a motivated learner build competence efficiently.' +
    ' Return ONLY JSON that matches exactly: {"modules":[{"title":string,"estMinutes":number,"rationale":string,"prerequisite":boolean,"bloom":"remember"|"understand"|"apply"|"analyze"|"evaluate"|"create"}]}.' +
    ' Rules: 6–10 modules for broad topics, 3–6 for narrow. Avoid generic titles like "Foundations", "Overview", "Review & Practice" unless truly justified. Titles must be concrete and specific.' +
    ' Each module gets 4–12 minutes; distribute minutes sensibly given the time budget. Keep rationales to one sentence. No extra keys, no prose outside JSON.';
  const input = JSON.stringify({ topic, timeBudgetMinutes: timeBudgetMinutes ?? null });

  const res = await runLLM({
    provider: 'openai',
    model,
    system,
    input,
    json: true,
    temperature: 0.2,
  } as any);

  if (!(res as any)?.ok) {
    return { ok: false as const, reason: (res as any)?.reason || 'llm-failed' };
  }

  // Parse strict JSON
  const raw = String((res as any).output || '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false as const, reason: 'bad-json' };
    parsed = JSON.parse(m[0]);
  }

  const arr = Array.isArray(parsed?.modules) ? parsed.modules : [];
  if (!arr.length) return { ok: false as const, reason: 'no-modules' };

  const modules: PlannedModule[] = arr
    .map((m: any, i: number) => {
      const title = String(m?.title ?? '').trim();
      const est = Number.isFinite(m?.estMinutes) ? Number(m.estMinutes) : 6;
      return {
        id: `mod-${String(i + 1).padStart(2, '0')}`,
        title: title ? title.slice(0, 96) : `Module ${i + 1}`,
        estMinutes: clampNumber(Math.round(est), 4, 12),
        rationale: m?.rationale ? String(m.rationale).slice(0, 180) : undefined,
        prerequisite: !!m?.prerequisite,
        bloom: ((): PlannedModule['bloom'] => {
          const v = String(m?.bloom || '').toLowerCase();
          const allowed = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
          return (allowed.includes(v) ? (v as any) : undefined) as any;
        })(),
      };
    })
    .slice(0, 12);

  return { ok: true as const, modules, model };
}

/** ---------- routes ---------- */
export default async function ingestRoutes(app: FastifyInstance) {
  // parse: keep existing behaviour
  app.post('/api/ingest/parse', async (req: any, reply: any) => {
    try {
      const body = (req.body ?? {}) as any;
      let text = '';
      let kind: 'text' | 'url' = 'text';

      if (typeof body.text === 'string') {
        text = body.text;
      } else if (body.artefact?.text) {
        text = String(body.artefact.text);
      } else if (typeof body.url === 'string') {
        text = String(body.url);
        kind = 'url';
      } else if (typeof body === 'string') {
        text = body;
      }

      const resp = {
        ok: true,
        parsed: kind === 'url' ? { kind, url: text } : { kind: 'text', text },
        bytes: text ? Buffer.byteLength(text, 'utf8') : 0,
        ts: new Date().toISOString(),
      };

      return reply
        .headers({ 'cache-control': 'no-store', 'x-api': 'ingest-parse' })
        .send(resp);
    } catch (err: any) {
      return reply.code(500).send({
        ok: false,
        error: { code: 'SERVER_ERROR', message: err?.message || String(err) },
      });
    }
  });

  // preview: now tries LLM (if enabled) then falls back to heuristic
  app.post('/api/ingest/preview', async (req: any, reply: any) => {
    try {
      const body = (req.body ?? {}) as any;
      const { text, timeBudgetMinutes } = coerceTextPayload(body);
      const topic = (text || '').trim();

      if (!topic) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'payload text required' } });
      }

      if (LLM_PLANNER_ENABLED) {
        try {
          const llm = await planModulesLLM(topic, timeBudgetMinutes);
          if (llm.ok) {
            (req as any).log?.info?.({ at: 'preview.llm', topic, model: llm.model, count: llm.modules.length });
            return reply
              .headers({ 'cache-control': 'no-store', 'x-api': 'ingest-preview', 'x-planner': 'llm', 'x-model': llm.model || '' })
              .send({ ok: true, modules: llm.modules, diagnostics: { planner: 'llm', model: llm.model, fallback: false } });
          } else {
            (req as any).log?.warn?.({ at: 'preview.llm', topic, reason: llm.reason }, 'LLM planner failed — fallback to heuristic');
          }
        } catch (err: any) {
          (req as any).log?.error?.({ at: 'preview.llm', err: err?.message || String(err) }, 'LLM planner threw');
        }
      }

      const modules = heuristicModules(topic, timeBudgetMinutes);
      return reply
        .headers({ 'cache-control': 'no-store', 'x-api': 'ingest-preview', 'x-planner': 'heuristic' })
        .send({ ok: true, modules, diagnostics: { planner: 'heuristic', fallback: true } });
    } catch (err: any) {
      return reply.code(500).send({
        ok: false,
        error: { code: 'SERVER_ERROR', message: err?.message || String(err) },
      });
    }
  });

  // generate: stub content (unchanged behaviour)
  app.post('/api/ingest/generate', async (req: any, reply: any) => {
    try {
      const body = (req.body ?? {}) as any;
      const modules = Array.isArray(body?.modules) ? body.modules : [];
      if (!modules.length) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'modules[] required' } });
      }

      const items = modules.map((m: any, i: number) => {
        const title = String(m?.title || `Module ${i + 1}`);
        return {
          moduleId: m?.id || `mod-${String(i + 1).padStart(2, '0')}`,
          title,
          explanation: `Overview of "${title}". Key takeaways are summarized in plain language to build intuition before testing.`,
          questions: {
            mcq: {
              id: `auto-${i}-${Math.random().toString(36).slice(2, 8)}`,
              stem: `Which statement best captures "${title}"?`,
              options: ['About: which', 'Unrelated: statement', 'Partially true: best', 'Opposite: captures'],
              correctIndex: 0,
            },
            free: {
              prompt: `In 2–3 sentences, explain "${title}" to a colleague.`,
            },
          },
        };
      });

      return reply
        .headers({ 'cache-control': 'no-store', 'x-api': 'ingest-generate' })
        .send({ ok: true, items });
    } catch (err: any) {
      return reply.code(500).send({
        ok: false,
        error: { code: 'SERVER_ERROR', message: err?.message || String(err) },
      });
    }
  });

  /** ----- alias routes to match earlier curl usage ----- */
  app.post('/ingest/parse', async (req: any, reply: any) =>
    app
      .inject({ method: 'POST', url: '/api/ingest/parse', payload: req.body })
      .then((r: any) => reply.code(r.statusCode).headers(r.headers as any).send(r.body))
  );
  app.post('/ingest/preview', async (req: any, reply: any) =>
    app
      .inject({ method: 'POST', url: '/api/ingest/preview', payload: req.body })
      .then((r: any) => reply.code(r.statusCode).headers(r.headers as any).send(r.body))
  );
  app.post('/ingest/generate', async (req: any, reply: any) =>
    app
      .inject({ method: 'POST', url: '/api/ingest/generate', payload: req.body })
      .then((r: any) => reply.code(r.statusCode).headers(r.headers as any).send(r.body))
  );
}