--- create:api/migrations/2025-09-16_events.sql
-- telemetry events sink
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id text null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  ts timestamptz not null default now()
);
create index if not exists idx_events_ts on events(ts desc);
create index if not exists idx_events_type_ts on events(type, ts desc);

-- (optional) tighten ledger: add ts if missing & index for 24h sums
-- ensure gen_ledger exists (for fresh DBs)
create table if not exists gen_ledger (
  id uuid primary key default gen_random_uuid(),
  item_id text,
  model_used text not null,
  cost_cents int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_gen_ledger_model on gen_ledger(model_used, created_at);

alter table if exists gen_ledger
  add column if not exists ts timestamptz default now();
create index if not exists idx_gen_ledger_ts on gen_ledger(ts desc);

--- message: db(telemetry): add events table + ledger timestamp & indexes


