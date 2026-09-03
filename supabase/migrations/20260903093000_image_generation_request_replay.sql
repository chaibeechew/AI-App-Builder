create table if not exists public.image_generation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (char_length(request_id) between 1 and 160),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending','succeeded','fallback','failed')),
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create index if not exists image_generation_requests_user_updated_idx
  on public.image_generation_requests(user_id, updated_at desc);

alter table public.image_generation_requests enable row level security;
revoke all on table public.image_generation_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.image_generation_requests to service_role;

comment on table public.image_generation_requests is 'Server-only LANERIQ Image Studio request ledger for idempotent provider execution and replay recovery.';
