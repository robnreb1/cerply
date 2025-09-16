------------------------------------------------------------------------------
# Observability & Cost Ledger (v1)
Endpoints (DB-aware):
- GET /api/analytics/pilot → last 24h summary (events + ledger)
- GET /api/analytics/events.csv?from=...&to=...
- GET /api/ledger/export.csv?from=...&to=...
- GET /api/ledger/totals
- GET /api/ledger/alarm  (env: BUDGET_LIMIT_CENTS, BUDGET_LOOKBACK_HOURS)

Local (no DB) returns `db:false`. With Postgres bound, all endpoints return real data.

Staging checklist:
1) Set DATABASE_URL on Render and restart API.
2) Run migrations (events/gen_ledger) — see `/api/migrations/*` or SQL below.
3) Optional: set BUDGET_LIMIT_CENTS=500 (≈£5) and BUDGET_LOOKBACK_HOURS=24.
4) Hit `/api/ingest/generate` once (with cookie) and re-check `/api/ledger/totals`.

Example SQL (if you need manual create):
```sql
create table if not exists events(
  id uuid primary key default gen_random_uuid(),
  user_id text,
  type text not null,
  payload jsonb,
  ts timestamptz not null default now()
);
create table if not exists gen_ledger(
  id uuid primary key default gen_random_uuid(),
  item_id text,
  model_used text not null,
  cost_cents int not null default 0,
  created_at timestamptz not null default now()
);

