### Study Runner (preview)

Enable preview UI:

```bash
NEXT_PUBLIC_PREVIEW_CERTIFIED_UI=true NEXT_PUBLIC_API_BASE=http://localhost:3000 npm -w web dev
```

Route: `/certified/study` — enter topic (required), optional level and goals; submit to load deck.

Keyboard shortcuts:
- Space: flip
- ArrowRight/ArrowLeft: next/prev
- R: reset session

Persistence: localStorage key `cert:plan:{hash(topic,level,goals)}`

# Cerply v4.1 — Curator + Adaptive + Trust Labels + Analytics

[![MVP Traceability](https://img.shields.io/badge/MVP_Traceability-View-blue)](docs/status/traceability-dashboard.md)

## Run
```bash
docker compose up -d db
docker compose run --rm api npm run migrate
docker compose run --rm api npm run seed:demo
docker compose up -d --build ai api web
open http://localhost:3000
```

### Docker images & CI (staging)

- Only CI pushes `ghcr.io/<owner>/cerply-api:staging` and `:staging-latest`.
- CI builds amd64-only images from the root `Dockerfile` using Buildx.
- Do not push from local; Apple Silicon yields arm64-only images which Render rejects.
- To force a rebuild via CI on `staging`:
  ```bash
  gh workflow run .github/workflows/ci.yml --ref staging
  gh run watch --exit-status
  ```

## Environments

| Environment | Base URL                                   |
|-------------|---------------------------------------------|
| Staging     | https://cerply-api-staging-latest.onrender.com |
| Production  | https://api.cerply.com                      |

## Release flow

1. Push to `staging`
   - CI builds from root `Dockerfile` (linux/amd64), passes IMAGE_* build-args.
   - Tags `staging` and `staging-latest`, pushes to GHCR.
   - Triggers Render staging via secret deploy hook and waits for health.
   - Asserts non-empty `x-image-*` headers and `/api/version` values.
2. Promote to prod
   - Use workflow "Promote API image to prod" (default `source_tag=staging-latest`).
   - Retags by digest to `:prod`, triggers Render prod deploy, waits for `/api/health`.
3. Verify
   - `/api/version` returns `{ image: { tag, revision, created }, runtime: { channel } }` and headers mirror those values.

### Promotion to prod

- Do not push `:prod` (or `:staging`/`:staging-latest`) from local machines; CI builds amd64-only and promotion enforces it.
- CI on `main` publishes prod candidates: `prod-candidate` and `sha-<short>`.
- Promotion asserts the source tag includes `linux/amd64` before retagging to `:prod`.
- Run promotion manually:
  ```bash
  gh workflow run .github/workflows/promote-prod.yml -f tag=prod-candidate
  gh run watch --exit-status
  ```

## Feature Flags
Env (API): FF_CURATOR_DASHBOARD_V1, FF_ADAPTIVE_ENGINE_V1, FF_TRUST_LABELS_V1, FF_TEAM_MGMT
Env (Web): NEXT_PUBLIC_FF_*

See: [Functional Spec](docs/functional-spec.md)

## Team Management (Epic 3) — B2B Enterprise

**Quick Start:**

```bash
# Create a team
curl -X POST http://localhost:8080/api/teams \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{"name":"Engineering Team"}'

# Add members (JSON)
TEAM_ID="<team-id-from-above>"
curl -X POST http://localhost:8080/api/teams/$TEAM_ID/members \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{"emails":["alice@example.com","bob@example.com"]}'

# Add members (CSV bulk import)
curl -X POST http://localhost:8080/api/teams/$TEAM_ID/members \
  -H 'content-type: text/csv' \
  -H 'x-admin-token: dev-admin-token-12345' \
  --data-binary $'charlie@example.com\ndave@example.com'

# List available tracks
curl http://localhost:8080/api/tracks \
  -H 'x-admin-token: dev-admin-token-12345'

# Assign track to team (daily/weekly/monthly cadence)
TRACK_ID="00000000-0000-0000-0000-000000000100"
curl -X POST http://localhost:8080/api/teams/$TEAM_ID/subscriptions \
  -H 'content-type: application/json' \
  -H 'x-admin-token: dev-admin-token-12345' \
  -d '{"track_id":"'$TRACK_ID'","cadence":"daily"}'

# Get team overview
curl http://localhost:8080/api/teams/$TEAM_ID/overview \
  -H 'x-admin-token: dev-admin-token-12345'

# Get operational KPIs (teams_total, members_total, active_subscriptions)
curl http://localhost:8080/api/ops/kpis
```

**Key Features:**
- Create teams, bulk import learners (JSON/CSV)
- Assign tracks with cadence (daily/weekly/monthly)
- Team metrics (members, active tracks, due today, at-risk)
- RBAC (admin/manager roles)
- Event logging (NDJSON append-only)
- Idempotency support (X-Idempotency-Key)

**Documentation:**
- **API Docs:** `api/README.md` (routes, examples, troubleshooting)
- **FSD:** `docs/functional-spec.md` §23 Team Management & Assignments v1
- **Runbook:** `RUNBOOK_team_mgmt.md` (migrations, CSV import, operations)
- **UAT Guide:** `docs/uat/EPIC3_UAT.md` (9 manual test scenarios)

**Tests:**
```bash
# Unit tests (15+ scenarios)
npm test --workspace api -- team-mgmt.test.ts

# Smoke test (8 scenarios)
bash api/scripts/smoke-team-mgmt.sh
```

**Feature Flags:**
- `FF_TEAM_MGMT=true` - Enable team management routes (default: enabled)
- `AUTH_REQUIRE_SESSION=true` - Enforce session authentication (Epic 2)
- `EVENTS_ENABLED=true` - Enable event logging (default: enabled)
- `EVENTS_LOG_PATH=./events.ndjson` - Event log file path

---

## Dev Modes, Smoke Tests & Release Checklist (Cerply)

This project supports a **mock-first** dev experience, a simple **live proxy** mode, and a **staging smoke** workflow compatible with Vercel’s Deployment Protection.

### 1) Environment toggles

Build-time env (compiled at server start):

- `NEXT_PUBLIC_USE_MOCKS`  
  - `true`  -> force mocks  
  - `false` -> force live proxy  
  - **unset** -> dev=mock by default, prod=live by default
- `NEXT_PUBLIC_API_BASE` (default `http://localhost:8080`)
- `NEXT_PUBLIC_ENTERPRISE_MODE` (optional UI toggle)

> **Note:** Changing `NEXT_PUBLIC_*` requires restarting the Next dev server.

### 2) Common dev commands

```bash
# Start both API (8080) and Web (3000)
npm run dev

# Start only API
npm run dev --workspace api

# Start only Web (mock data)
NEXT_PUBLIC_USE_MOCKS=true npm run dev --workspace @cerply/web

# Start only Web (live proxy to API)
NEXT_PUBLIC_USE_MOCKS=false npm run dev --workspace @cerply/web

# Enterprise UI on port 3001 (mock)
NEXT_PUBLIC_USE_MOCKS=true npm run dev:ent --workspace @cerply/web

# Enterprise UI on port 3001 (live)
NEXT_PUBLIC_USE_MOCKS=false npm run dev:ent --workspace @cerply/web
```

**Port already in use?**

```bash
for p in 3000 3001 8080; do pid=$(lsof -ti tcp:$p); [ -n "$pid" ] && kill -TERM $pid || true; done
```

### 3) What to expect (edge headers)

- **`/api/health`**
  - `x-edge: health-mock` (mock) or `x-edge: health-proxy` (live)
- **`/api/prompts`**
  - `x-edge: prompts-mock` (mock), `x-edge: prompts-proxy` (live), or `x-edge: prompts-fallback` if backend is unreachable

> **Header gotcha:** Edge header values must be ASCII-only. Avoid fancy arrows like `→`. Use `-&gt;` instead in any docs/examples.

### 4) Staging smoke (manual from your laptop)

Prereqs:
- Vercel domain `stg.cerply.com` is pinned to branch **staging** (Project -&gt; Settings -&gt; Domains).
- You have a Vercel **Protection Bypass Token**.

Steps:

```bash
export STG="https://stg.cerply.com"
export TOKEN="&lt;your_vercel_bypass_token&gt;"
JAR="./.cookies.stg.jar"

# Set bypass cookie in the jar
curl -si -c "$JAR" \
  "$STG/?x-vercel-set-bypass-cookie=true&amp;x-vercel-protection-bypass=$TOKEN" \
  | sed -n '1,12p'

# Run scripted checks (expects JAR to exist)
JAR="$JAR" ./scripts/smoke-stg.sh
```

The script verifies `GET /ping`, `GET /api/health`, and `GET /api/prompts` and prints status + `x-edge` markers.

### 5) GitHub Actions: staging smoke via secret

- Add repo secret **`VERCEL_BYPASS_TOKEN_STG`**:  
  Settings -&gt; Secrets and variables -&gt; Actions -&gt; **New repository secret**
- The workflow `.github/workflows/stg-smoke.yml` picks it up:

```yaml
env:
  BASE_URL: https://stg.cerply.com
  TOKEN: ${{ secrets.VERCEL_BYPASS_TOKEN_STG }}
```

- Trigger via **Actions -&gt; Staging Smoke -&gt; Run workflow**.

### 6) Release checklist (staging -&gt; prod)

1. **Push** to `staging` (Vercel auto-deploys).
2. **Bypass &amp; smoke**: set cookie + run `scripts/smoke-stg.sh` **or** dispatch the **Staging Smoke** action.
3. **Fix** any failing endpoint (look for `x-edge: *-fallback`).
4. **Promote**: merge to `main` or run `vercel --prod` per your policy.
5. **Post-check** production `/api/health` and `/api/prompts`.

### 7) Backend path alignment

Frontend proxies to: `${NEXT_PUBLIC_API_BASE}/api/prompts`.  
If your backend exposes `/prompts` (no `/api`), update `web/app/api/prompts/route.ts`:

```ts
// change:
const url = `${base}/api/prompts`;
// to:
const url = `${base}/prompts`;
```

### 8) Troubleshooting

- **Edge ByteString / 500**: Non-ASCII in headers (e.g. `→`). Use ASCII (e.g. `-&gt;`).
- **Env toggle not taking effect**: stop and restart the Next dev server.
- **401 on staging**: Missing protection bypass. Set `_vercel_jwt` via `x-vercel-set-bypass-cookie` (see above) or use the GH Action.

---

## Cerply Intelligence Blueprint (v1)

This augments the Functional Spec with concrete building blocks for the three AI pillars: **conversational intake**, **generation**, and **daily synchronisation**.

### A) Conversational Intake (disambiguation-first)
**Goal:** Help a user precisely define *what to learn* using natural language and light clarifying turns.

**UX states**
- **Idle** → input focused, placeholder cycle, Enter to submit.
- **Processing** → conversational: “Got it, analysing your artefact…”.
- **Review** → show *proposed modules* (cards). Allow rename, merge/split, remove.

**Frontend building blocks**
- `components/TypingIntro` (type-on intro line)
- `components/UnderInputIcons` (quick actions incl. Upload)
- `components/ModuleCard` (title, scope, est. minutes, confidence)
- `lib/state/intakeMachine.ts` (Idle → Processing → Review → Confirmed)

**API surface (draft)**
- `POST /v1/intake/start`
  - **Body**: `{ source: 'text'|'url'|'upload', text?, url?, upload_id? }`
  - **Resp**: `{ intake_id, status: 'queued'|'processing' }`
- `GET /v1/intake/:id/events` (SSE)
  - **Stream**: `{type:'status'|'summary'|'question', payload}`
- `POST /v1/intake/:id/answer`
  - **Body**: `{ answer: string }` (for clarifying Qs)

### B) Generation Pipeline (modules → items)
**Goal:** Create right-sized modules; then generate explanations + MCQs + free-text questions.

**Flow**
1) **Propose** module outline from artefact/topic.
2) **Confirm** outline with user edits.
3) **Generate** content per confirmed modules.

**API surface (draft)**
- `POST /v1/modules/propose` → `{ outline: Module[] }`
- `POST /v1/modules/confirm` → `{ modules: Module[] }` (persist as a new version)
- `POST /v1/generate` → `{ job_id }` (async)
- `GET /v1/jobs/:id` → `{ status, artifacts }`

**Data contracts (simplified)**
```ts
// Module shape (stable fields only)
interface Module {
  id: string;
  title: string;
  est_minutes: number;        // 3..12 typical micro-length
  difficulty: 'intro'|'core'|'advanced';
  confidence: number;         // 0..1 model confidence in scope
}

// Generated content item
interface ContentItem {
  id: string;
  module_id: string;
  kind: 'explain'|'mcq'|'free';
  prompt: string;             // stem or explanation title
  body?: string;              // explanation markdown
  choices?: string[];         // for mcq
  answer?: string|number;     // mcq index or free rubric pointer
}
```

### C) Daily Synchronisation (adaptive practice)
**Goal:** Keep learners engaged daily using spacing, difficulty targeting, and recency weighting.

**Rules of thumb**
- Newer and weaker topics are prioritised.
- Certified content > non-certified (but certification may be paywalled).
- User can pause or drop any topic.

**API surface (draft)**
- `GET /v1/assignments/today?limit=20` → `{ assignments: Assignment[] }`
- `POST /v1/answers` → `{ assignment_id, response, latency_ms }` → `{ scored: Score, next_review_at }`
- `GET /v1/progress` → rollups for dashboard/analytics

**Data sketch**
```ts
interface Assignment {
  id: string;
  content_item_id: string;
  due_at: string;           // ISO
  weight: number;           // scheduler priority
}

interface Score {
  correct: boolean;
  p_correct: number;       // model-estimated
  delta_mastery: number;   // Bayesian/IRT-style update
}
```

### Storage & services (minimal viable)
- **API** (`/api` service): orchestrates intake → outline → generation → scheduler.
- **DB** (Postgres): learners, modules, items, assignments, answers, audit_events.
- **Object storage**: uploads and generated artifacts.
- **Queue/worker**: long-running generation jobs.

### Audit, analytics, trust
- Every state change emits an `audit_events` row `{ actor, action, entity, before, after, ts }`.
- Keep psychometrics and scoring parameters versioned per cohort/pilot.
- Expose **read-only** `GET /v1/audit/:entity/:id` and `GET /v1/analytics/summaries` for enterprise.

### Feature flags (opt-in)
- **API**: `FF_CONVERSATION_V1`, `FF_GENERATION_V1`, `FF_SCHEDULER_V1`.
- **Web**: `NEXT_PUBLIC_FF_CONVERSATION_V1`, `NEXT_PUBLIC_FF_SCHEDULER_V1`.

### Incremental plan (checklist)
**M0 – End-to-end mock**
- Mock endpoints under `/api/mock/*`; wire UI states (Idle/Processing/Review/Learn).

**M1 – Live intake + outline**
- Implement `POST /v1/intake/start`, SSE events, and `POST /v1/modules/propose`.

**M2 – Confirm + generate**
- Persist outlines, implement `POST /v1/generate` (job + worker), basic MCQ/free generation.

**M3 – Scheduler + daily review**
- Implement `GET /v1/assignments/today`, `POST /v1/answers`, mastery updates, basic nudge cron.

**M4 – Audit + analytics + enterprise polish**
- Trust labels surfaced, read-only audit endpoints, enterprise upsell hooks on review screen.

### Dev ergonomics
- Keep mocks behind `NEXT_PUBLIC_USE_MOCKS=true` and mirror the real shapes above.
- Extend `scripts/smoke-stg.sh` later to include `GET /api/health`, `GET /api/prompts`, and a lightweight `GET /v1/assignments/today` once live.

> No fancy arrows in headers or examples; keep ASCII for Edge runtime compatibility.

## Preview Deploys (opt-in)
PR-based previews are label-gated and auto-expire after 48h. They do not block merges and soft-fail on rate limits.
- Add the  label on a PR to create a preview; remove it to tear down.
- A nightly sweep removes any orphans older than 48h.
- See: [PR Previews runbook](docs/runbooks/pr-previews.md)

## Epics Dashboard
Live view of epics (Open / In Progress / Closed):  
- See: [docs/status/epics.md](docs/status/epics.md)

### Planning

See planning dashboard: docs/status/epics.md (auto-generated via GitHub Actions).
