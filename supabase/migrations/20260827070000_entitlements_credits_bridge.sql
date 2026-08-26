-- Entitlements are server-controlled benefits granted by subscriptions/promos/referrals.
create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('subscription','promo','referral','admin','system')),
  source_id uuid,
  entitlement_type text not null,
  amount bigint not null default 0 check (amount >= 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);

create index if not exists user_entitlements_user_valid_idx
  on public.user_entitlements(user_id, valid_from, valid_until);
create unique index if not exists user_entitlements_source_unique_idx
  on public.user_entitlements(source_type, source_id, entitlement_type)
  where source_id is not null;

alter table public.user_entitlements enable row level security;
revoke all on public.user_entitlements from anon, authenticated;
grant select on public.user_entitlements to authenticated;
create policy "users can read own entitlements"
  on public.user_entitlements
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Idempotent server-side entitlement grant. Client cannot grant an entitlement because
-- execution is restricted to service-role/server paths.
create or replace function public.grant_entitlement(
  p_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_entitlement_type text,
  p_amount bigint,
  p_valid_from timestamptz default now(),
  p_valid_until timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.user_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.user_entitlements;
begin
  if p_user_id is null or p_amount < 0 then raise exception 'Invalid entitlement'; end if;
  if p_source_type not in ('subscription','promo','referral','admin','system') then raise exception 'Invalid entitlement source'; end if;

  insert into public.user_entitlements(
    user_id, source_type, source_id, entitlement_type, amount,
    valid_from, valid_until, metadata
  ) values (
    p_user_id, p_source_type, p_source_id, p_entitlement_type, p_amount,
    p_valid_from, p_valid_until, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (source_type, source_id, entitlement_type)
  where source_id is not null
  do update set
    amount = excluded.amount,
    valid_from = excluded.valid_from,
    valid_until = excluded.valid_until,
    metadata = excluded.metadata
  returning * into result;

  return result;
end;
$$;

-- No client grants: only trusted server/database owners can invoke this function.
revoke all on function public.grant_entitlement(uuid,text,uuid,text,bigint,timestamptz,timestamptz,jsonb) from public, anon, authenticated;

-- Repair/define the subscription entitlement helper now that its dependency exists.
create or replace function public.has_active_entitlement(p_user_id uuid, p_source_type text default null)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements ue
    where ue.user_id = p_user_id
      and ue.valid_from <= now()
      and (ue.valid_until is null or ue.valid_until > now())
      and (p_source_type is null or ue.source_type = p_source_type)
  );
$$;

revoke all on function public.has_active_entitlement(uuid,text) from public, anon;
grant execute on function public.has_active_entitlement(uuid,text) to authenticated;

-- Credit grants remain ledger-controlled. This bridge records the entitlement source
-- without exposing a client-callable credit minting endpoint.
create or replace function public.entitlement_credit_amount(p_entitlement_id uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(amount, 0)
  from public.user_entitlements
  where id = p_entitlement_id;
$$;

revoke all on function public.entitlement_credit_amount(uuid) from public, anon, authenticated;
