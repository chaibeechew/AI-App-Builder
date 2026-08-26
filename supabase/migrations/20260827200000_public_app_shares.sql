create table if not exists public.app_shares (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  version_id uuid not null references public.app_versions(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists app_shares_app_id_idx on public.app_shares(app_id);
create index if not exists app_shares_token_idx on public.app_shares(token);

alter table public.app_shares enable row level security;
revoke all on public.app_shares from anon, authenticated;
grant select, insert, update, delete on public.app_shares to authenticated;

create policy "Owners manage their app shares" on public.app_shares
for all to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

create or replace function public.read_public_app_share(p_token text)
returns table (
  app_id uuid,
  app_name text,
  app_description text,
  version_id uuid,
  version_no integer,
  specification jsonb,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.name, a.description, v.id, v.version_no, v.specification, s.expires_at
  from public.app_shares s
  join public.apps a on a.id = s.app_id
  join public.app_versions v on v.id = s.version_id
  where s.token = p_token
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now())
  limit 1;
$$;

revoke execute on function public.read_public_app_share(text) from public, authenticated;
grant execute on function public.read_public_app_share(text) to anon, authenticated;
