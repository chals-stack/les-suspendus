create table if not exists workshops (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists workshops_updated_at_idx on workshops(updated_at);
