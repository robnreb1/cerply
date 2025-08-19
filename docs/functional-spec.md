# Cerply — Functional Spec (Master)

_Last reconciled: 2025-08-19_

## 0) Status key
✅ Done · 🚧 In progress · ❌ Not started · 🧪 Behind feature flag

## 1) API (Fastify) — ✅
- Health:
  - GET `/api/health` ✅
  - GET `/health` ✅ (alias; prefer `/api/health`)
- Evidence coverage (stubbed, stable envelope):  
  - GET `/evidence/coverage?scopeId=…` ✅  
  - GET `/api/evidence/coverage?scopeId=…` ✅
- Item generation (MVP):
  - POST `/api/items/generate` ✅
    - req: `{ chunks: string[], count_objectives?: number, items_per_objective?: number }`
    - res: `{ items: MCQItem[], objectives: Objective[] }`
- Learn session (MVP):
  - POST `/learn/next` ✅
  - POST `/learn/submit` ✅
- Connectors (🧪 `ff_connectors_basic_v1`):
  - OPTIONS `/import/file` (CORS preflight) ✅
  - POST `/import/url` �� (stub extraction; returns chunks)
  - POST `/import/file` 🧪 (text or base64; .pdf/.docx stubs chunk safely)
  - POST `/import/transcript` 🧪 (line-batched chunks)
- Quality Bar (🧪 `ff_quality_bar_v1`):
  - POST `/curator/quality/compute` 🧪 (adds `meta.readability`, `meta.bannedFlags`, `meta.qualityScore`)
- Certified SLA status (🧪 `ff_certified_sla_status_v1`):
  - GET `/certified/status?packId=…` 🧪
- Marketplace/Guild (🧪 `ff_marketplace_ledgers_v1`):
  - GET `/marketplace/ledger/summary` 🧪
- Group sharing & challenges (🧪 `ff_group_challenges_v1`):
  - POST `/groups` 🧪
  - POST `/challenges` 🧪
  - GET `/challenges/:id/leaderboard` 🧪

### 1.1 API Data Types (MVP)
- `MCQItem { id, stem, options[4], correctIndex }`
- `Objective { id, title, items: MCQItem[] }`
- (Quality meta, flagged) `ItemMeta { readability?, bannedFlags[], qualityScore?, sourceSnippet? }`
- (Stats, flagged) `ItemStats { firstTryCorrect?, avgTimeMs?, discrimination? }`

## 2) Feature flags — ✅
- `ff_connectors_basic_v1` (import/url|file|transcript, preflight) — **ON in dev**
- `ff_quality_bar_v1` (quality compute) — **ON in dev**
- `ff_cost_guardrails_v1` (ledger stubs on generate) — optional
- `ff_group_challenges_v1`, `ff_certified_sla_status_v1`, `ff_marketplace_ledgers_v1`, `ff_benchmarks_optin_v1` — default OFF

## 3) Web (Next.js) — 🚧
- ✅ `/curate`  
  - **Source tab**: paste text + file/url/transcript (when flag on), chunk & save  
  - **Generate tab**: calls `/api/items/generate`, renders MCQs  
  - **Quality tab** (flag on): calls `/curator/quality/compute`
- ✅ `/learn` (adaptive practice loop MVP)
- ✅ `/style` (brand tokens playground)
- ❌ Coverage card fed by `/evidence/coverage` (simple dashboard)

## 4) Brand & UI System — ✅
- Tailwind configured with brand CSS variables (coral + warm neutrals), radii (8/12/16), shadows (sm/md/lg).  
- Global tokens in `globals.css`; `BrandHeader` placeholder present.

## 5) Non-functional — 🚧
- ✅ CORS enabled; structured logs from Fastify.
- ✅ Idempotent route registration (safeGet/safePost/safeOptions) to survive `tsx` HMR.
- ✅ Port-collision playbook documented (3000/8080).
- 🚧 Error envelope consistency across all routes.

## 6) Data/Persistence — ❌
- Replace in-memory with Postgres for: policies/evidence, sessions, connectors imports, ledgers, groups/challenges.

## 7) Reporting & analytics — ❌
- Per-user quiz performance; team/org rollups.
- Benchmarks (🧪 k-anon) gated by tenant toggle.

## 8) Backlog (top)
1. **DB layer** (Drizzle vs Knex) + migrations.  
2. Persist imported sources & chunks; associate to scopeId.  
3. `/evidence/coverage` UI card (web).  
4. Quality Bar UI polish (score breakdown, filters).  
5. Cost guardrails routing & caching (when model integration added).  
6. iOS/Android app shells (React Native/Expo) — tracked.  
7. Marketplace & payouts (flag → persistence).  

## 9) Acceptance criteria
- Curator edit ≤ 4 min/item; median item quality ≥ 70 (when flag on).
- Import supports: text, base64 (`.pdf/.docx` stub), transcript batching.
- Learn loop: submit/next cycle works; correctness feedback present.
- Style page renders brand tokens; AA on primary/on-primary.

## 10) Change log
- **2025-08-19**: Added feature-flagged routes (connectors, quality, certified, marketplace, groups), OPTIONS preflight, brand tokens page; spec reconciled to v2.3.
- **2025-08-17**: Initial spec + items generate + learn MVP.
