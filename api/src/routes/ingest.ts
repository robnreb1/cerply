import type { FastifyInstance } from "fastify";

// ---------- helpers ----------
const nowISO = () => new Date().toISOString();
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pad2 = (n: number) => String(n).padStart(2, "0");

type ParsedArtefact =
  | { kind: "text"; text: string }
  | { kind: "url"; url: string }
  | { kind: "file"; name: string; bytes: number };

type ModuleOutline = { id: string; title: string; estMinutes: number };

function analyzeIntent(input: string) {
  const raw = (input || "").trim();
  const lower = raw.toLowerCase();

  // time budget
  let mins = 0;
  const m1 = lower.match(/(\d+)\s*(min|mins|minute|minutes)\b/);
  const h1 = lower.match(/(\d+)\s*(h|hr|hour|hours)\b/);
  if (m1) mins += parseInt(m1[1], 10);
  if (h1) mins += parseInt(h1[1], 10) * 60;

  // intro intent
  const isIntro = /\b(intro|beginner|basics|foundation|foundations)\b/.test(lower);

  // focus segment
  const f = lower.match(/\bfocus\s+(on|around)?\s*([a-z0-9\-\s]+)/);
  const focus = f ? f[2].trim().replace(/\.$/, "") : undefined;

  // topic normalization (coarse)
  let topic = raw.split(/[.,\n]/)[0].trim();
  const bigMap: Record<string, string> = {
    astrophysics: "Astrophysics",
    "quantum mechanics": "Quantum Mechanics",
    mathematics: "Mathematics",
    biology: "Biology",
    chemistry: "Chemistry",
    "computer science": "Computer Science",
    economics: "Economics",
  };
  for (const k of Object.keys(bigMap)) {
    if (lower.includes(k)) topic = bigMap[k];
  }

  return { topic, mins, isIntro, focus };
}

function proposeModules(topic: string, mins: number, isIntro: boolean, focus?: string): ModuleOutline[] {
  // base on time
  let n =
    mins >= 90 ? 6 :
    mins >= 60 ? 5 :
    mins >= 40 ? 4 :
    mins >= 25 ? 3 :
    2;

  // scope-based bump/cap
  const heavy = ["Astrophysics", "Quantum Mechanics", "Mathematics", "Biology", "Computer Science"];
  if (!mins && heavy.includes(topic)) n = Math.max(n, isIntro ? 3 : 5);
  if (isIntro) n = Math.min(n, 4);
  n = clamp(n, 2, 6);

  // allocate minutes (at least 5 each)
  const per = clamp(Math.floor((mins || (n * 8)) / n), 5, 25);

  // seed titles
  const seeds: string[] = [];
  seeds.push(`${topic}: Foundations`);
  if (focus) seeds.push(`Focus: ${focus}`);
  seeds.push(`${topic}: Core Concepts`);
  seeds.push(`${topic}: Applications`);
  seeds.push(`${topic}: Key Equations & Methods`);
  seeds.push(`${topic}: Review & Practice`);

  // uniq & cut to n
  const seen = new Set<string>();
  const titles = seeds.filter(t => (seen.has(t) ? false : (seen.add(t), true))).slice(0, n);

  return titles.map((title, i) => ({
    id: `mod-${pad2(i + 1)}`,
    title,
    estMinutes: per,
  }));
}

// ---------- routes ----------
export default async function ingestRoutes(app: FastifyInstance) {
  // /api/ingest/parse
  app.post("/api/ingest/parse", async (req: any, reply: any) => {
    try {
      let artefact: ParsedArtefact | null = null;

      if (typeof req.body === "string") {
        artefact = { kind: "text", text: req.body };
      } else if (req.body?.text) {
        artefact = { kind: "text", text: String(req.body.text) };
      } else if (req.body?.artefact?.kind === "text" && req.body?.artefact?.text) {
        artefact = { kind: "text", text: String(req.body.artefact.text) };
      } else if (req.body?.url) {
        artefact = { kind: "url", url: String(req.body.url) };
      } else if (req.body?.file?.name && typeof req.body?.file?.bytes === "number") {
        artefact = { kind: "file", name: String(req.body.file.name), bytes: Number(req.body.file.bytes) };
      }

      if (!artefact) {
        return reply.code(400).send({ error: { code: "BAD_REQUEST", message: "No artefact supplied" } });
      }

      const bytes =
        artefact.kind === "text" ? Buffer.byteLength(artefact.text, "utf8")
        : artefact.kind === "url" ? artefact.url.length
        : artefact.bytes;

      return reply
        .header("x-api", "ingest-parse")
        .send({ ok: true, parsed: artefact, bytes, ts: nowISO() });
    } catch (err: any) {
      (req as any).log?.error?.(err);
      return reply.code(500).send({ ok: false, error: { code: "SERVER_ERROR", message: err?.message || String(err) } });
    }
  });

  // /api/ingest/preview  (NEW multi-module heuristic)
  app.post("/api/ingest/preview", async (req: any, reply: any) => {
    try {
      const text: string =
        (typeof req.body === "string" && req.body) ||
        req.body?.text ||
        req.body?.payload ||
        req.body?.artefact?.text ||
        "";

      if (!text || typeof text !== "string") {
        return reply.code(400).send({ error: { code: "BAD_REQUEST", message: "payload text required" } });
      }

      const intent = analyzeIntent(text);
      const modules = proposeModules(intent.topic, intent.mins, intent.isIntro, intent.focus);

      reply.header("x-api", "ingest-preview");
      reply.header("x-preview-impl", "v2-multi");
      reply.header("cache-control", "no-store");

      return reply.send({
        ok: true,
        modules,
        diagnostics: {
          impl: "v2-multi",
          topic: intent.topic,
          mins: intent.mins,
          isIntro: intent.isIntro,
          focus: intent.focus || null,
          count: modules.length,
        },
      });
    } catch (err: any) {
      (req as any).log?.error?.(err);
      return reply.code(500).send({ ok: false, error: { code: "SERVER_ERROR", message: err?.message || String(err) } });
    }
  });

  // /api/ingest/generate (unchanged stub generator)
  app.post("/api/ingest/generate", async (req: any, reply: any) => {
    try {
      const modules: Array<{ id?: string; title?: string }> = Array.isArray(req.body?.modules)
        ? req.body.modules
        : [];

      if (!modules.length) {
        return reply.code(400).send({ error: { code: "BAD_REQUEST", message: "modules[] required" } });
      }

      const items = modules.map((m, i) => ({
        moduleId: m.id || `mod-${pad2(i + 1)}`,
        title: m.title || `Module ${i + 1}`,
        explanation: `Overview of "${m.title || `Module ${i + 1}`}". Key takeaways are summarized in plain language to build intuition before testing.`,
        questions: {
          mcq: {
            id: `auto-${i}-${Math.random().toString(36).slice(2, 8)}`,
            stem: `Which statement best captures "${m.title || `Module ${i + 1}`}"?`,
            options: ["About: which", "Unrelated: statement", "Partially true: best", "Opposite: captures"],
            correctIndex: 0,
          },
          free: {
            prompt: `In 2–3 sentences, explain "${m.title || `Module ${i + 1}`}" to a colleague.`,
          },
        },
      }));

      return reply.header("x-api", "ingest-generate").send({ ok: true, items });
    } catch (err: any) {
      (req as any).log?.error?.(err);
      return reply.code(500).send({ ok: false, error: { code: "SERVER_ERROR", message: err?.message || String(err) } });
    }
  });

  // convenience aliases
  app.post("/ingest/preview", async (req: any, reply: any) => {
    const r = await app.inject({ method: "POST", url: "/api/ingest/preview", payload: req.body });
    return reply.code(r.statusCode).headers(r.headers as any).send(r.body);
  });
  app.post("/ingest/generate", async (req: any, reply: any) => {
    const r = await app.inject({ method: "POST", url: "/api/ingest/generate", payload: req.body });
    return reply.code(r.statusCode).headers(r.headers as any).send(r.body);
  });
}