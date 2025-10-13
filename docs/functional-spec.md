## Requirements Source & Traceability
- **SSOT:** [docs/specs/mvp-use-cases.md](specs/mvp-use-cases.md) - Single source of truth for MVP use cases
- **Traceability Matrix:** [docs/specs/traceability-matrix.md](specs/traceability-matrix.md) - Complete mapping of SSOT items to implementation

## Platform Foundations
- **Engineering Principles:** [docs/platform/principles.md](platform/principles.md) - Core engineering principles and quality standards
- **Interaction Contract:** [docs/platform/interaction-contract.md](platform/interaction-contract.md) - Natural language interaction patterns and UX rules
- **Quality-First Pipeline:** [docs/platform/quality-first-pipeline.md](platform/quality-first-pipeline.md) - Content generation and canonization processes
- **Cost Orchestration:** [docs/platform/cost-orchestration.md](platform/cost-orchestration.md) - Model tiers and budget optimization
- **CI Guardrails:** [docs/platform/ci-guardrails.md](platform/ci-guardrails.md) - Automated enforcement mechanisms

## 8) Platform Foundations v1 (IMPLEMENTED)

**Covers SSOT:** All MVP use cases - Establishes foundational principles and quality gates

**Status:** ✅ IMPLEMENTED - Platform foundations codified and enforced

**Implementation Summary:**
- **Engineering Principles:** Quality-first, adaptive-by-default, AI-first, cost-aware, natural interactions
- **Interaction Engine:** Natural language router and dynamic microcopy generator
- **Quality-First Pipeline:** Canon storage with ensemble generation and reuse optimization
- **Cost Orchestration:** Tiered model usage with budget management
- **CI Guardrails:** Automated enforcement of all platform principles

**Key Features:**
- Natural language commands: "shorter", "bullets", "I have 15 mins", "explain like I'm 12"
- Dynamic microcopy generation with brand voice consistency
- Canonical content storage with quality scoring and reuse
- Cost-aware model selection (nano/mini/standard/ensemble tiers)
- Automated quality floor enforcement
- No templating enforcement (only INTRO_COPY allowed as static string)

**Technical Achievements:**
- **Interaction Router:** Lightweight intent parsing with 90% confidence routing
- **Microcopy Service:** Context-aware copy generation with 5-minute caching
- **Canon Store:** In-memory implementation with semantic search and quality metrics
- **Quality Evaluation:** Multi-metric scoring (coherence, coverage, accuracy, pedagogy)
- **CI Integration:** 6 guardrail tests preventing principle regression

**Acceptance Evidence:**
```bash
# Natural language commands work
curl -X POST "https://api-stg.cerply.com/api/generate" \
  -H 'content-type: application/json' \
  -d '{"modules":[{"title":"test","estimated_items":2}]}'
# Returns: {"modules":[...], "metadata":{"source":"fresh","modelTier":"gpt-5","qualityFirst":true}}

# Canon reuse works
curl -X POST "https://api-stg.cerply.com/api/generate" \
  -H 'content-type: application/json' \
  -d '{"modules":[{"title":"test","estimated_items":2}]}'
# Returns: {"modules":[...], "metadata":{"source":"canon","modelTier":"gpt-4o-mini","canonized":true}}
```

**Documentation:**
- Platform principles: `docs/platform/principles.md`
- Interaction patterns: `docs/platform/interaction-contract.md`
- Quality pipeline: `docs/platform/quality-first-pipeline.md`
- Cost optimization: `docs/platform/cost-orchestration.md`
- CI enforcement: `docs/platform/ci-guardrails.md`

## 9) Certified v1 API (COMPLETED)

**Covers SSOT:** E-3, E-4, A-7, A-8, A-9 (Expert certification and admin content management)

**Epic Status:** ✅ COMPLETED - Deployed to staging and merged to main

**Implementation Summary:**
- **Admin Publish:** `POST /api/certified/items/:itemId/publish` with Ed25519 signing, rate limiting (10 req/min), and idempotent publishing
- **Public Artifacts:** `GET /api/certified/artifacts/:artifactId` (JSON with ETag/Cache-Control) and `GET /api/certified/artifacts/:artifactId.sig` (binary signature)
- **Public Verification:** `POST /api/certified/verify` supporting artifact ID lookup, inline signature validation, and legacy plan-lock verification
- **Plan Generation:** `POST /api/certified/plan` with content-type validation (415), payload size limits (413), and rate limiting (429)

**Technical Achievements:**
- **CDN-Ready:** ETag headers and `Cache-Control: public, max-age=300, must-revalidate` for efficient content delivery
- **CORS Compliance:** `Access-Control-Allow-Origin: *` with credentials removal across all public endpoints
- **Database Resilience:** Graceful SQLite fallback when DATABASE_URL is missing, preventing 500 errors
- **Container Compatibility:** Fixed Prisma/OpenSSL compatibility by migrating from Alpine to Debian Bullseye
- **Security Headers:** Comprehensive headers (COOP/CORP/XFO) when `SECURITY_HEADERS_PREVIEW=true`

**Acceptance Evidence:**
```bash
# Artifact endpoints return proper 404s with CORS headers
curl -sI "https://api-stg.cerply.com/api/certified/artifacts/unknown-id"
# HTTP/2 404, access-control-allow-origin: *

# Verify endpoint handles all three verification cases
curl -si -X POST "https://api-stg.cerply.com/api/certified/verify" \
  -H 'content-type: application/json' \
  -d '{"artifactId":"does-not-exist"}'
# HTTP/2 404, x-cert-verify-hit: 1

# Plan endpoint enforces content-type validation
curl -sX POST "https://api-stg.cerply.com/api/certified/plan" \
  -H 'content-type: text/plain' \
  -d '{"topic":"test"}'
# HTTP 415, UNSUPPORTED_MEDIA_TYPE
```

**Documentation:**
- Full API contract: `docs/certified/README.md`
- OpenAPI specification: `docs/certified/openapi.yaml`
- Runbook and troubleshooting guides included

## 10) Acceptance criteria
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

**Covers SSOT:** L-3 (Learner login requirement for progress tracking)

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

**Covers SSOT:** AU-1, AU-2, AU-3, AU-4, L-1, L-2, B-1, B-4 (Core user interfaces and workflows)

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

## 21) API Surface for M3 (Preview, Generate, Score, Daily) — ✅ IMPLEMENTED (Preview)

**Covers SSOT:** L-1, L-2, L-6, L-7, L-11, L-12, L-15 (Learning flow and adaptive content)

**Status:** Implemented 2025-01-05 | See `EPIC_M3_API_SURFACE.md` | Smoke: `api/scripts/smoke-m3.sh`

## 22) Learner MVP UI (Unified /learn Experience) — ✅ IMPLEMENTED

**Covers SSOT:** L-1 to L-14 (Full learner flow from topic input to session completion)

**Status:** Implemented 2025-10-06 | Epic: `EPIC_LEARNER_MVP_UI_V1`

**Summary:** 
New `/learn` page that replaces `/certified/study` with a complete, production-ready learner interface. Integrates all M3 API endpoints (preview, generate, score, schedule, progress) into a unified flow: input → preview → auth gate → session → completion.

**Key Features:**
- **L-1:** Topic input (prompt/paste/link, upload button stub)
- **L-2:** Preview (summary + modules + clarifying questions)
- **L-3:** Auth gate (blocks unauthenticated start)
- **L-4:** Session creation (schedule + daily queue)
- **L-5:** Card UI (flip → grade → feedback → auto-advance)
- **L-6:** Explain/Why button (shows misconceptions from score API)
- **L-7:** Simple adaptation (level badge: beginner → expert based on accuracy)
- **L-8:** CORS handling + user-friendly error messages
- **L-9:** Fallback content (>400ms → "While You Wait" box)
- **L-10:** Completion screen (after target items, offer finish/continue)
- **L-11:** Session persistence (localStorage sid, manual resume)
- **L-12:** Idempotent progress upsert (handled by API)
- **L-13:** NL Ask Cerply (right-rail chat, stub responses)
- **L-14:** Keyboard navigation + full a11y (ARIA, focus, screen reader)

**Files:**
- `web/app/learn/page.tsx` (600+ lines, 4 phases, fully typed)
- `web/lib/copy.ts` (centralized microcopy, 15 keys)
- `web/e2e/learner.spec.ts` (17 E2E scenarios)
- `web/scripts/smoke-learner.sh` (10 smoke checks)
- `docs/uat/LEARNER_MVP_UAT.md` (10 UAT scenarios)

**Test Coverage:**
- **E2E:** 17 Playwright scenarios (input → preview → auth → session → cards → chat → completion + edge cases)
- **Smoke:** 10 checks (page load, elements present, logic validation)
- **UAT:** 10 stakeholder scenarios with step-by-step instructions

**Acceptance:**
- ✅ All 14 criteria (L-1 to L-14) implemented
- ✅ 17 E2E scenarios pass locally
- ✅ 10 smoke checks pass
- ✅ Keyboard + screen reader accessible
- ⏳ CI integration pending
- ⏳ Stakeholder UAT pending

**Performance:**
- Page load: <2s (target: <2s) ✅
- Preview API: <3s (target: <3s) ✅
- Generate API: <5s (target: <5s) ✅
- Score API: <1s (target: <1s) ✅

**Migration:**
- `/certified/study` marked deprecated in `web/README.md`
- New work should use `/learn`
- Legacy route kept for reference only

**Documentation:**
- `web/README.md` updated with `/learn` flow + setup
- `DELIVERY_SUMMARY_LEARNER_MVP.md` full delivery report
- `docs/uat/LEARNER_MVP_UAT.md` UAT script for stakeholders

**Next Steps:**
1. Push to staging, verify CI passes
2. Deploy to Vercel staging
3. Run smoke tests on staging
4. Stakeholder UAT (1-2 days)
5. Fix any P0/P1 bugs
6. Merge to main, deploy to production

- `POST /api/preview` (mini): Accepts text/url/file ref; returns `{ summary, proposed_modules[], clarifying_questions[] }`. ✓
- `POST /api/generate` (gpt-5 → mini): Accepts confirmed plan; returns **schema-valid** modules/items JSON. ✓
- `POST /api/score` (nano): Accepts answers; returns rubric scores with difficulty & misconceptions (schema-valid). ✓
- `GET  /api/daily/next` (selector): Returns prioritized queue based on recency/struggle/spaced repetition. ✓
- `GET /api/ops/usage/daily`: Returns per-route token/cost aggregates (today, yesterday). ✓

### 21.1 Retention v0 (Preview) — ✅ IMPLEMENTED

**Status:** Implemented 2025-01-05 | Web: `/certified/study` | Tests: `api/tests/m3.test.ts`

- `POST /api/certified/schedule` (sm2-lite): Accepts `{ session_id, plan_id, items[], prior?, algo?, now? }` and returns `{ order[], due, meta }`. ✓
- `POST /api/certified/progress` (events): Accepts `{ session_id, card_id, action, grade?, at }` and upserts preview snapshot. ✓
- `GET  /api/certified/progress?sid=`: Returns `{ session_id, items[] }` snapshot for resume. ✓

Web integration (preview): `/certified/study` calls schedule on start/reset, posts progress on flip/grade, and resumes from server snapshot when local is empty. ✓


### Acceptance ✓
- Each endpoint returns 200 on valid input; JSON matches the corresponding schema. ✓
- Token usage and model name are logged per request; daily aggregates exposed to ops via `/api/ops/usage/daily`. ✓
- 4xx validation covered (no 404s for defined routes). ✓
- Smoke tests pass (31/31 assertions). ✓
- `/certified/study` can run preview flow end-to-end. ✓

### 21.2 Adaptive Planner Engine v1 (Preview)

- Engine selection: If `FF_ADAPTIVE_ENGINE_V1=true` and `PLANNER_ENGINE=adaptive`, PLAN uses `adaptive-v1` (deterministic; no schema change). Response `provenance.engine: "adaptive-v1"`.
- Evaluator: `npm -w api run -s planner:eval:adaptive` writes metrics to `api/tests/fixtures/planner-eval.adaptive.json`.

### 21.3 OpenAI Planner Adapter v0 (Preview)

- Engine selection: If `FF_OPENAI_ADAPTER_V0=true` and `PLANNER_ENGINE=openai`, PLAN uses `openai-v0` (preview; deterministic fallback when no key). Response `provenance.engine: "openai-v0"`.
- Evaluator: `npm -w api run -s planner:eval:openai` writes metrics to `api/tests/fixtures/planner-eval.openai.json`.
- CI: Offline eval always runs; optional keyed smoke when secret exists.
## 22A) OKR Alignment (Authoritative)

> Purpose: Make OKRs enforceable from the spec itself. These KRs are measured via explicit events, metrics, and endpoints so delivery cannot drift from business value.

### O1. Be the trusted engine for learning anything, with retention that sticks.
- **KR1.1** ≥80% of learners complete ≥1 scheduled review in week one.
  - **Signals**: `review.completed` events within 7 days of first learn; denominator = unique `session_id` with ≥1 generated item.
  - **Metric**: `okr.o1.kr1_1_w1_review_rate`.
- **KR1.2** ≥60% retention at 30 days (spaced recall).
  - **Signals**: `review.graded` for items due at ≥30 days; correct/incorrect.
  - **Metric**: `okr.o1.kr1_2_retention_30d`.
- **KR1.3** TTFP (artefact → first plan) p95 < 60s.
  - **Signals**: `ingest.received` → `plan.ready` (first); p95.
  - **Metric**: `okr.o1.kr1_3_ttfp_p95_seconds`.
- **KR1.4** Median learner satisfaction ≥70.
  - **Signals**: `feedback.submitted { score: 0–100 }` post‑session.
  - **Metric**: `okr.o1.kr1_4_satisfaction_median`.

### O2. Establish Cerply Certified as the gold standard for horizontal topics.
- **KR2.1** ≥150 Certified items published in 6 months.
  - **Signals**: `certified.item.published`.
  - **Metric**: `okr.o2.kr2_1_items_total`.
- **KR2.2** ≥5 high‑value domains covered (e.g., compliance, data protection, safety, finance basics, onboarding).
  - **Signals**: `certified.domain.enabled { domain_id }`.
  - **Metric**: `okr.o2.kr2_2_domains_count`.
- **KR2.3** 100% Certified items have expert ratification + audit trail.
  - **Signals**: `certified.item.ratified { expert_id, audit_uri }`.
  - **Metric**: `okr.o2.kr2_3_ratified_pct`.
- **KR2.4** ≥3 design‑partner orgs adopt Certified packs in pilots.
  - **Signals**: `org.pack.deployed { org_id, pack_id, plan: "pilot" }`.
  - **Metric**: `okr.o2.kr2_4_design_partners`.

### O3. Build enterprise‑grade adoption and monetization (D2B).
- **KR3.1** ≥3 paying enterprise pilots.
  - **Signals**: `billing.subscription.created { plan: "pilot_paid" }`.
  - **Metric**: `okr.o3.kr3_1_paying_pilots`.
- **KR3.2** ≥50% pilot → paid conversion.
  - **Signals**: `pilot.closed { outcome: "won|lost" }`.
  - **Metric**: `okr.o3.kr3_2_pilot_conversion_rate`.
- **KR3.3** ≥95% uptime; SSO + audit logs live.
  - **Signals**: uptime from ops monitor; feature flags `FF_SSO`, `FF_AUDIT_LOGS`.
  - **Metrics**: `okr.o3.kr3_3_uptime_pct`, boolean checks for SSO/audit endpoints.
- **KR3.4** Pricing benchmark ≥20% lower than average LMS pilot alternatives while maintaining margins.
  - **Signals**: `deal.benchmark.recorded { competitor, price_per_seat }`.
  - **Metric**: `okr.o3.kr3_4_price_delta_pct`.

### O4. Leverage consumer use (D2C) as data + funnel, not revenue.
- **KR4.1** D2C waitlist ≥5,000.
  - **Signals**: `waitlist.joined`.
  - **Metric**: `okr.o4.kr4_1_waitlist_total`.
- **KR4.2** ≥1,000 weekly active learners.
  - **Signals**: `session.active` (weekly unique).
  - **Metric**: `okr.o4.kr4_2_wau`.
- **KR4.3** ≥25% of learners export/share a module.
  - **Signals**: `module.exported|module.shared` per learner.
  - **Metric**: `okr.o4.kr4_3_share_export_rate`.
- **KR4.4** ≥20 Certified topics originate from D2C patterns.
  - **Signals**: `certified.topic.created { source: "d2c_insight" }`.
  - **Metric**: `okr.o4.kr4_4_topics_from_d2c`.

### O5. Demonstrate defensibility through certification + telemetry.
- **KR5.1** 100% of Certified items include lineage + citations.
  - **Signals**: `certified.item.published { lineage:[], citations:[] }` non‑empty.
  - **Metric**: `okr.o5.kr5_1_lineage_coverage_pct`.
- **KR5.2** ≥1 external validation study published.
  - **Signals**: `evidence.study.published { uri }`.
  - **Metric**: `okr.o5.kr5_2_studies_count`.
- **KR5.3** Telemetry dashboard live with daily token use, cost, retention outcomes.
  - **Signals**: ETL to ops store.
  - **Metric**: `okr.o5.kr5_3_dashboard_ok` boolean health.
- **KR5.4** ≥2 industry associations accept Cerply Certified for CPD/CE.
  - **Signals**: `cpe.provider.accepted { association }`.
  - **Metric**: `okr.o5.kr5_4_associations_count`.

---

### Instrumentation & API Requirements
- **Events schema**: Emit the signals above via `api/src/events/*.ts` with fields shown. Persist to append‑only NDJSON (preview) or durable store when flagged.
- **Metrics endpoint**: `GET /api/ops/kpis` returns JSON `{ o1:{ kr1_1:..., kr1_2:..., kr1_3:..., kr1_4:... }, o2:{...}, ... }` with timestamps and denominators. Must return 200; never 404.
- **Uptime source**: Integrate ops monitor (Render/Healthcheck) and expose `uptime_30d` inside `/api/ops/kpis`.
- **Feature flags**: `FF_SSO`, `FF_AUDIT_LOGS`, `FF_OKR_METRICS=true` gate non‑essential features but **/api/ops/kpis** must exist when flag on.

### Acceptance (22A)
- `GET /api/ops/kpis` returns 200 JSON with all KRs present; includes `generated_at` ISO timestamp.
- p95 TTFP (`okr.o1.kr1_3_ttfp_p95_seconds`) < 60 on staging demo dataset.
- Ratification coverage (`okr.o2.kr2_3_ratified_pct`) = 100% for all items with status `published`.
- Dashboard health (`okr.o5.kr5_3_dashboard_ok`) reports `true` and includes daily token + cost aggregates.
- CI smoke `scripts/smoke-okr.sh` (to be added) asserts presence and schema of `/api/ops/kpis`.

### Verification
- Local: `curl -sS http://localhost:3001/api/ops/kpis | jq` → check KR fields.
- Staging: `curl -sS "$STG/api/ops/kpis" -H "x-vercel-protection-bypass: $TOKEN" | jq`.
- Logs: verify events emitted for `review.completed`, `certified.item.published`, ratifications, and billing events.


## 22B) Regulatory Scanner v0

> MVP for ingesting and scanning policy, legal, or regulatory documents for critical changes, obligations, and compliance triggers.

- **Input:** PDF, DOCX, or pasted text (policy, regulation, SOP, etc.).
- **Processing:**
  - Extracts obligations, deadlines, and compliance requirements.
  - Flags changes vs. previous versions (if supplied).
  - Identifies responsible parties and key risk areas.
- **Output:**
  - Structured JSON: `{ obligations:[], deadlines:[], triggers:[], changes:[], risk_areas:[] }`
  - UI: Renders a summary table and highlights new/changed obligations.
- **Acceptance:**
  - Upload/scan completes in <90s for <50pp docs.
  - Minimum 80% precision on obligations extraction (manual eval, 10 test docs).
  - Change detection works for redlines or prior version diffs.
  - API: `POST /api/regscan/scan` returns structured results; never 404.

## 22C) Content Atom Schema v0

> Foundation for all micro-learning and compliance content, supporting modularity, versioning, and audit.

- **Atom:** The base unit of content (lesson, quiz item, obligation, etc.).
- **Schema:**
  - `id`, `type`, `body`, `source_ref`, `created_at`, `updated_at`, `version`, `lineage`, `citations`, `tags`, `status`.
  - Types include: `lesson`, `quiz_item`, `obligation`, `policy_change`, `note`, `evidence`.
- **Audit Trail:**
  - Every atom links to source(s) and prior version(s).
  - All certified atoms must have non-empty `lineage` and at least one `citation` (see OKR 5.1).
- **Acceptance:**
  - All generated modules and certified items conform to schema (validated at API boundary).
  - Versioning and audit fields are present and populated for every atom in `/api/certified/*` and `/api/coverage`.
  - Schema published at `/api/schema/content-atom.json` (never 404).

## 22D) Channel Adapters v0

### Purpose
Enable the adaptive coach to deliver and receive lessons through multiple user channels (web, desktop, mobile, chat) without duplicating business logic.

### Architecture
- **Coach-core API:** `/api/coach/next` returns channel-neutral JSON payloads { lessonAtom, format, options }.
- **Adapters:** Separate micro-modules translate payloads into native messages:
  - Web/Desktop → HTML or React components.
  - Slack → Block Kit cards.
  - Teams → Adaptive Cards.
  - WhatsApp/Telegram → text + buttons.
- **Inbound Replies:** Each adapter exposes a webhook (`/api/coach/reply/:channel`) to relay answers back to the coach.
- **Telemetry:** All channels emit `lesson.presented` and `lesson.answered` events with identical structure.
- **Feature Flags:** `FF_CHANNEL_SLACK`, `FF_CHANNEL_TEAMS`, `FF_CHANNEL_WHATSAPP` control availability.

### API Surface
- `POST /api/coach/next`
  - Input: { user_id, context, channel }
  - Output: { lessonAtom, format, options, expiry }
- `POST /api/coach/reply/:channel`
  - Input: { lesson_id, response }
  - Output: { next_lesson_id }

### Acceptance (22D)
- Coach plan delivered via at least two channels (web + Slack) sharing lesson state.
- Events `lesson.presented` and `lesson.answered` captured from both channels.
- Smoke test `scripts/smoke-channels.sh` ensures each adapter responds HTTP 200.

### Verification
- Local: `curl -sS http://localhost:3001/api/coach/next -d '{"user_id":"u1","channel":"slack"}' | jq`
- Staging: `curl -sS "$STG/api/coach/next" -H "x-channel: teams" | jq`
- CI: `bash scripts/smoke-channels.sh`

## 23) Team Management & Assignments v1 — ✅ IMPLEMENTED

**Covers BRD:** B3 Group Learning (Manager assigns learners to tracks)

**Status:** Implemented 2025-10-07 | Epic: `EPIC3_PROGRESS_SUMMARY` | Tests: `api/tests/team-mgmt.test.ts`

**Summary:**
Complete API surface for B2B Enterprise team management: create teams, bulk import learners (JSON/CSV), assign tracks with cadence (daily/weekly/monthly), view team metrics, and track via operational KPIs. All routes support RBAC (admin/manager), idempotency, and event logging.

**Key Features:**
- **GET /api/teams**: List all teams in the organization (manager or admin)
- **POST /api/teams**: Create teams within an organization (manager or admin)
- **POST /api/teams/:id/members**: Bulk import learners via JSON array or CSV upload (auto-creates users with learner role)
- **POST /api/teams/:id/subscriptions**: Assign a track to a team with cadence (daily/weekly/monthly)
- **GET /api/teams/:id/overview**: Team metrics (members count, active tracks, due today, at-risk learners)
- **GET /api/tracks**: List canonical (org_id=NULL) and organization-specific tracks
- **GET /api/ops/kpis**: Operational KPIs for OKR tracking (O3: teams_total, members_total, active_subscriptions)

**Database Schema:**
```sql
-- Tracks table (canonical + org-specific)
tracks (
  id UUID PRIMARY KEY,
  organization_id UUID, -- NULL = canonical/shared
  title TEXT,
  plan_ref TEXT, -- e.g. 'canon:arch-std-v1'
  certified_artifact_id UUID,
  created_at, updated_at
)

-- Team track subscriptions
team_track_subscriptions (
  id UUID PRIMARY KEY,
  team_id UUID,
  track_id UUID,
  cadence TEXT CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  start_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  UNIQUE(team_id, track_id)
)
```

**API Contracts:**

### GET /api/teams
List all teams in the organization.

**RBAC:** admin or manager

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Engineering Team",
    "org_id": "550e8400-e29b-41d4-a716-446655440001",
    "manager_id": "550e8400-e29b-41d4-a716-446655440002",
    "created_at": "2025-10-07T12:00:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Marketing Team",
    "org_id": "550e8400-e29b-41d4-a716-446655440001",
    "manager_id": "550e8400-e29b-41d4-a716-446655440004",
    "created_at": "2025-10-07T13:00:00Z"
  }
]
```

**Errors:**
- 401 UNAUTHORIZED: authentication required
- 403 FORBIDDEN: requires manager or admin role
- 500 INTERNAL_ERROR: failed to list teams

### POST /api/teams
Create a new team.

**RBAC:** admin or manager  
**Idempotency:** X-Idempotency-Key supported

**Request:**
```json
{
  "name": "Engineering Team"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Engineering Team",
  "org_id": "550e8400-e29b-41d4-a716-446655440001",
  "manager_id": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2025-10-07T12:00:00Z"
}
```

**Errors:**
- 400 INVALID_INPUT: name is required
- 401 UNAUTHORIZED: authentication required
- 403 FORBIDDEN: requires manager or admin role
- 500 INTERNAL_ERROR: failed to create team

### POST /api/teams/:id/members
Add members to a team (JSON or CSV bulk import).

**RBAC:** admin or team manager  
**Content-Type:** application/json OR text/csv  
**Idempotency:** Per-email (won't add duplicates)

**Request (JSON):**
```json
{
  "emails": ["alice@example.com", "bob@example.com"]
}
```

**Request (CSV):**
```csv
alice@example.com
bob@example.com
charlie@example.com
```

**Response (200):**
```json
{
  "added": ["alice@example.com", "bob@example.com"],
  "skipped": ["charlie@example.com"],
  "errors": [
    {
      "email": "invalid@",
      "reason": "Invalid email format"
    }
  ]
}
```

**Behavior:**
- Creates users with learner role if they don't exist
- Skips users already in the team (idempotent)
- Emits `member.added` event for each success

**Errors:**
- 400 INVALID_CONTENT_TYPE: must be application/json or text/csv
- 400 INVALID_INPUT: no emails provided
- 404 NOT_FOUND: team not found
- 403 FORBIDDEN: can only manage your own teams
- 500 INTERNAL_ERROR: failed to add members

### POST /api/teams/:id/subscriptions
Subscribe a team to a track with cadence.

**RBAC:** admin or team manager

**Request:**
```json
{
  "track_id": "00000000-0000-0000-0000-000000000100",
  "cadence": "daily",
  "start_at": "2025-10-07T00:00:00Z"
}
```

**Response (200):**
```json
{
  "subscription_id": "550e8400-e29b-41d4-a716-446655440003",
  "next_due_at": "2025-10-08T00:00:00Z"
}
```

**Cadence Values:**
- `daily`: next_due_at = start_at + 1 day
- `weekly`: next_due_at = start_at + 7 days
- `monthly`: next_due_at = start_at + 1 month

**Errors:**
- 400 INVALID_INPUT: track_id and cadence required; cadence must be daily/weekly/monthly
- 404 NOT_FOUND: team or track not found
- 403 FORBIDDEN: can only manage your own teams
- 409 ALREADY_SUBSCRIBED: team already subscribed to this track
- 500 INTERNAL_ERROR: failed to create subscription

### GET /api/teams/:id/overview
Get team metrics and overview.

**RBAC:** admin or team manager

**Response (200):**
```json
{
  "members_count": 25,
  "active_tracks": 3,
  "due_today": 8,
  "at_risk": 2
}
```

**Headers:**
- `x-overview-latency-ms`: query latency in milliseconds

**Errors:**
- 404 NOT_FOUND: team not found
- 403 FORBIDDEN: can only view your own teams
- 500 INTERNAL_ERROR: failed to get overview

### GET /api/tracks
List canonical and organization-specific tracks.

**RBAC:** admin or manager

**Response (200):**
```json
[
  {
    "id": "00000000-0000-0000-0000-000000000100",
    "title": "Architecture Standards – Starter",
    "source": "canon",
    "plan_ref": "canon:arch-std-v1"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "title": "Onboarding Q4 2025",
    "source": "org",
    "plan_ref": "plan:550e8400-e29b-41d4-a716-446655440011"
  }
]
```

**Source Types:**
- `canon`: Canonical track (organization_id = NULL) shared across all orgs
- `org`: Organization-specific track

**Errors:**
- 401 UNAUTHORIZED: authentication required
- 403 FORBIDDEN: requires manager or admin role
- 500 INTERNAL_ERROR: failed to list tracks

### GET /api/ops/kpis
Get operational KPIs for OKR tracking (see §22A).

**Response (200):**
```json
{
  "o3": {
    "teams_total": 12,
    "members_total": 150,
    "active_subscriptions": 28
  },
  "generated_at": "2025-10-07T12:00:00Z"
}
```

**KPI Definitions (O3 - Enterprise Adoption):**
- `teams_total`: Total teams created across all organizations
- `members_total`: Total learners assigned to teams
- `active_subscriptions`: Total active team-track subscriptions (active=true)

**Technical Implementation:**

**Services:**
- `api/src/services/events.ts`: Event emission to append-only NDJSON log (team.created, member.added, subscription.created)
- `api/src/services/idempotency.ts`: In-memory idempotency cache (24hr TTL) for X-Idempotency-Key header

**Event Schema:**
```typescript
interface TeamEvent {
  type: 'team.created' | 'member.added' | 'subscription.created';
  timestamp: string; // ISO 8601
  payload: {
    // type-specific fields
  };
}
```

**Event Log:**
- Default path: `./events.ndjson` (append-only)
- Configurable via `EVENTS_LOG_PATH` environment variable
- Enable/disable via `EVENTS_ENABLED` (default: true)

**RBAC:**
- Uses Epic 2 middleware: `requireManager()`, `getSession()`
- Admin token bypass: `X-Admin-Token` header or `Authorization: Bearer <ADMIN_TOKEN>`
- Default admin token (dev): `dev-admin-token-12345`

**Feature Flags:**
- `FF_TEAM_MGMT=true`: Gates team management routes (optional; routes active by default)
- `AUTH_REQUIRE_SESSION=true`: Enforces session authentication (Epic 2)

**CSV Upload Details:**
- Content-Type: `text/csv`
- Format: One email per line
- Empty lines and lines without `@` are ignored
- Creates users automatically with learner role
- Idempotent: skips existing team members

**Test Coverage:**
- **Unit Tests:** `api/tests/team-mgmt.test.ts` (15+ scenarios covering CRUD, RBAC, CSV upload, idempotency, error cases)
- **Smoke Test:** `api/scripts/smoke-team-mgmt.sh` (8 scenarios: create team, add members JSON/CSV, subscribe track, overview, tracks list, KPIs, unauthorized access)
- **UAT Guide:** `docs/uat/EPIC3_UAT.md` (9 manual test scenarios with step-by-step instructions)

**Acceptance Evidence:**

```bash
# List teams
curl -sS http://localhost:8080/api/teams \
  -H 'x-admin-token: dev-admin-token-12345' | jq
# Returns: [{"id":"...", "name":"Engineering Team", "org_id":"...", "manager_id":"...", "created_at":"..."}]

# Create team
curl -sS -X POST http://localhost:8080/api/teams \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{"name":"Engineering Team"}' | jq
# Returns: {"id":"...", "name":"Engineering Team", "org_id":"...", "manager_id":"...", "created_at":"..."}

# Add members (JSON)
curl -sS -X POST http://localhost:8080/api/teams/<TEAM_ID>/members \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{"emails":["alice@example.com","bob@example.com"]}' | jq
# Returns: {"added":["alice@example.com","bob@example.com"], "skipped":[], "errors":null}

# Add members (CSV)
curl -sS -X POST http://localhost:8080/api/teams/<TEAM_ID>/members \
  -H 'content-type: text/csv' \
  -H 'x-admin-token: dev-admin-token-12345' \
  --data-binary $'charlie@example.com\ndave@example.com' | jq
# Returns: {"added":["charlie@example.com","dave@example.com"], "skipped":[], "errors":null}

# Assign track to team
curl -sS -X POST http://localhost:8080/api/teams/<TEAM_ID>/subscriptions \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{"track_id":"00000000-0000-0000-0000-000000000100","cadence":"daily"}' | jq
# Returns: {"subscription_id":"...", "next_due_at":"2025-10-08T...Z"}

# Get team overview
curl -sS http://localhost:8080/api/teams/<TEAM_ID>/overview \
  -H 'x-admin-token: dev-admin-token-12345' | jq
# Returns: {"members_count":4, "active_tracks":1, "due_today":0, "at_risk":0}

# List tracks
curl -sS http://localhost:8080/api/tracks \
  -H 'x-admin-token: dev-admin-token-12345' | jq
# Returns: [{"id":"...", "title":"Architecture Standards – Starter", "source":"canon", "plan_ref":"canon:arch-std-v1"}]

# Get KPIs
curl -sS http://localhost:8080/api/ops/kpis | jq
# Returns: {"o3":{"teams_total":1,"members_total":4,"active_subscriptions":1},"generated_at":"..."}
```

**Documentation:**
- **BRD:** `docs/brd/cerply-brd.md` (B3 marked DELIVERED, changelog added)
- **Runbook:** `RUNBOOK_team_mgmt.md` (migrations, CSV import tips, troubleshooting)
- **UAT Guide:** `docs/uat/EPIC3_UAT.md` (9 manual test scenarios)
- **Progress Summary:** `EPIC3_PROGRESS_SUMMARY.md` (implementation log)

**Next Steps (Future Epics):**
1. **Manager UI:** `/admin/teams` pages for team creation, member management, track assignment
2. **Analytics Dashboard:** Team progress tracking, engagement metrics, completion rates
3. **Email Notifications:** Welcome emails for new members, reminders for due items
4. **Track Templates:** Reusable track templates for common use cases (onboarding, compliance, skills)
5. **Batch Operations:** Bulk team creation, multi-team assignments
6. **Integration with M3:** Wire `due_today` and `at_risk` metrics to M3 daily selector and retention logic

**Changelog:**
- **2025-10-08:** Added GET /api/teams route to list all teams in organization; fixed RBAC double-reply errors; added session fallback pattern for admin token auth across all team management routes; completed UAT with 9 test scenarios (all passed).
- **2025-10-07:** Epic 3 delivered — Team Management & Learner Assignment API complete with 6 routes, event logging, idempotency, RBAC, CSV import, and operational KPIs (O3).

---

## 24) Manager Dashboard & Analytics v1 — ✅ IMPLEMENTED

**Covers BRD:** B-2, B-14 (Manager tracking team progress and risk metrics)

**Status:** Implemented 2025-10-08 | Epic: `EPIC4_PROMPT` | Tests: `api/tests/manager-analytics.test.ts`, `api/scripts/smoke-analytics.sh`

**Summary:**
Complete analytics dashboard for B2B managers and admins providing team comprehension metrics, at-risk learner identification, retention curves, track performance breakdown, and organization-level overview with CSV/JSON export capability. All routes support RBAC, caching, pagination, and observability headers.

**Key Features:**
- Team analytics with comprehension trending (`GET /api/manager/teams/:teamId/analytics`)
- At-risk learner identification (`GET /api/manager/teams/:teamId/at-risk`)
- Retention curve analysis for D0/D7/D14/D30 (`GET /api/manager/teams/:teamId/retention`)
- Per-track performance breakdown (`GET /api/manager/teams/:teamId/performance`)
- Organization-level analytics overview (`GET /api/analytics/organization/:orgId/overview`)
- CSV/JSON export with PII redaction (`GET /api/analytics/organization/:orgId/export`)
- On-demand cache refresh (`POST /api/analytics/cache/clear`)

**Database Schema:**
- 4 new tables: `team_analytics_snapshots`, `learner_analytics`, `retention_curves`, `analytics_config`
- Performance indexes on attempts, review_schedule, and new analytics tables
- Configurable at-risk thresholds per organization (default: comprehension < 70% OR overdue reviews > 5)

**Feature Flags:**
- `FF_MANAGER_DASHBOARD_V1=true`: Manager analytics endpoints
- `FF_ANALYTICS_PILOT_V1=true`: Admin organization analytics
- `ANALYTICS_STUB=true`: CI stub mode

**Web UI:**
- Manager dashboard (`/manager/dashboard`): Overview of all managed teams
- Team detail dashboard (`/manager/teams/[teamId]/dashboard`): Detailed analytics with charts and at-risk table
- Admin analytics (`/admin/analytics`): Organization-level overview with export functionality

**Acceptance Evidence:**
```bash
# Get team analytics
curl http://localhost:8080/api/manager/teams/team-1/analytics \
  -H 'x-admin-token: TOKEN' | jq '.avgComprehension'
# Returns: 0.825

# Identify at-risk learners
curl http://localhost:8080/api/manager/teams/team-1/at-risk | jq '.total'
# Returns: 2

# Export as CSV
curl "http://localhost:8080/api/analytics/organization/org-1/export?format=csv" \
  -H 'x-admin-token: TOKEN' | head -1
# Returns: team_id,team_name,active_learners,avg_comprehension,...

# Run smoke tests
FF_MANAGER_DASHBOARD_V1=true FF_ANALYTICS_PILOT_V1=true \
  bash api/scripts/smoke-analytics.sh
# All 11 tests pass
```

**Documentation:**
- Epic specification: `EPIC4_PROMPT.md`
- Migration: `api/drizzle/007_manager_analytics.sql`
- Service: `api/src/services/analytics.ts`
- Routes: `api/src/routes/managerAnalytics.ts`
- Tests: `api/tests/manager-analytics.test.ts`
- Smoke tests: `api/scripts/smoke-analytics.sh`
- BRD: `docs/brd/cerply-brd.md` (updated 2025-10-10 with Epics 5-9)
- Pitch Deck: `docs/brd/pitch_deck.md` (updated 2025-10-10 with 3-LLM pipeline, gamification, conversational UX, adaptive difficulty, Slack-first strategy)
- Roadmap: `docs/MVP_B2B_ROADMAP.md` (Epics 5-9 detailed)

**Changelog:**
- **2025-10-10:** Epic 5 delivered — Slack Channel Integration v1 with delivery API, webhook handlers, Block Kit formatting, learner preferences, 35+ tests, and production-ready security
- **2025-10-10:** Documentation updated — BRD aligned with Epics 5-9; pitch deck updated with quantified differentiators (60-80% completion, 70% cost reduction, 2.3x engagement); roadmap expanded with 6-phase rollout
- **2025-10-08:** Epic 4 delivered — Manager Dashboard v1 with 7 analytics endpoints, 4 database tables, caching layer, RBAC enforcement, and responsive UI

---

## 25) Slack Channel Integration v1 — ✅ IMPLEMENTED

**Covers BRD:** B-7, AU-1, L-15 (Channel delivery for learner reminders)

**Status:** Implemented in Epic 5 | Priority: P1 | Effort: 6-8 hours

**Summary:**
Enable learners to receive and respond to lessons via Slack Direct Messages with interactive Block Kit buttons. Slack chosen as MVP channel over WhatsApp/Teams due to simplest integration path (OAuth 2.0, free tier, native webhooks, no phone verification). WhatsApp and Teams planned for Phase 2/3.

**Key Features:**
- **Slack Workspace Integration**: OAuth 2.0 setup with bot scopes (`chat:write`, `users:read`, `im:write`, `im:history`)
- **Lesson Delivery**: Send questions as Slack DMs with interactive Block Kit buttons for multiple choice
- **Response Collection**: Webhook handlers for button clicks and text responses
- **Real-Time Feedback**: Immediate correctness notification with explanation in Slack
- **Learner Preferences**: Configure preferred channel, quiet hours (e.g., "22:00-07:00"), pause/resume
- **Signature Verification**: Validate Slack webhook signatures for security
- **Fallback**: Email delivery if Slack fails or user uninstalled app

**API Routes:**

### POST /api/delivery/send
Send a lesson/question to user via their preferred channel.

**Request:**
```json
{
  "userId": "uuid",
  "channel": "slack",
  "lessonId": "lesson-fire-safety-1",
  "questionId": "q123" // optional
}
```

**Response:**
```json
{
  "messageId": "1234567890.123456",
  "deliveredAt": "2025-10-10T14:30:00Z",
  "channel": "slack"
}
```

**Errors:**
- 400 INVALID_REQUEST: Missing userId or lessonId
- 404 USER_NOT_FOUND: User does not exist
- 404 CHANNEL_NOT_CONFIGURED: User has no Slack channel configured
- 503 DELIVERY_FAILED: Slack API returned error

---

### POST /api/delivery/webhook/slack
Receive events and interactivity from Slack (button clicks, messages).

**Request (Button Click):**
```json
{
  "type": "block_actions",
  "user": { "id": "U123456" },
  "actions": [
    {
      "action_id": "answer",
      "value": "option_a",
      "block_id": "q123"
    }
  ],
  "response_url": "https://hooks.slack.com/...",
  "message": { "ts": "1234567890.123456" }
}
```

**Response (to Slack):**
```json
{
  "text": "✅ Correct! Raising the alarm alerts others and ensures a coordinated response."
}
```

**Signature Verification:**
- Validates `x-slack-signature` header using signing secret
- Validates `x-slack-request-timestamp` (reject if > 5 minutes old)
- Returns 401 if signature invalid

---

### GET /api/delivery/channels
Get learner's configured channels and preferences.

**Response:**
```json
{
  "channels": [
    {
      "type": "slack",
      "channelId": "U123456",
      "preferences": {
        "quietHours": "22:00-07:00",
        "paused": false
      },
      "verified": true,
      "createdAt": "2025-10-01T10:00:00Z"
    }
  ]
}
```

---

### POST /api/delivery/channels
Configure channel preferences.

**Request:**
```json
{
  "channelType": "slack",
  "preferences": {
    "quietHours": "22:00-07:00",
    "paused": false
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "verificationUrl": null // null for Slack (verified via OAuth)
}
```

---

**Database Schema:**

```sql
-- api/drizzle/008_channels.sql

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('slack', 'whatsapp', 'teams', 'email')),
  config JSONB NOT NULL, -- { slack_team_id, slack_bot_token, slack_signing_secret }
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, type)
);

CREATE TABLE user_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('slack', 'whatsapp', 'teams', 'email')),
  channel_id TEXT NOT NULL, -- Slack user ID (U123456), phone number, etc.
  preferences JSONB, -- { quiet_hours, paused }
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_type)
);

CREATE INDEX idx_user_channels_user ON user_channels(user_id);
CREATE INDEX idx_channels_org_type ON channels(organization_id, type);
```

---

**Slack Block Kit Message Example:**

```json
{
  "channel": "U123456",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Fire Safety Quiz* 🔥\n\nWhat is the first step when you discover a fire?"
      }
    },
    {
      "type": "actions",
      "block_id": "q123",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Raise the alarm" },
          "value": "option_a",
          "action_id": "answer"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Try to extinguish it" },
          "value": "option_b",
          "action_id": "answer"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Evacuate immediately" },
          "value": "option_c",
          "action_id": "answer"
        }
      ]
    }
  ]
}
```

---

**Feature Flags:**
- `FF_CHANNEL_SLACK=true`: Enable Slack channel integration (default: false)
- Future: `FF_CHANNEL_WHATSAPP`, `FF_CHANNEL_TEAMS`, `FF_CHANNEL_EMAIL`

**Environment Variables:**
- `SLACK_CLIENT_ID`: OAuth client ID from Slack app
- `SLACK_CLIENT_SECRET`: OAuth client secret
- `SLACK_SIGNING_SECRET`: Webhook signature verification secret

**Acceptance Evidence:**
```bash
# Send lesson via Slack
curl -X POST http://localhost:8080/api/delivery/send \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{
    "userId": "user-123",
    "channel": "slack",
    "lessonId": "lesson-fire-safety-1"
  }'
# → 200 { "messageId": "1234567890.123456", "deliveredAt": "...", "channel": "slack" }

# Simulate Slack button click
curl -X POST http://localhost:8080/api/delivery/webhook/slack \
  -H "content-type: application/json" \
  -H "x-slack-signature: v0=..." \
  -H "x-slack-request-timestamp: 1234567890" \
  -d '{
    "type": "block_actions",
    "user": { "id": "U123" },
    "actions": [{ "value": "option_a", "action_id": "answer", "block_id": "q123" }]
  }'
# → 200 { "text": "✅ Correct! ..." }

# Verify attempt recorded
curl http://localhost:8080/api/manager/users/user-123/progress \
  -H "x-admin-token: dev-admin-token-12345" | jq '.attempts[-1]'
# → { "questionId": "q123", "correct": true, "channel": "slack", ... }

# Run smoke tests
FF_CHANNEL_SLACK=true bash api/scripts/smoke-delivery.sh
# All tests pass
```

**Documentation:**
- Epic specification: `docs/MVP_B2B_ROADMAP.md` (Epic 5)
- Migration: `api/drizzle/008_channels.sql`
- Service: `api/src/services/delivery.ts`
- Routes: `api/src/routes/delivery.ts`
- Slack adapter: `api/src/adapters/slack.ts`
- Tests: `api/tests/delivery.test.ts`
- Smoke tests: `api/scripts/smoke-delivery.sh`

**Changelog:**
- **2025-10-10:** Epic 5 delivered — Slack Channel Integration with 4 API routes, Slack adapter, delivery service, 35+ unit tests, smoke tests, and troubleshooting runbook
- **2025-10-10:** Epic 5 planned — Slack Channel Integration with delivery API, webhook handlers, Block Kit formatting, and learner preferences

---

## 26) Ensemble Content Generation v1 — ✅ IMPLEMENTED

**Covers BRD:** B-3, E-14 (High-Quality Content Generation with Provenance Tracking)

**Epic Status:** ✅ IMPLEMENTED 2025-10-10 | Epic: Epic 6 | Tests: `api/tests/ensemble-generation.test.ts`, `api/scripts/smoke-ensemble.sh`

**Implementation Summary:**

3-LLM ensemble pipeline that replaces mock content generation with real, high-quality content validated across multiple models. Managers upload artefacts → LLM plays back understanding → Manager confirms or refines (max 3 iterations) → Generator A (GPT-4o) and Generator B (Claude Sonnet) create content independently → Fact-Checker (GPT-4) verifies accuracy and selects best elements → Manager reviews with full provenance transparency → Content published with audit trail.

**Key Features:**
- **Understanding Playback:** LLM explains its comprehension before generation
- **Iterative Refinement:** Managers can refine understanding up to 3 times
- **3-LLM Ensemble:** Two independent generators + fact-checker for quality
- **Provenance Tracking:** Every section tagged with source LLM and confidence score
- **Canon Storage:** Generic content (fire safety, GDPR, etc.) reused for 70% cost savings
- **Content Classification:** Automatic detection of generic vs. proprietary content
- **Cost Tracking:** Per-generation cost and token tracking across all LLM calls
- **Async Generation:** Non-blocking with status polling for real-time progress

**Technical Achievements:**
- **Multi-Provider Integration:** OpenAI (GPT-5 with extended thinking), Anthropic (Claude 4.5 Sonnet), Google (Gemini 2.5 Pro)
- **Retry Logic:** Exponential backoff for resilient LLM API calls across all three providers
- **Cost Calculation:** Accurate per-token cost tracking for budget management
- **Provenance Storage:** Separate table for audit trail and compliance
- **Similarity Detection:** Jaccard similarity for canon content reuse
- **Feature Flagged:** `FF_ENSEMBLE_GENERATION_V1` gates all endpoints

**Note:** These latest-generation models are used exclusively for content building. Standard chat interactions use separate, optimized models.

**API Routes:**
1. `POST /api/content/understand` - Submit artefact, get LLM understanding
2. `POST /api/content/refine` - Refine understanding with feedback (max 3 iterations)
3. `POST /api/content/generate` - Trigger 3-LLM ensemble generation (async)
4. `GET /api/content/generations/:id` - Poll generation status and results
5. `PATCH /api/content/generations/:id` - Edit or approve generated content
6. `POST /api/content/regenerate/:id` - Regenerate specific module

**Database Schema:**
- `content_generations` - Tracks each generation request with understanding, status, outputs, cost
- `content_refinements` - Stores manager feedback iterations (max 3 per generation)
- `content_provenance` - Records which LLM contributed each section (audit trail)

**UI Components:**
- `/curator/understand` - Upload artefact, view understanding
- `/curator/refine/[id]` - Provide feedback to refine understanding
- `/curator/generate/[id]` - View generation progress and final modules with provenance

**Cost Optimization:**
- Average generation cost: TBD (to be measured in production with GPT-5 + Claude 4.5 + Gemini 2.5 Pro)
- Canon reuse: Near-100% cost savings for similar generic content (>90% similarity)
- Budget alerts: Configurable thresholds with `MAX_GENERATION_COST_USD` and `WARN_GENERATION_COST_USD`
- **Note:** Cost tracking implemented; real-world costs will be measured and documented after production validation

**Acceptance Evidence:**
```bash
# Submit artefact and get understanding
curl -X POST "http://localhost:8080/api/content/understand" \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{"artefact":"Fire safety: evacuate immediately, call 999, meet at assembly point"}'
# Returns: {"generationId":"uuid","understanding":"I understand this covers...","status":"understanding","cost":0.05,"tokens":150}

# Refine understanding
curl -X POST "http://localhost:8080/api/content/refine" \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{"generationId":"uuid","feedback":"Focus more on evacuation routes"}'
# Returns: {"generationId":"uuid","understanding":"Updated understanding...","iteration":1,"maxIterations":3}

# Trigger generation
curl -X POST "http://localhost:8080/api/content/generate" \
  -H "x-admin-token: dev-admin-token-12345" \
  -H "content-type: application/json" \
  -d '{"generationId":"uuid","contentType":"generic"}'
# Returns: {"generationId":"uuid","status":"generating","estimatedTimeSeconds":45,"pollUrl":"/api/content/generations/uuid"}

# Poll for results
curl "http://localhost:8080/api/content/generations/uuid" \
  -H "x-admin-token: dev-admin-token-12345"
# Returns: {"id":"uuid","status":"completed","modules":[...],"provenance":[...],"totalCost":0.52,"totalTokens":8500}
```

**Quality Metrics:**
- **Understanding Accuracy:** Manager refinement rate < 30%
- **Generation Success Rate:** > 95% (excluding LLM API errors)
- **Canon Reuse Rate:** > 40% for generic content
- **Cost Per Generation:** $0.40-$0.60 average
- **Generation Time:** < 60 seconds end-to-end

**Documentation:**
- Implementation prompt: `EPIC6_IMPLEMENTATION_PROMPT.md`
- LLM orchestrator: `api/src/services/llm-orchestrator.ts`
- Canon storage: `api/src/services/canon.ts`
- Content routes: `api/src/routes/content.ts`
- Tests: `api/tests/ensemble-generation.test.ts`
- Smoke tests: `api/scripts/smoke-ensemble.sh`
- Troubleshooting: `docs/runbooks/ensemble-troubleshooting.md`

**Feature Flags:**
```bash
# Enable ensemble generation
FF_ENSEMBLE_GENERATION_V1=true

# Enable canon storage
FF_CONTENT_CANON_V1=true

# LLM model configuration (for content building only)
LLM_GENERATOR_1=gpt-5                          # GPT-5 with extended thinking
LLM_GENERATOR_2=claude-sonnet-4.5-20250514     # Claude 4.5 Sonnet
LLM_FACT_CHECKER=gemini-2.5-pro                # Gemini 2.5 Pro

# API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Cost controls
MAX_GENERATION_COST_USD=5.00
WARN_GENERATION_COST_USD=2.00
```

**Change Log:**
- **2025-10-10:** Epic 6 delivered — 3-LLM ensemble pipeline with understanding playback, iterative refinement, provenance tracking, canon storage, 6 API routes, 3 UI pages, 40+ unit tests, smoke tests, and comprehensive documentation

---

## 27) Research-Driven Content Generation (Epic 6.5) — ✅ IMPLEMENTED

**Covers BRD:** B-3, E-14 (Extended: Topic-based research with citations)

**Epic Status:** ✅ IMPLEMENTED 2025-10-10 | Epic: Epic 6.5 | Tests: `api/scripts/test-research-mode.sh`

**Implementation Summary:**

Extension of the 3-LLM ensemble to support topic-based research requests ("Teach me complex numbers") in addition to source material transformation. System automatically detects input type and routes to appropriate workflow:
- **Source Mode:** Transform existing documents into learning modules (Epic 6)
- **Research Mode:** Research topics and generate comprehensive content with validated citations (Epic 6.5)

**Key Features:**
- **Auto-Detection:** Identifies if input is a topic request vs source material
- **Research Pipeline:** Generators create content with citations from credible sources
- **Citation Validation:** Fact-checker validates citation credibility and flags hallucinations
- **Universal Domain Support:** Handles any topic (Math, Science, History, Business, etc.)
- **Ethical Constraints:** Fact-checker flags sensitive topics or policy violations
- **Full Transparency:** Citations and provenance tracked alongside content

**Research Workflow:**
1. **Understanding:** Extract topic, domain, key concepts, prerequisites, difficulty level
2. **Generator A (Claude 4.5):** Technical/academic content with textbook/paper citations
3. **Generator B (GPT-4o):** Practical applications with course/video citations
4. **Fact-Checker (o3):** Deep validation of facts, citations, and ethical concerns
5. **Output:** Validated modules with verified citations

**Input Type Detection:**
```typescript
// Text-based inputs (<200 chars or topic indicators) → Research mode
// Long documents → Source transformation mode
// File uploads → Source transformation mode
```

**API Routes:**
- `POST /api/content/understand` - Auto-detects input type, returns `inputType` field
- `GET /api/content/generations/:id` - Returns `citations` array for research mode

**Database Schema:**
- `citations` - Stores extracted citations with validation status
- `content_generations.input_type` - Tracks whether generation is 'source' or 'topic'
- `content_generations.ethical_flags` - Records any ethical/policy concerns

**Example: "Teach me complex numbers"**
```json
{
  "inputType": "topic",
  "understanding": "Core Topic: Complex Numbers. Domain: Mathematics. Key concepts: imaginary unit, operations, polar form...",
  "modules": [
    {
      "title": "Understanding the Imaginary Unit",
      "content": "...[Source: Stewart Calculus, Chapter 3]...",
      "citations": [...]
    }
  ],
  "citations": [
    {
      "title": "Calculus: Early Transcendentals",
      "author": "James Stewart",
      "sourceType": "textbook",
      "validationStatus": "verified",
      "confidence": 0.95
    }
  ]
}
```

**Cost & Performance:**
- Research mode cost: Similar to source mode (~$0.07-0.20 per topic)
- Generation time: 3-5 minutes (o3 validation)
- Citations per topic: 6-12 from diverse sources
- Validation rate: >80% citations verified by fact-checker

**Note:** Research mode generates comprehensive content but NOT final adaptive lessons. Adaptive lesson generation is a separate system focused on personalization and interactivity.

---

## 28) Gamification & Certification System (Epic 7) — ✅ DEPLOYED TO PRODUCTION

**Covers BRD:** L-16 (Learner progression), B-15 (Manager notifications)

**Epic Status:** ✅ DEPLOYED TO PRODUCTION (2025-10-12) | Epic: Epic 7 | Docs: `EPIC7_PRODUCTION_VERIFICATION_RESULTS.md`, `EPIC7_FINAL_PRODUCTION_CHECKLIST.md`

**Implementation Summary:**

Complete gamification system with learner levels, PDF certificates, achievement badges, and manager notifications designed to increase completion rates from 30-40% to 60-80%. Core API and services delivered; Web UI and production dependencies deferred to Phase 2.

**Key Features:**
- **5-Level Progression:** novice (0-20) → learner (21-50) → practitioner (51-100) → expert (101-200) → master (201+)
- **Achievement Badges:** 5 types (Speed Demon, Perfectionist, Consistent, Knowledge Sharer, Lifelong Learner)
- **Certificates:** Auto-generated on track completion with Ed25519 signatures (mock for MVP)
- **Manager Notifications:** In-app alerts for level-ups, certificates, badges, at-risk learners
- **Track-Specific Levels:** Independent progression tracking per learning track

**Database Schema:**
```sql
-- 7 new tables (5 core + 2 operational)
learner_levels (user_id, track_id, level, correct_attempts, leveled_up_at)
certificates (user_id, track_id, org_id, signature, pdf_url, verification_url, revoked_at, revocation_reason)
badges (slug, name, description, icon, criteria)
learner_badges (user_id, badge_id, earned_at)
manager_notifications (manager_id, learner_id, type, content, read, sent_at, read_at)
idempotency_keys (key, route, user_id, status_code, response_hash, response_body, expires_at)
audit_events (event_type, user_id, organization_id, performed_by, request_id, metadata, occurred_at)

-- Indexes for performance
CREATE INDEX idx_audit_events_org_occurred ON audit_events(organization_id, occurred_at DESC);
CREATE INDEX idx_manager_notifications_manager_read ON manager_notifications(manager_id, read);
```

**API Routes (8 endpoints):**
1. `GET /api/learners/:id/levels` - All learner levels across tracks (pagination: limit/offset)
2. `GET /api/learners/:id/level/:trackId` - Specific track level with progress (DEPRECATED: use #1)
3. `GET /api/learners/:id/certificates` - List earned certificates
4. `GET /api/learners/:id/badges` - List earned badges + progress
5. `GET /api/certificates/:id/download` - Download certificate PDF (Cache-Control headers)
6. `GET /api/certificates/:id/verify` - Verify certificate validity and revocation status (public endpoint)
7. `POST /api/certificates/:id/revoke` - Revoke certificate (admin-only, idempotent, audit logged)
8. `GET /api/manager/notifications` - Get manager notifications (limit/offset/unreadOnly, paginated)
9. `PATCH /api/manager/notifications/:id` - Mark notification as read (idempotent via X-Idempotency-Key)

**Services:**
- **gamification.ts:** Level calculation, tracking, checkLevelUp, progress to next level
- **certificates.ts:** Certificate generation, Ed25519 signing (mock), PDF rendering (mock), verification with revocation
- **badges.ts:** Badge detection (5 types), automated awarding, idempotent logic
- **notifications.ts:** Manager alerts (in-app + email mock), notification preferences
- **idempotency.ts:** Middleware for mutation replay prevention with conflict detection

**Production Features (2025-10-10 to 2025-10-12):**
- ✅ **Idempotency**: X-Idempotency-Key support on PATCH routes (24hr TTL, 409 on conflict), with cleanup cron
- ✅ **Certificate Revocation**: Added revoked_at/revocation_reason, admin-only POST /api/certificates/:id/revoke
- ✅ **UUID Validation**: All routes validate UUIDs, return 400 for invalid format
- ✅ **Admin Bypass Gating**: Admin token only works when NODE_ENV !== 'production'
- ✅ **HTTP Semantics**: Certificate download/verify with proper Cache-Control and Content-Disposition headers
- ✅ **Pagination**: Full support (limit/offset, default 50, max 200) on levels and notifications endpoints
- ✅ **Audit Events**: Comprehensive audit logging with 7 tables (idempotency_keys, audit_events) and weekly cleanup
- ✅ **Production Deployment**: Docker-based deployment to Render with database migrations applied
- ✅ **Security Hardening**: RBAC enforcement, authentication required, hard-coded credentials removed

**Feature Flags:**
```bash
FF_GAMIFICATION_V1=true        # Enable levels and badges
FF_CERTIFICATES_V1=true         # Enable certificate generation
FF_MANAGER_NOTIFICATIONS_V1=true # Enable manager alerts
```

**Acceptance Evidence (Development):**
```bash
# Get learner levels
curl http://localhost:8080/api/learners/user-123/levels \
  -H 'x-admin-token: dev-admin-token-12345' | jq '.levels'
# Returns: [{"trackId":"...", "level":"learner", "correctAttempts":25, "nextLevel":"practitioner", "attemptsToNext":26}]

# Get earned badges
curl http://localhost:8080/api/learners/user-123/badges \
  -H 'x-admin-token: dev-admin-token-12345' | jq '.badges'
# Returns: [{"slug":"speed-demon", "name":"Speed Demon", "icon":"⚡", "earnedAt":"..."}]

# Manager notifications
curl http://localhost:8080/api/manager/notifications \
  -H 'x-admin-token: dev-admin-token-12345' | jq '.unreadCount'
# Returns: 3

# Run smoke tests
FF_GAMIFICATION_V1=true bash api/scripts/smoke-gamification.sh
# All 4 tests pass
```

**Production Verification (2025-10-12):**
```bash
# Production API health check
curl -s https://api.cerply.com/api/health | jq .
# Returns: {"status":"ok","timestamp":"..."}

# Version headers (confirms Docker image deployed)
curl -sI https://api.cerply.com/api/version | grep -i x-image
# x-image-revision: 2f77e89...
# x-image-created: 2025-10-12T14:54:08Z
# x-image-tag: staging

# Epic 7 routes deployed and protected
curl -s https://api.cerply.com/api/learners/test-id/levels
# Returns: 401 UNAUTHORIZED (correct - auth required)

curl -s https://api.cerply.com/api/manager/notifications  
# Returns: 401 UNAUTHORIZED (correct - RBAC enforced)

curl -s https://api.cerply.com/api/certificates/test-id/verify
# Returns: 400 BAD_REQUEST (correct - invalid UUID)

# Database connected (7 tables verified)
psql $PRODUCTION_DATABASE_URL -c "\dt" | grep -E "learner_levels|certificates|badges|learner_badges|manager_notifications|idempotency_keys|audit_events"
# All 7 tables present ✅

# Feature flags enabled
# Verified in Render dashboard:
# FF_GAMIFICATION_V1=true ✅
# FF_CERTIFICATES_V1=true ✅
# FF_MANAGER_NOTIFICATIONS_V1=true ✅
```

**See full production verification**: `EPIC7_PRODUCTION_VERIFICATION_RESULTS.md`

**Technical Implementation:**
- **Migration:** `api/drizzle/010_gamification.sql` (5 tables + 5 badge seeds)
- **Drizzle Schema:** `api/src/db/schema.ts` (TypeScript definitions)
- **Services:** 4 new services (gamification, certificates, badges, notifications)
- **Routes:** `api/src/routes/gamification.ts` (7 endpoints with RBAC)
- **Tests:** Smoke test suite + comprehensive UAT plan (8 scenarios)

**MVP Limitations (Requires Future Installation):**
1. **Certificate Signatures:** Mock Base64 encoding (needs `@noble/ed25519`)
2. **PDF Generation:** Text-based mock (needs `pdfkit`)
3. **Email Notifications:** Console logging only (needs `SENDGRID_API_KEY`)
4. **Daily/Weekly Digests:** Not implemented (Phase 5.5 deferred)
5. **Web UI:** Not implemented (Phase 7 deferred)

**Production Ready:**
```bash
# Install dependencies
cd api
npm install pdfkit @types/pdfkit @noble/ed25519 node-cron @types/node-cron

# Apply migration
npm run db:migrate

# Enable flags
export FF_GAMIFICATION_V1=true
export FF_CERTIFICATES_V1=true
export FF_MANAGER_NOTIFICATIONS_V1=true

# Configure (optional)
export CERT_SIGNING_KEY=<ed25519-private-key-hex>
export SENDGRID_API_KEY=<sendgrid-api-key>
export FROM_EMAIL=notifications@cerply.com
```

**Business Impact:**
- **Goal:** Increase completion rates from 30-40% to 60-80%
- **Mechanism:** Visible progression, achievement unlocks, verifiable credentials, manager engagement
- **KPIs:** Track completion rates, badge unlock rate, certificate downloads, manager notification engagement

**Documentation:**
- Implementation prompt: `EPIC7_IMPLEMENTATION_PROMPT.md`
- Implementation summary: `EPIC7_IMPLEMENTATION_SUMMARY.md`
- UAT plan: `docs/uat/EPIC7_UAT_PLAN.md` (8 test scenarios)
- Migration: `api/drizzle/010_gamification.sql`
- Smoke tests: `api/scripts/smoke-gamification.sh`

**Change Log:**
- **2025-10-12:** Epic 7 DEPLOYED TO PRODUCTION — Full production deployment to Render (api.cerply.com), database migrations applied (7 tables), feature flags enabled, RBAC hardened, admin bypass disabled in prod, version headers fixed, security audit passed (hard-coded credentials removed), all infrastructure checks GREEN ✅
- **2025-10-11:** Epic 7 production polish — Added certificate revocation route (POST /certificates/:id/revoke), idempotency cleanup cron (daily), audit event cleanup cron (weekly), pagination fully implemented, OpenAPI spec updated with curl examples, comprehensive CI tests added
- **2025-10-10:** Epic 7 core API delivered — Database schema (5 tables), gamification service (5 levels), certificate service (mock signing), badge detection (5 types), manager notifications (in-app + mock email), 7 API routes with RBAC, smoke tests, and UAT plan

---

## 29) Conversational Learning Interface (Epic 8) — ⚠️ PHASE 1 COMPLETE

**Covers BRD:** L-12 (Conversational interface), L-18 (Free-text answers)

**Epic Status:** ⚠️ PHASE 1 COMPLETE 2025-10-12 | Epic: Epic 8 | Tests: `api/tests/intent-router.test.ts`

**Phase 1 Delivered (Infrastructure & Skeleton):**
Natural language chat interface **skeleton** with basic intent routing. LLM-powered explanations, free-text validation, and confusion tracking are **planned for Phase 2-8** (~11h remaining).

**Phase 1 Completed Features:**
- ✅ Chat panel UI with Cmd+K shortcut (`web/components/ChatPanel.tsx`)
- ✅ Database schema (3 new tables: `chat_sessions`, `chat_messages`, `confusion_log`)
- ✅ Extended `attempts` table (answer_text, partial_credit, feedback, validation_method columns)
- ✅ Basic intent router with pattern matching (~75% accuracy, 5 intents)
- ✅ API routes (chat/message, sessions, explanation, feedback endpoints)
- ✅ Feature flags (`FF_CONVERSATIONAL_UI_V1`, `FF_FREE_TEXT_ANSWERS_V1`)
- ✅ Dev/test environment helpers (`getSessionOrMock()`)

**Phase 2-8 Planned:**
- ✅ **Phase 2 COMPLETE (2025-10-13):** LLM-powered explanations with OpenAI integration
- ✅ **Phase 2 COMPLETE (2025-10-13):** Explanation caching (1-hour TTL for cost optimization)
- ✅ **Phase 3 COMPLETE (2025-10-13):** Free-text answer validation (fuzzy matching + LLM fallback)
- ✅ **Phase 4 COMPLETE (2025-10-13):** Partial credit scoring (0.0-1.0)
- ✅ **Phase 5 COMPLETE (in Phase 2):** Confusion tracking integrated with adaptive difficulty (Epic 9)
- ✅ **Phase 6 COMPLETE (in Phase 2):** Explanation caching
- ⏳ **Phase 7:** Intent router accuracy improvements (75% → 90%+)
- ⏳ **Phase 8:** Comprehensive E2E testing (Playwright) + Production hardening & UAT

**API Routes:**
- `POST /api/chat/message` - Basic intent routing, static responses (no LLM yet)
- `GET /api/chat/sessions` - List sessions (pagination not implemented)
- `GET /api/chat/sessions/:id` - Get session history
- ✅ `POST /api/chat/explanation` - **Phase 2 COMPLETE:** LLM-powered explanations with caching
- ✅ `POST /api/chat/feedback` - **Phase 2 COMPLETE:** Mark explanations helpful/not helpful
- `POST /api/learn/submit` - Schema extended (answerText field), validation not wired

**Database Schema (Production Ready):**
- `chat_sessions` (id, user_id, started_at, ended_at)
- `chat_messages` (id, session_id, role, content, intent, metadata, created_at)
- `confusion_log` (id, user_id, question_id, query, explanation_provided, helpful, created_at)
- `attempts` extended: answer_text, partial_credit, feedback, validation_method

**Feature Flags:**
- `FF_CONVERSATIONAL_UI_V1` - Enable chat interface (Phase 1: UI skeleton only, default: false)
- `FF_FREE_TEXT_ANSWERS_V1` - Enable free-text answers (Phase 2-8: validation pending, default: false)
- `CHAT_LLM_MODEL` - Model for explanations (Phase 2-8, default: gpt-4o-mini)
- `EXPLANATION_CACHE_TTL` - Cache TTL (Phase 2-8, default: 3600)
- `LLM_UNDERSTANDING` - Validation model (Phase 2-8, default: gpt-4o)
- `NEXT_PUBLIC_CONVERSATIONAL_UI_V1` - Enable ChatPanel UI (Phase 1, default: false)

**Technical Status (Phases 1-4):**
- Intent router: ~75% accuracy (5 patterns: progress/next/explanation/filter/help)
- ✅ **Phase 2:** LLM explanations IMPLEMENTED (OpenAI integration, cost tracking, caching)
- ✅ **Phase 3:** Free-text validation IMPLEMENTED (fuzzy + LLM, 95% accuracy)
- ✅ **Phase 4:** Partial credit scoring IMPLEMENTED (fractional level progression)
- ✅ **Phase 2:** Confusion tracking IMPLEMENTED (logging to confusion_log, feedback endpoint active)
- ✅ **Phase 2:** Cost per explanation: ~$0.00008-$0.00012 (gpt-4o-mini, $0 when cached)
- ✅ **Phase 3:** Cost per free-text validation: $0 (fuzzy), ~$0.0001 (LLM fallback)
- Test coverage: ~40% (intent router, explanation engine, free-text validator, E2E pending)

**Acceptance Evidence (Phase 1-2):**
```bash
# Test intent classification (unit tests)
cd api && npm run test tests/intent-router.test.ts

# Test explanation engine (Phase 2)
cd api && npm run test tests/explanation-engine.test.ts

# Test chat routes
./api/scripts/smoke-chat.sh

# Test explanation endpoint (Phase 2)
./api/scripts/test-explanation-endpoint.sh

# Start API with Phase 2 flags
cd api
FF_CONVERSATIONAL_UI_V1=true \
OPENAI_API_KEY=sk-... \
npm run dev

# Start web with Phase 1 UI
cd web
NEXT_PUBLIC_CONVERSATIONAL_UI_V1=true npm run dev
```

**Phase 2-8 Rollout Plan:**
1. ✅ **Phase 2:** LLM explanation engine with OpenAI integration (3h) — **COMPLETE 2025-10-13**
2. ✅ **Phase 3:** Free-text answer validation with fuzzy matching (2h) — **COMPLETE 2025-10-13**
3. ✅ **Phase 4:** Partial credit scoring and feedback loop (1.5h) — **COMPLETE 2025-10-13**
4. ✅ **Phase 5:** Confusion tracking integration with Epic 9 (1h) — **COMPLETE in Phase 2**
5. ✅ **Phase 6:** Explanation caching for cost optimization (1.5h) — **COMPLETE in Phase 2**
6. **Phase 7:** Intent router accuracy improvements to 90%+ (1h)
7. **Phase 8:** E2E testing and production UAT (1h)

**Total Remaining Effort:** ~2 hours (Phases 7-8)

**Dependencies:**
- API: ✅ `openai` (installed, **IN USE since Phase 2**), ✅ `fast-levenshtein` (**IN USE since Phase 3**)
- Web: `react-markdown` (pending UI redesign), `lucide-react` (already used)
- Epic 9: Adaptive difficulty depends on confusion tracking (**Phase 5 COMPLETE, ready for integration**)

**Documentation:**
- Implementation prompt: `EPIC8_IMPLEMENTATION_PROMPT.md`
- Phase 2 delivery: `EPIC8_PHASE2_DELIVERY.md`
- Phase 3-4 delivery: `EPIC8_PHASE3-4_DELIVERY.md`
- Intent router (Phase 1): `api/src/services/intent-router.ts`
- ✅ Explanation engine (Phase 2): `api/src/services/explanation-engine.ts` — **FULLY IMPLEMENTED**
- ✅ Free-text validator (Phase 3): `api/src/services/free-text-validator.ts` — **FULLY IMPLEMENTED**
- ✅ Gamification (Phase 4): `api/src/services/gamification.ts` — **PARTIAL CREDIT SUPPORT ADDED**
- Chat routes (Phases 1-2): `api/src/routes/chat-learning.ts`
- Learn routes (Phase 3): `api/src/routes/learn.ts` — **FREE-TEXT INTEGRATED**
- UI component (Phase 1): `web/components/ChatPanel.tsx`
- Tests: `api/tests/explanation-engine.test.ts`, `api/tests/free-text-validator.test.ts`
- Smoke test: `api/scripts/test-explanation-endpoint.sh`

**Known Gaps:**
- ~~LLM integration not wired (static responses only)~~ — **✅ FIXED in Phase 2**
- ~~No caching implemented (explanation-cache.ts stub exists)~~ — **✅ FIXED in Phase 2**
- ~~Free-text validation schema ready but logic missing~~ — **✅ FIXED in Phase 3**
- ~~Partial credit not counted in gamification~~ — **✅ FIXED in Phase 4**
- Test coverage inadequate (<80% ADR requirement, currently ~40%)
- Intent router accuracy below target (75% vs 90%, Phase 7)

**Next Steps to Complete Epic 8:**
1. ✅ ~~Phase 2: LLM Explanation Engine~~ — **COMPLETE 2025-10-13**
2. ✅ ~~Phase 3: Free-text answer validation~~ — **COMPLETE 2025-10-13**
3. ✅ ~~Phase 4: Partial credit scoring~~ — **COMPLETE 2025-10-13**
4. Phase 7: Intent router improvements (~1h)
5. Phase 8: E2E testing and UAT (~1h)
6. Increase test coverage to 80%
7. Add JSDoc comments to all services
8. Update FSD §29 to "✅ IMPLEMENTED" when all phases complete

**Remaining Effort:** ~2 hours (Phases 7-8) + testing improvements

**Change Log:**
- **2025-10-13 (Phases 3-4):** Phases 3-4 COMPLETE — Free-text answer validation (fuzzy + LLM, 95% accuracy), partial credit scoring in gamification, 12 new unit tests passing
- **2025-10-13 (Phase 2):** Phase 2 COMPLETE — LLM explanation engine fully implemented with OpenAI integration, cost tracking, caching, confusion tracking, and feedback endpoint
- **2025-10-13 (Phase 1):** Updated to reflect Phase 1 status (infrastructure/skeleton only, LLM integration pending)
- **2025-10-12 (Phase 1):** Phase 1 infrastructure delivered — Database schema (3 tables + extended attempts), chat UI, intent router (75% accuracy), API routes (skeleton), feature flags

---

## 30) Adaptive Difficulty Engine (Epic 9) — 📋 PLANNED

**Covers BRD:** L-2 (Adaptive lesson plans with dynamic difficulty)

**Epic Status:** 📋 PLANNED (After Epic 8 Phase 2-8 completion)

See `EPIC9_IMPLEMENTATION_PROMPT.md` for full specification.

**Key Features (Planned):**
- 4 difficulty levels (Recall, Application, Analysis, Synthesis)
- Performance signals (correctness, latency, confusion from Epic 8)
- Learning style detection (visual/verbal/kinesthetic)
- Topic weakness detection (comprehension < 70%)
- Adaptive algorithm with BKT/AFM foundation

**Dependencies:**
- Requires Epic 8 Phase 5 (confusion tracking)
- Requires Epic 0 (Platform Foundations - quality metrics)

---

## 31) Content Meta Model & Hierarchy — ⚠️ FOUNDATIONAL CHANGE

**Status:** Database schema created, migration pending (P0)

**Epic Status:** Epic-Scope-Fix (affects Epics 5, 6, 7, 8, 9, 10)

Cerply's content structure has been redesigned to support better organization, certification, and freshness management.

**New 5-Tier Hierarchy:**
```
Subject (e.g., "Computer Science", "Finance")
  └─ Topic (e.g., "Machine Learning") ← Content collection level
      └─ Module (e.g., "LLM Architecture") ← Content provision level
          └─ Quiz (e.g., "Assessment 1", "Assessment 2")
              └─ Question (e.g., "What does LLM stand for?")
                  └─ Guidance (explanation text within question)
```

**Key Changes from Old Structure:**
- **Tracks → Topics:** Topics live under subjects, support certification at this level
- **Items → Questions:** Questions now grouped into quizzes for better organization
- **Explicit Subject Layer:** All topics belong to a subject (Computer Science, Finance, etc.)
- **Topic-Level Operations:** Generation, certification, and freshness all at topic level

**Database Tables (Migration 016):**
- `subjects` - Top-level knowledge domains
- `topics` - Content collection level (4-6 modules each)
- `modules_v2` - Content provision level (what learners consume)
- `quizzes` - Assessment containers (grouping questions)
- `questions` - Individual quiz items (replaces `items`)
- `topic_assignments` - Tracks who is learning what (replaces `team_track_subscriptions`)
- `topic_citations` - Research sources for content
- `topic_secondary_sources` - Company-specific contextual content (Epic 6.8)
- `topic_communications` - Assignment communications (Epic 6.8)

**Content Generation Rules:**
- All generation happens at **topic level** (manager prompts "Teach me X" → full topic with 4-6 modules)
- Each topic belongs to a **subject** (auto-detected or manager-selected)
- Content marked as **proprietary** (company-specific) or **canonical** (public/reusable)
- Proprietary content never stored in canon (public reuse store)

**Certification Rules:**
- Can certify at **topic level** (all modules inherit) OR **module level** (individual modules)
- `certification_level` field tracks scope ('topic' | 'module')
- Certified content shows 🏅 badge in content library

**Freshness Management:**
- Operates at **topic level** (not per module)
- Default refresh frequency: 6 months
- Only refreshes if topic assigned to ≥1 active learner
- Manual admin trigger available

**Migration Strategy:**
- See `EPIC_SCOPE_FIX_CONTENT_HIERARCHY.md` for full migration plan
- P0 (Blocking): Database migration + foreign key updates
- P1 (Pre-Production): Epic 5/6/7 code changes
- P2 (Polish): Admin tools and migration UI

**Affected Epics:**
- **Epic 5 (Slack):** Update message templates to reference topics (not tracks)
- **Epic 6 (Ensemble):** Generate at topic level (4-6 modules per topic)
- **Epic 7 (Gamification):** Levels and certificates tied to topics
- **Epic 8 (Conversational UI):** Chat context includes subject/topic/module hierarchy
- **Epic 9 (Adaptive Difficulty):** Weakness detection at topic level
- **Epic 10 (Certification):** Certification at topic OR module level

**Traceability:**
- ADR: Content Meta Model (LOCKED)
- Migration: `api/drizzle/016_content_hierarchy.sql`, `017_migrate_legacy_content.sql`
- Schema: `api/src/db/schema.ts` (new tables added)

**Change Log:**
- **2025-10-13:** Content hierarchy defined, database migrations created, Epic-Scope-Fix documented

---

## 32) Manager Curation Workflow (Epic 6.8) — 📋 PLANNED

**Covers BRD:** B-3 (Customize content for internal policies), B-12 (Content approval workflows)

**Epic Status:** 📋 PLANNED (After Epic 8 Phase 2-8 completion, 20-24 hours)

**Context:** Managers need a comprehensive workflow to curate content, blend company-specific context with canonical knowledge, assign to teams, and communicate learning opportunities.

**Workflow Steps:**

**1. Content Identification**
- Manager inputs: URL, prompt, or file upload
- Cerply decides scope: Is it topic-level (broad, needs 4-6 modules) or module-level (specific, standalone)?
- URL: Scrape and analyze structure
- Prompt: Detect if topic ("Teach me machine learning") or specific question
- Upload: Default to proprietary standalone module

**2. Secondary Content Collection**
- Manager adds contextual links/docs (company-specific policies, examples, case studies)
- Stored separately in `topic_secondary_sources` table
- Metadata extracted and used in LLM prompts
- Content stays private (never added to public canon)

**3. 3-LLM Generation (Integrates with Epic 6)**
- Generate full topic (4-6 modules) OR standalone module
- Pull canonical content from canon if exists (public knowledge)
- Blend with proprietary secondary sources (company context)
- Provenance tracking shows which sources contributed

**4. Manager Review & Sign-Off**
- Review all generated modules with inline editing
- Approve entire topic OR individual modules
- Determine certification readiness (submit to Epic 10 workflow)
- Regenerate specific modules if needed

**5. Assignment & Communication**
- Select team members (entire team or specific individuals)
- Set mandatory/recommended + deadline (if mandatory)
- Cerply generates draft communication (LLM-powered, contextual)
  - Example: "We're rolling out Machine Learning training to help you stay competitive. Complete by end of quarter."
- Manager reviews/edits draft
- Select delivery channels (Cerply app, email, Slack)
- Send with one click

**API Routes (Planned):**
- `POST /api/manager/content/identify` - Identify content scope from URL/upload/prompt
- `POST /api/manager/content/:topicId/sources` - Add secondary sources
- `POST /api/manager/content/:topicId/generate` - Trigger 3-LLM generation with context
- `GET /api/manager/content/:topicId/review` - Get generated modules for review
- `PATCH /api/manager/content/:topicId/modules/:moduleId` - Edit module inline
- `POST /api/manager/content/:topicId/assign` - Assign to team with communication
- `POST /api/manager/content/:topicId/communication/draft` - Generate draft communication

**Database Tables (Migration 016):**
- `topic_secondary_sources` - Company-specific contextual content
- `topic_communications` - Assignment communications tracking

**Feature Flags:**
- `FF_MANAGER_CURATION_V1=true`

**Dependencies:**
- Requires Epic 6 (ensemble generation pipeline)
- Requires Epic 8 (conversational interface for learners)

**Implementation Order:**
- After Epic 8 Phase 2-8 complete
- Before Epic 6.6 (Content Library Seeding)

**Traceability:**
- Implementation Prompt: `EPIC6.8_IMPLEMENTATION_PROMPT.md` (to be created)
- Epic Master Plan: Epic 6.8 specification

**Change Log:**
- **2025-10-13:** Epic 6.8 defined, database tables added to migration 016

---

## 33) Backlog (Next 10)

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
