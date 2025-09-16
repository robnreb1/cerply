-- core entities
create table if not exists users(
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists plans(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  brief text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists modules(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id),
  title text not null,
  "order" int not null
);

create table if not exists items(
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id),
  type text not null,
  stem text,
  options jsonb,
  answer int,
  explainer text,
  created_at timestamptz not null default now()
);

create table if not exists attempts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  item_id uuid not null references items(id),
  answer_index int,
  correct int not null,
  time_ms int,
  created_at timestamptz not null default now()
);

create table if not exists review_schedule(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  item_id uuid not null references items(id),
  next_at timestamptz not null,
  strength_score int not null,
  created_at timestamptz not null default now()
);

-- helpful indexes
create index if not exists idx_items_module on items(module_id);
create index if not exists idx_attempts_item on attempts(item_id);
create index if not exists idx_reviews_next on review_schedule(next_at);

