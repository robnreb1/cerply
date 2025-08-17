_Last reconciled: 2025-08-17_
Legend: ✅ Done · 🚧 In progress · ❌ Not started
- Local dev: Web `http://localhost:3000`, API `http://localhost:8080`, AI `http://localhost:8090`
- Dev command: `npm run dev` (spawns `web` and `api`)
- GET `/health` — ping
- POST `/ingest/policy` — ingest a policy (in-memory store)
- POST `/rde/decompose` — decompose requirements
- GET `/evidence/coverage` — compute ECS/gaps from current store
- POST `/api/items/generate`
  - **Request** (`GenerateItemsReq`):
    - `chunks: string[]` (≥1 non-empty)
    - `count_objectives: number` (1..20)
    - `items_per_objective: number` (1..10)
  - **Response** (`GenerateItemsResp`):
    - `items: MCQItem[]`
  - **Validation**: Zod schema `GenerateItemsReqSchema` and error shape `{ error: { code, message, details? } }`.
- Replace in-memory policy store with Postgres.
- Tables:
  - `policies(id uuid pk, scope_id text, title text, body text, created_at timestamptz default now())`
  - `evidence_nodes(id uuid pk, scope_id text, kind text, payload jsonb, created_at timestamptz)`
  - `evidence_edges(id uuid pk, src uuid fk, dst uuid fk, kind text, payload jsonb)`
- Migrations with `drizzle` or `knex`.
- Compute ECS from DB; expose from `/evidence/coverage?scopeId=...`.
- Add `/evidence/export` — zipped JSON bundle (nodes, edges, policies, computed ECS snapshot).

## 5) Web (Next.js) — 🚧
- ✅ **Curate UI** `/curate`: paste chunks, call `/api/items/generate`, render MCQs.
- ECS summary card and "gaps" list fed by `/evidence/coverage?scopeId=demo`. (❌)
- ✅ Learner flow `/learn` (adaptive practice loop, MVP)
## 6) Reporting & analytics — ❌
- Per-user quiz performance (streak, mastery per objective).
- Team reporting rollups (org > team > user).

## 7) Non-functional — 🚧
- Structured logging.
- Error envelope consistency across API.
- Port collisions playbook (kill 3000/8080 pids).
- Basic vitest already present.

## 8) Open decisions
- Choice of SQL tool (Drizzle vs Knex).
- Evidence graph schema tweaks (kinds, payload shapes).

## 9) Change log
- 2025-08-17: Learner flow working end-to-end (UI + /learn API).
- 2025-08-17: Created master spec, documented `/api/items/generate` contract.

- 2025-08-17: Learn page skeleton; fixed TypeScript phase bug.

- ✅ POST `/learn/next` → `{ sessionId, item }`
- ✅ POST `/learn/submit` → `{ correct, correctIndex, explainer }`

- 2025-08-17: Learn API online; manual cURL flow verified (next → submit → next).
