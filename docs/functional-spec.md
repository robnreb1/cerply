## 9) Acceptance criteria
- Curator edit ≤ 4 min/item; median item quality ≥ 70 (when flag on).
- Import supports: text, base64 (`.pdf/.docx` stub), transcript batching.
- Learn loop: submit/next cycle works; correctness feedback present.
- Style page renders brand tokens; AA on primary/on-primary.
- Prompts library: `/prompts` lists & renders >0 prompts in dev. **Staging (M1):** list may be backed by edge canary or proxy (`/api/prompts` responds with `x-edge: prompts-proxy` or `x-edge: prompts-fallback`; legacy `prompts-v2` is tolerated). **M2:** must fetch via Next.js rewrite proxy. Prompt detail view works; API `GET /api/prompts` reachable (never 404).
- Coverage UI: `/coverage` renders summary and gaps from `/evidence/coverage` (stub) via proxy (no CORS issues).
- Smoke script passes for `/style` and `/coverage` endpoints (HTTP 200).
- Staging smoke script passes: `scripts/smoke-stg.sh` succeeds for `/ping`, `/api/health`, `/api/prompts` (accepts `x-edge: prompts-proxy` **or** `x-edge: prompts-fallback`) using the Vercel bypass cookie.
- Vercel API health: `/api/health` returns 200 JSON on Vercel. Accept **proxy** (`x-edge: health-proxy`) or legacy canary (`health`/`health-v2`). Never 404.
- `/ping` returns **204 No Content** with header `x-edge: ping` (staging).
- `/api/prompts` returns 200 JSON on Vercel. Accept **proxy** (`x-edge: prompts-proxy`) or **fallback** (`x-edge: prompts-fallback`); legacy canary headers are tolerated in M1 (`prompts`/`prompts-v2`). **Never 404.**
- POST /api/curator/quality/compute returns 200/400 (not 404/405).
- /debug/env renders; build-time env shown; API health check on page passes (use Vercel bypass cookie on protected domains).
- Tailwind styling present; feature flags honored on Vercel.
- `/debug/env` shows NEXT_PUBLIC_* as expected and API health JSON in Vercel.
- Preview & Prod on Vercel resolve via custom domain; /debug/env shows correct vars; /api/health and /api/prompts return non-404 via **proxy (M2)** or **edge canary (M1)**.

## 10) Non-functional / Dev UX
-
### Planning SSOT

- **Source of truth:** GitHub issues labeled **Epic**.
- **Dashboard:** `docs/status/epics.md` (auto-generated every 6 hours; also runnable via Actions → “Epics Dashboard” → Run workflow).
- **Prioritization:** add labels **P0–P3** (or **priority:critical/high/medium/low**). The dashboard sorts by priority then recent updates.
- **Status:** optional `status:*` labels (e.g., `status:in-progress`). Otherwise, status derives from issue open/closed.

- API background control:
  - Start: scripts/api-start.sh (uses PORT, default 3001)
  - Stop:  scripts/api-stop.sh
  - Logs:  tail -n 100 /tmp/cerply-api.log

  - Staging smoke script:
    - Script: `scripts/smoke-stg.sh` (requires bypass cookie for protected domains)
    - Local: set cookie with `?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=$TOKEN`, then run `JAR=./.cookies.stg.jar ./scripts/smoke-stg.sh`
    - CI: `.github/workflows/stg-smoke.yml` uses `${{ secrets.VERCEL_BYPASS_TOKEN_STG }}` to set the cookie and run the script

## 11) Change log
- **2025-08-31**: Chat-first refinements — rails positioned below and full-bleed; compact composer with right-aligned Upload/Send; reduced opener→input gap; prompts proxy/fallback headers reflected in acceptance; rate-limit/diagnostics noted.
- **2025-08-22**: Staging "M1" edge canaries for `/ping`, `/api/health`, `/api/prompts`; added `scripts/smoke-stg.sh`; documented bypass-cookie flow; acceptance updated to allow M1 vs M2.
- **2025-08-19**: Expanded acceptance criteria to include `/prompts` and coverage smoke; spec reconciled.
- **2025-08-19**: Added Next.js rewrite to proxy `/api/*` to backend; fixed `/prompts` page fetching via proxy.
- **2025-08-19**: Added feature-flagged routes (connectors, quality, certified, marketplace, groups), OPTIONS preflight, brand tokens page; spec reconciled to v2.3.
- **2025-08-19**: Added prompt library system with auto-indexing, API endpoints, and web UI; spec reconciled to v2.5.
- **2025-08-19**: Added Evidence Coverage UI at /coverage with summary KPIs and gaps, smoke test script, updated package scripts; spec reconciled to v2.4.
- **2025-08-17**: Initial spec + items generate + learn MVP.
- **2025-08-19**: Added /debug/env runtime page and vercel smoke script.
- **2025-01-27**: Staging domains (Vercel + Render), proxy correctness, debug page verified.

## 12) Auth v0 (Anonymous Sessions + CSRF)

- Anonymous sessions (server-issued opaque id) with TTL `${AUTH_SESSION_TTL_SECONDS:-604800}`.
- Endpoints:
  - `POST /api/auth/session` → `{ session_id, csrf_token, expires_at }` and sets cookies: `${AUTH_COOKIE_NAME:-sid}` (HttpOnly; Secure in prod; SameSite=Lax; Path=/), and `csrf` (non-HttpOnly; Secure in prod; SameSite=Lax; Path=/).
  - `GET /api/auth/session` → `{ session_id, expires_at }` or 401 if missing.
  - `DELETE /api/auth/session` → clears cookies, `{ ok: true }`.
- CSRF (double-submit) required for any non-GET under `/api/`: require both `X-CSRF-Token` header and `csrf` cookie equal to the token. On fail → `403 { error: { code: "CSRF" } }`.
- CORS invariants: OPTIONS 204; non-OPTIONS include `Access-Control-Allow-Origin: *`; no `Access-Control-Allow-Credentials: true`.
## Admin Certified v0 (Preview) — EPIC #54
- Namespace: `/api/admin/certified/*` gated by `ADMIN_PREVIEW=true` and bearer header `X-Admin-Token` (or `Authorization: Bearer …`).
- CORS invariants: ACAO:* on responses; no ACAC; OPTIONS returns 204 with allow headers `content-type, x-admin-token, authorization`.
- Security headers on responses: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`.
- Size cap: `ADMIN_MAX_REQUEST_BYTES` (default 32KB). Stateless; CSRF N/A.
- Endpoints: POST/GET sources; POST items/ingest; GET items (filter by status); GET item details; POST approve/reject (emits audit line).
- Storage: NDJSON file append-only at `api/store/admin-certified.ndjson` (v0); future durable store behind a flag.
 - See `docs/admin/CERTIFIED_ADMIN_V0.md` for exact curls and expected headers.

- Soft route guard (flagged): if `AUTH_REQUIRE_SESSION=true`, mutating under `/api/orchestrator/*` and `/api/certified/*` returns 401 when session missing.
- Gate all behavior behind `AUTH_ENABLED=true`.

## 13) Addendum A — Staging & Edge Canaries (M1)
### Orchestrator v0 — Security Model
- Stateless, header-only surface; browsers do not send cookies (no ACAC).
- CSRF is not applicable until/if credentialed flows are introduced.
- See `docs/orchestrator/V0.md` for details and a TODO for credentialed flows.

**Scope:** staging only, while backend rewrites are stabilized.

**Temporary handlers (web):**
- `app/ping/route.ts` → returns 204, header `x-edge: ping`.
- `app/api/health/route.ts` → returns `{"ok":true,"service":"web","ts":...}`, headers `content-type: application/json; charset=utf-8`, `cache-control: no-store`, `x-edge: health-v2`.
- `app/api/prompts/route.ts` → proxies upstream; returns static demo list when upstream is 4xx/5xx/unreachable. Headers: `x-edge: prompts-proxy` on success, `x-edge: prompts-fallback` on fallback.

**Acceptance mapping (M1):**
- `GET /api/health` and `/api/prompts` must be **200** via these handlers.
- Smoke must pass with `scripts/smoke-stg.sh`.
- Use Vercel bypass cookie for protected domains.

**De-scope in M2:** Remove these routes once proxy is live.

## 14) Spec Delta — Real API Proxy (M2)

**Target:** Replace edge canaries with Next.js rewrites that forward `/api/*` to `${NEXT_PUBLIC_API_BASE}` (no CORS).

**Expected headers:** Responses may include `x-edge: proxy` (optional) and reflect backend cache-control.

### Security baselines (P1) — Certified endpoints
- Verify (preview): `POST /api/certified/verify` accepts `{ plan, lock, meta? }`, re-canonicalizes, hashes, compares, returns `{ ok, computed, provided, mismatch? }`. CORS invariants preserved; OPTIONS 204; strict JSON.
- Audit preview (flagged): `GET /api/certified/_audit_preview?limit=100` when `FF_CERTIFIED_AUDIT_PREVIEW=true`.
- Request size caps: `MAX_REQUEST_BYTES` (default 32KB). Exceeding returns 413 JSON `{ error: { code: 'PAYLOAD_TOO_LARGE', details: { max_bytes } } }`.
- Rate limits: token-bucket on certified POSTs. `RATE_LIMIT_CERTIFIED_BURST` (default 20), `RATE_LIMIT_CERTIFIED_REFILL_PER_SEC` (default 5). Uses `REDIS_URL` when provided; falls back to in-memory. Returns 429 JSON `{ error: { code: 'RATE_LIMITED', details: { retry_after_ms, limit } } }` with `x-ratelimit-*` and `retry-after`.
- Security headers added to certified responses (non-OPTIONS): `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`. CORS invariants retained: `ACAO:*`, no `ACAC:true`.

**Acceptance updates (M2):**
- `GET /api/health` and `/api/prompts` return 200 JSON **through the proxy** (not handled by app routes).
- `/prompts` page fetches via proxy.
- Remove canary code and update smoke to assert proxy path.

### Orchestrator v0 (Preview)

- API (preview-gated):

  - `POST /api/orchestrator/jobs` accepts a Task Packet `{ goal, scope?, planRef?, steps[], limits{ maxSteps, maxWallMs?, maxTokens? }, flags? }` and returns `{ job_id }`.

  - `GET /api/orchestrator/jobs/:id` returns job status and roll-up.
  - `GET /api/orchestrator/events?job=:id` streams Server-Sent Events.
- Engine: in-memory queue with loop-guard (step budget + wall clock cutoff) and jittered backoff on retries.
- Security baselines: payload size limit, per-route rate limit, conservative headers on non-OPTIONS.
- OpenAPI includes orchestrator paths; smoke script asserts CORS invariants (ACAO:*; no ACAC:true).

- Limits normalization: inputs may use snake_case keys (`max_steps`, `max_wall_ms`, `max_tokens`) which are normalized to camelCase before validation/execution. When `maxWallMs` is omitted, a conservative default of 10s is applied.


## 15) Enterprise‑Ready Minimalist UI (ER‑MUI)

**Role:** Product design + build assistant extension for a minimalist, enterprise‑ready UI using natural language input as the primary interaction.

**Context (unchanged product core):** Cerply ingests artefacts (documents, transcripts, policies, syllabi, podcasts, etc.) → converts them into structured micro‑learning modules and micro‑tests → adapts delivery and scoring → provides audit trails, psychometric calibration, and guild certification.

**Design Goal:** A minimalist, professional, trust‑forward UI that appeals both to consumers and enterprise buyers (compliance, qualifications).

### 14.1 UI Requirements

1) **Single Input Action**
   - Centered text input box that accepts paste, drag‑drop, or file upload.
   - Placeholder cycles between examples:
     - “Paste your meeting notes…”
     - “Upload a policy document…”
     - “Drop in a podcast transcript…”

2) **Benefit‑Clear Micro Copy (Top Bar)**
   - Shown in the actual top bar, centered and *italic*:
     _“Helping you master what matters.”_
   - (The previous reassurance sentence under the input is deprecated in default mode; it may still appear in enterprise mode as a secondary line when specified by config.)

3) **Trust Badges Row** (subtle; bottom of viewport by default)
   - Text only, muted colour (no icons):  
     _“Audit‑ready · Expert‑reviewed · Adaptive · Private by default”_

4) **Icon Row (under input)**
   - A muted, evenly-spaced row of icons **beneath the input**:
     - **Certified**, **Curate**, **Guild**, **Account**, **Upload**
   - The **Upload** icon/label is visually emphasized (darker text weight) to suggest file ingestion.

5) **Progressive Disclosure**
   - After first artefact is submitted and modules generated, softly offer enterprise/QPP upsells (e.g. “Want this mapped to your compliance standard?”).
   - Avoid clutter on initial screen.

6) **Typography & Tone**
   - Warm, modern sans‑serif; neutral/light background; rounded corners on input.
   - Minimal colour until results appear.

7) **Enterprise Mode**
   - Same input. When `enterprise=true` (feature flag / config), display the trust badge row more prominently (e.g., visible at all times under input) and pre‑enable SSO/upload connectors.

### 14.2 Functional Requirements

- **Input Handling**
  - Accepts paste, drag‑drop, or upload (`.docx`, `.pdf`, `.txt`, URL text).
  - Routes artefact to ingestion pipeline (existing API/proxy).
- **First‑Use Flow**
  - User enters artefact.
  - System responds conversationally: “Got it. Building your learning modules…”
  - Displays generated micro‑modules in a clean **card stack**.
- **Responsiveness**
  - Must look equally clean on mobile (app stores) and web (SaaS).
- **Privacy**
  - Do not upload until user confirms (paste or choose file then “Create modules” action), unless org policy allows instant ingest.

---

## 15) UI Components (definitions & sample JSX/Tailwind)

> Implementation target: Next.js (App Router) + Tailwind (existing stack). Place components under `web/components/ui/…`. Keep styles token‑driven where feasible.

### 16.1 `<InputAction />`
Responsibilities:
- Centered large input; supports paste, URL entry, drag‑drop, and file picker.
- Cycles placeholder text every few seconds.
- Emits a normalized **ArtefactRequest**: `{ type: 'text'|'url'|'file', payload, filename?, mime? }`.

Sample JSX (TypeScript, Tailwind):

```tsx
// components/ui/InputAction.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

const PLACEHOLDERS = [
  'Paste your meeting notes…',
  'Upload a policy document…',
  'Drop in a podcast transcript…',
];

export type ArtefactRequest =
  | { type: 'text'; payload: string }
  | { type: 'url'; payload: string }
  | { type: 'file'; payload: File };

export function InputAction({
  enterprise = false,
  onSubmit,
}: {
  enterprise?: boolean;
  onSubmit: (req: ArtefactRequest) => void;
}) {
  const [value, setValue] = useState('');
  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);
  const placeholder = useMemo(() => PLACEHOLDERS[i % PLACEHOLDERS.length], [i]);

  useEffect(() => {
    timer.current = window.setInterval(() => setI((x) => x + 1), 3500);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, []);

  const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onSubmit({ type: 'file', payload: files[0] });
  };

  const handleSubmit = () => {
    const v = value.trim();
    if (!v) return;
    if (isUrl(v)) return onSubmit({ type: 'url', payload: v });
    return onSubmit({ type: 'text', payload: v });
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto"
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
    >
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 backdrop-blur px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-brand/30">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-[15px] placeholder:text-neutral-400"
          aria-label="Paste text or URL"
        />
        <label className="inline-flex items-center text-sm font-medium text-brand hover:underline cursor-pointer">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          Upload
        </label>
        <button
          onClick={handleSubmit}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-brand text-white hover:opacity-90"
        >
          Create modules
        </button>
      </div>

      {/* Micro‑copy */}
      <p className="mt-2 text-center text-sm text-neutral-500">
        Cerply converts anything you give it into personalised micro‑learning and tests — so you remember what matters.
      </p>

      {/* Enterprise trust badges (prominent in enterprise mode) */}
      <div className={enterprise ? 'mt-3 flex justify-center' : 'sr-only'}>
        <div className="text-xs text-neutral-400">
          Audit‑ready · Expert‑reviewed · Adaptive · Private by default
        </div>
      </div>
    </div>
  );
}
```

### 16.2 `<TrustBadgesRow />`
- Sticky/subtle bottom row by default; always shown beneath input when `enterprise=true`.

```tsx
// components/ui/TrustBadgesRow.tsx
export function TrustBadgesRow({ visible = false }: { visible?: boolean }) {
  return (
    <div className={visible ? 'fixed inset-x-0 bottom-4 flex justify-center' : 'sr-only'}>
      <div className="px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-neutral-200 text-xs text-neutral-500">
        Audit‑ready · Expert‑reviewed · Adaptive · Private by default
      </div>
    </div>
  );
}
```

### 16.3 Module Card + Stack

```tsx
// components/ui/ModuleCard.tsx
export type Module = {
  id: string;
  title: string;
  summary?: string;
  estMinutes?: number;
};

export function ModuleCard({ m }: { m: Module }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
      <h3 className="font-semibold">{m.title}</h3>
      {m.summary && <p className="mt-1 text-sm text-neutral-600">{m.summary}</p>}
      {m.estMinutes && <p className="mt-2 text-xs text-neutral-400">~{m.estMinutes} min</p>}
    </article>
  );
}

// components/ui/ModuleStack.tsx
import { Module, ModuleCard } from './ModuleCard';

export function ModuleStack({ items }: { items: Module[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m) => <ModuleCard key={m.id} m={m} />)}
    </div>
  );
}
```

### 16.4 Page wireframe (App Router)

```tsx
// app/page.tsx (wireframe – replace existing hero if needed)
import { Suspense } from 'react';
import { InputAction } from '@/components/ui/InputAction';
import { TrustBadgesRow } from '@/components/ui/TrustBadgesRow';

export default function Home() {
  const enterprise = process.env.NEXT_PUBLIC_ENTERPRISE_MODE === 'true';
  return (
    <main className="min-h-[100svh] bg-neutral-50">
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Cerply</h1>
        </div>

        <InputAction enterprise={enterprise} onSubmit={() => { /* route to ingest */ }} />

        {/* Results zone (lazy) */}
        <Suspense fallback={<p className="mt-8 text-center text-sm text-neutral-500">Got it. Building your learning modules…</p>}>
          {/* <ModuleStack items={…} /> */}
        </Suspense>
      </section>

      <TrustBadgesRow visible={!enterprise /* subtle bottom row by default */} />
    </main>
  );
}
```

---

## 17) States & Progressive Disclosure

- **State A — Initial load (input only)**
  - Center input, micro‑copy below, subtle TrustBadgesRow at bottom (or prominent if `enterprise=true`).
- **State B — Input populated + processing**
  - After submit, show conversational line: “Got it. Building your learning modules…”
  - Keep screen uncluttered; spinner or skeletons optional.
- **State C — First set of modules displayed**
  - Show `ModuleStack` below input; retain input for adding more artefacts.
- **State D — Soft enterprise upsell**
  - After C, display a discreet banner: “Want this mapped to your compliance standard?” with CTA when enterprise features not enabled.

**Accessibility**
- `aria-label`s on input and buttons; high‑contrast focus rings; fully keyboard operable.

**Mobile**
- Ensure comfortable tap targets (≥44px), vertical rhythm, sticky trust badges avoid overlapping OS bars.

---

## 18) Acceptance Criteria Additions (UI)

- Initial home screen shows a **single input action** centered with rounded borders and cycling placeholders (3 exemplars). The **actual top bar** shows the reassurance line centered in italics: “Helping you master what matters.”
- Beneath the input, an **icon row** displays: Certified, Curate, Guild, Account, Upload (Upload emphasized). Enter key submits; on mobile a subtle “Learn it” button is acceptable as fallback.
- Drag‑drop **and** file upload **and** paste/URL are accepted; first submission triggers conversational “Got it…” message.
- After processing, first module set appears in **card stack**; layout scales from mobile to desktop.
- Trust badges text string appears:
  “Audit‑ready · Expert‑reviewed · Adaptive · Private by default”
  - **Staging/consumer:** subtle bottom row.
  - **Enterprise mode:** badges always visible under input (prominent) and SSO/connectors toggled on.
- Lighthouse a11y score ≥ 90 on home for mobile & desktop.
- No blocking CORS issues during ingest (proxy or signed upload per org policy).

---

- Discovery rails (“Popular searches”, “Cerply certified”) sit **below the chat area**, are **full-bleed and center-aligned**, and are **compact/low-contrast** with **ample spacing** from the chat section. Horizontal scrolling demonstrates multiple cards.
- The chat surface occupies the initial viewport (first screen) and supports vertical scrolling as the conversation grows.
- The composer shows **Upload** and **Send** on the right (compact); there is **no** “Press Enter…” helper text.
- The space between the typed opener and the input is visually tight (≈12–16px).

## 19) Build Plan Integration

- **Stack:** Next.js App Router + Tailwind (existing). Add components under `web/components/ui/…`.
- **Feature Flag:** `NEXT_PUBLIC_ENTERPRISE_MODE` (`'true'|'false'`) controls enterprise prominence.
- **Ingestion Hook:** Wire `InputAction.onSubmit` to existing proxy: `POST /api/ingest` (or interim edge canary).
- **Copy Tokens:** Centralize copy in `web/lib/copy.ts` for reuse and i18n later.
- **Styles:** Use brand tokens (already in `/style`). Avoid strong colour until modules appear.

---

## 20) Copy Blocks (for reuse)

**Placeholders**
- Paste your meeting notes…
- Upload a policy document…
- Drop in a podcast transcript…

**Reassurance (beneath input)**
- Cerply converts anything you give it into personalised micro‑learning and tests — so you remember what matters.

**Trust badges**
- Audit‑ready · Expert‑reviewed · Adaptive · Private by default


## 21) AI Interaction & Generation — Model Routing & Cost Envelope

### 20.1 Tasks → Models
- **Content generation (first pass)**: `generate.modules`, `generate.items` → **gpt-5** (quality-first).
- **Conversational clarify & micro rewrites**: `chat.clarify`, `rewrite.micro` → **gpt-5-mini** (fast, low-cost).
- **Grading & classification**: `score.answer` → **gpt-5-nano** (deterministic tone, very low cost).
- **Code-only** (no LLM): ID stamping, JSON schema validation, deterministic merges/transforms.

### 20.2 Cost (order-of-magnitude)
- **Generation** (~8k input, 2.5k output on gpt-5): ~**$0.035** per artefact.
- **Clarify turn** (mini): ~**$0.00085** per user turn.
- **Grading** (nano, per answer): ~**$0.00012**.
> Notes: Estimates assume average token sizes; enforce caps at router level.

### 20.3 Non-functional
- **Headers MUST be ASCII** (no typographic arrows) to avoid edge ByteString errors.
- **Retries**: one fast retry on transient 5xx; then degrade with typed JSON error.
- **Budgets/guardrails**: per-org daily token caps; per-request max_tokens per task.

## 22) API Surface for M3 (Preview, Generate, Score, Daily)

- `POST /api/preview` (mini): Accepts text/url/file ref; returns `{ summary, proposed_modules[], clarifying_questions[] }`.
- `POST /api/generate` (gpt-5 → mini): Accepts confirmed plan; returns **schema-valid** modules/items JSON.
- `POST /api/score` (nano): Accepts answers; returns rubric scores with difficulty & misconceptions (schema-valid).
- `GET  /api/daily/next` (selector): Returns prioritized queue based on recency/struggle/spaced repetition.
### 21.1 Retention v0 (Preview)

- `POST /api/certified/schedule` (sm2-lite): Accepts `{ session_id, plan_id, items[], prior?, algo?, now? }` and returns `{ order[], due, meta }`.
- `POST /api/certified/progress` (events): Accepts `{ session_id, card_id, action, grade?, at }` and upserts preview snapshot.
- `GET  /api/certified/progress?sid=`: Returns `{ session_id, items[] }` snapshot for resume.

Web integration (preview): `/certified/study` calls schedule on start/reset, posts progress on flip/grade, and resumes from server snapshot when local is empty. Settings drawer exposes algo label and a local daily-target value.


### Acceptance
- Each endpoint returns 200 on valid input; JSON matches the corresponding schema.
- Token usage and model name are logged per request; daily aggregates exposed to ops.

### 21.2 Adaptive Planner Engine v1 (Preview)

- Engine selection: If `FF_ADAPTIVE_ENGINE_V1=true` and `PLANNER_ENGINE=adaptive`, PLAN uses `adaptive-v1` (deterministic; no schema change). Response `provenance.engine: "adaptive-v1"`.
- Evaluator: `npm -w api run -s planner:eval:adaptive` writes metrics to `api/tests/fixtures/planner-eval.adaptive.json`.

### 21.3 OpenAI Planner Adapter v0 (Preview)

- Engine selection: If `FF_OPENAI_ADAPTER_V0=true` and `PLANNER_ENGINE=openai`, PLAN uses `openai-v0` (preview; deterministic fallback when no key). Response `provenance.engine: "openai-v0"`.
- Evaluator: `npm -w api run -s planner:eval:openai` writes metrics to `api/tests/fixtures/planner-eval.openai.json`.
- CI: Offline eval always runs; optional keyed smoke when secret exists.
## 23) Backlog (Next 10)

1. LLM router + runner stubs (`api/src/llm/*`).
2. JSON schemas: `modules.schema.json`, `score.schema.json`.
3. Generation pipeline (two-pass + validation).
4. Preview pipeline (summary + clarify Qs).
5. Scoring pipeline (batch).
6. Daily selector with weights: recency 0.55, struggle 0.35, spaced_rep 0.10.
7. API endpoints wiring + tests.
8. Token/cost logging + per-org caps.
9. UI hooks: input → preview → confirm → generate → score.
10. Enterprise upsell banner post-first-generation.
