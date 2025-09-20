-- Cerply Certified scaffold tables
create table if not exists certified_jobs (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  status text not null default 'queued',
  created_at timestamptz default now()
);

create table if not exists certified_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references certified_jobs(id),
  step text not null,
  payload jsonb,
  result jsonb,
  cost_cents int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_certified_steps_job on certified_steps(job_id, created_at);


