

# Cerply — Business Requirements (BRD)

## 1) Product in one breath
Cerply is an **AI‑first learning orchestrator**. A stateful conversation clarifies a goal → plans modules → generates lessons → mixes daily practice → measures mastery → adapts. The UI is a thin, calm chat; **the orchestrator owns state**; **no pointless loops**.

## 2) Users & value
- **D2C learners** who want fast plans and daily practice.
- **Pilot orgs** who want minimal assign/track (badge aliasing: “{Org} Certified”).

## 3) Scope (today)
- **Flow:** clarify → plan → confirm → generate. Follow‑ups via `/api/ingest/followup` with `{ action: 'append' | 'revise' | 'hint' }`. Do **not** re‑plan unless server says `revise`.
- **UI rules:**
  - **Opener** types; each sentence on a **new line**. No duplicate intro. No “AI‑first marketing” phrase.
  - **Bubbles:** user **right‑justified**, Cerply **left**.
  - **Composer:** sticky input at bottom, Enter to send, upload button present; **native file input hidden** (inline style + Tailwind class backup).
  - **Natural‑language confirmations:** “**looks good**”, “**add/include X**”, “**remove Y**”.
- **API (Fastify :8080)**
  - `POST /api/ingest/clarify` → `{ ok, question, chips[] }` (3–6 smart chips; syllabus/vendor aware, e.g., AQA vs Edexcel).
  - `POST /api/ingest/preview` → `{ modules: [{ id, title }] }` (plan preview from an enriched brief).
  - `POST /api/ingest/followup` → returns **append/revise/hint**; when `message` starts with *add/include*, heuristically **append**.
  - `POST /api/ingest/generate` → gated by auth; use `GET /api/auth/me` and `/api/auth/login`.
- **Flags/env:** `LLM_PREVIEW=1`, `LLM_PLANNER_PROVIDER=openai`, `LLM_PLANNER_MODEL=gpt-4o-mini`.
- **Guardrails:** topic/language filters; refuse proxy uses (no unrelated Q&A); ASCII‑only headers; request budgeting/model routing; session‑scoped learner twin.

## 4) Out of scope (today)
No carousels; no dashboards; no file ingest beyond acknowledgement; no multi‑tenant admin; no long‑term memory UI.

## 5) Acceptance criteria (Done)
- [ ] **Opener types** with line breaks; **exactly one** opener bubble.
- [ ] Clarify returns `{ question, chips[] }` with **3–6 chips**; tapping a chip proceeds to **plan preview**.
- [ ] “**looks good**” checks `/api/auth/me`, then calls `/api/ingest/generate`; success bubble shows (only when logged in).
- [ ] “**add/include X**” and “**remove Y**” call **/api/ingest/followup** and update the plan via `append`/`revise` without full re‑plan unless `revise`.
- [ ] **Tailwind styles load**; no visible native file input.
- [ ] **No Next.js overlays**: valid `app/layout.tsx` (with `<html>`/`<body>`), `app/error.tsx`, `app/global-error.tsx`.

## 6) Manual smoke tests
```bash
# API health
curl -sS http://localhost:8080/api/health

# Clarify
curl -sS -X POST http://localhost:8080/api/ingest/clarify \
  -H 'content-type: application/json' \
  --data '{"text":"GCSE German (AQA Higher)"}'

# Follow-up heuristic
curl -sS -X POST http://localhost:8080/api/ingest/followup \
  -H 'content-type: application/json' \
  --data '{"brief":"GCSE German (AQA Higher)","plan":[{"id":"m1","title":"Reading"}],"message":"add speaking practice"}'
```

## 7) Measurements (Quarter‑0)
- Log clarify→plan→generate latency and win‑rates.
- Nightly eval prompts.
- Add `difficulty`/`discrimination` fields to generated items (schema exists in API).

## 8) Safety & privacy
- Topic/language filters at clarify; decline proxy requests.
- ASCII‑only headers; request budgeting + routing; redact PII in logs where relevant.
- Session‑scoped “learner twin”; expose deletion endpoints later.

## 9) Moats (north star, not all today)
Data; Certified content + expert loop; org push & tracking; evolving prompts/orchestrator; long‑horizon memory; psychometrics; credentials; source rights; orchestrator/evals; compliance/residency; edge modes; integrations; marketplace; safety; experimentation; localization; freshness.

## 10) Operating principle
When ambiguous, make the **smallest reasonable assumption**, state it in the PR/commit, and proceed.