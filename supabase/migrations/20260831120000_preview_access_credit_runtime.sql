-- Preview-safe access and AI credit runtime for the consolidated LANERIQ AI schema.
-- Production promotion remains held. This migration restores the server-side contracts
-- already used by Generate/Modify while keeping customer financial state non-writable.

create table if not exists public.app_builder_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_first_project_claimed boolean not null default false,
  create_request_id text,
  create_source text,
  create_claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (create_source is null or create_source in ('free_first_project_create','standard_project_create','pro_access'))
);

create table if not exists public.app_builder_account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  standard_project_credits integer not null default 0 check (standard_project_credits >= 0 and standard_project_credits <= 10000),
  pro_valid_from timestamptz,
  pro_valid_until timestamptz,
  updated_at timestamptz not null default now(),
  check (pro_valid_until is null or pro_valid_from is null or pro_valid_until > pro_valid_from)
);

create table if not exists public.app_builder_project_access (
  app_id uuid primary key references public.apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_tier text not null check (access_tier in ('promotion','standard','professional')),
  valid_until timestamptz,
  source_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_builder_project_access_user_idx
  on public.app_builder_project_access(user_id, updated_at desc);

alter table public.app_builder_usage enable row level security;
alter table public.app_builder_account_access enable row level security;
alter table public.app_builder_project_access enable row level security;

revoke all on public.app_builder_usage from anon, authenticated;
revoke all on public.app_builder_account_access from anon, authenticated;
revoke all on public.app_builder_project_access from anon, authenticated;
grant select on public.app_builder_usage, public.app_builder_account_access, public.app_builder_project_access to authenticated;

drop policy if exists app_builder_usage_select_own on public.app_builder_usage;
create policy app_builder_usage_select_own on public.app_builder_usage
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists app_builder_account_access_select_own on public.app_builder_account_access;
create policy app_builder_account_access_select_own on public.app_builder_account_access
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists app_builder_project_access_select_own on public.app_builder_project_access;
create policy app_builder_project_access_select_own on public.app_builder_project_access
for select to authenticated using (user_id = (select auth.uid()));

-- Add idempotency metadata to the consolidated credit ledger without changing existing rows.
alter table public.credit_transactions add column if not exists request_id text;
alter table public.credit_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists credit_transactions_request_type_unique_idx
  on public.credit_transactions(user_id, request_id, type)
  where request_id is not null;

-- Customers may read only their own balances/history through RLS. All financial mutation
-- remains behind the auth-bound RPCs below.
revoke insert, update, delete, truncate on public.credit_accounts from anon, authenticated;
revoke insert, update, delete, truncate on public.credit_transactions from anon, authenticated;
grant select on public.credit_accounts, public.credit_transactions to authenticated;

create or replace function public.consume_app_builder_entitlement(
  p_operation text,
  p_app_id uuid default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  request_key text := left(coalesce(nullif(trim(p_request_id), ''), gen_random_uuid()::text), 160);
  usage_row public.app_builder_usage;
  account_row public.app_builder_account_access;
  project_row public.app_builder_project_access;
  first_app_id uuid;
  first_app_published boolean := false;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_operation not in ('create','modify') then raise exception 'Unsupported entitlement operation'; end if;

  insert into public.app_builder_usage(user_id) values(uid) on conflict (user_id) do nothing;
  insert into public.app_builder_account_access(user_id) values(uid) on conflict (user_id) do nothing;

  select * into usage_row from public.app_builder_usage where user_id = uid for update;
  select * into account_row from public.app_builder_account_access where user_id = uid for update;

  if p_operation = 'create' then
    if usage_row.create_request_id = request_key and usage_row.create_source is not null then
      return jsonb_build_object('allowed', true, 'source', usage_row.create_source, 'replayed', true);
    end if;

    -- The first eligible project is always the promotion before paid access is consumed.
    if not usage_row.free_first_project_claimed
       and not exists(select 1 from public.apps a where a.owner_id = uid) then
      update public.app_builder_usage
        set free_first_project_claimed = true,
            create_request_id = request_key,
            create_source = 'free_first_project_create',
            create_claimed_at = now(),
            updated_at = now()
        where user_id = uid;
      return jsonb_build_object('allowed', true, 'source', 'free_first_project_create', 'promotion', 'free_first_project_until_publish');
    end if;

    if account_row.pro_valid_until is not null and account_row.pro_valid_until > now() then
      update public.app_builder_usage
        set create_request_id = request_key,
            create_source = 'pro_access',
            create_claimed_at = now(),
            updated_at = now()
        where user_id = uid;
      return jsonb_build_object('allowed', true, 'source', 'pro_access', 'valid_until', account_row.pro_valid_until);
    end if;

    if account_row.standard_project_credits > 0 then
      update public.app_builder_account_access
        set standard_project_credits = standard_project_credits - 1, updated_at = now()
        where user_id = uid;
      update public.app_builder_usage
        set create_request_id = request_key,
            create_source = 'standard_project_create',
            create_claimed_at = now(),
            updated_at = now()
        where user_id = uid;
      return jsonb_build_object('allowed', true, 'source', 'standard_project_create');
    end if;

    return jsonb_build_object('allowed', false, 'source', null);
  end if;

  if p_app_id is null then return jsonb_build_object('allowed', false, 'source', null); end if;
  if not exists(select 1 from public.apps a where a.id = p_app_id and a.owner_id = uid) then
    raise exception 'App access denied';
  end if;

  select * into project_row
    from public.app_builder_project_access pa
    where pa.app_id = p_app_id and pa.user_id = uid;

  if found then
    if project_row.access_tier = 'promotion'
       and exists(select 1 from public.apps a where a.id = p_app_id and a.owner_id = uid and a.publish_status <> 'published') then
      return jsonb_build_object('allowed', true, 'source', 'free_first_project_modify', 'ends_at', 'project_publish');
    end if;
    if project_row.access_tier = 'standard' then
      return jsonb_build_object('allowed', true, 'source', 'standard_project_modify');
    end if;
    if project_row.access_tier = 'professional'
       and project_row.valid_until is not null and project_row.valid_until > now() then
      return jsonb_build_object('allowed', true, 'source', 'pro_access', 'valid_until', project_row.valid_until);
    end if;
  end if;

  -- Compatibility for first projects created before project-access binding existed.
  select a.id, coalesce(a.publish_status = 'published', false)
    into first_app_id, first_app_published
    from public.apps a
    where a.owner_id = uid
    order by a.created_at asc, a.id asc
    limit 1;
  if first_app_id = p_app_id and not coalesce(first_app_published, false) then
    return jsonb_build_object('allowed', true, 'source', 'free_first_project_modify', 'ends_at', 'project_publish');
  end if;

  if account_row.pro_valid_until is not null and account_row.pro_valid_until > now() then
    return jsonb_build_object('allowed', true, 'source', 'pro_access', 'valid_until', account_row.pro_valid_until);
  end if;

  return jsonb_build_object('allowed', false, 'source', null);
end;
$$;

revoke all on function public.consume_app_builder_entitlement(text,uuid,text) from public, anon, authenticated;
grant execute on function public.consume_app_builder_entitlement(text,uuid,text) to authenticated;

create or replace function public.bind_app_builder_project_access(p_app_id uuid, p_request_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  request_key text := left(coalesce(nullif(trim(p_request_id), ''), ''), 160);
  usage_row public.app_builder_usage;
  account_row public.app_builder_account_access;
  tier text;
  expiry timestamptz;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if request_key = '' then raise exception 'Request id is required'; end if;
  if not exists(select 1 from public.apps a where a.id = p_app_id and a.owner_id = uid) then raise exception 'App access denied'; end if;

  select * into usage_row from public.app_builder_usage where user_id = uid for update;
  if not found or usage_row.create_request_id is distinct from request_key or usage_row.create_source is null then
    if exists(select 1 from public.app_builder_project_access pa where pa.app_id = p_app_id and pa.user_id = uid) then
      return jsonb_build_object('bound', false, 'replayed', true);
    end if;
    raise exception 'No matching creation entitlement reservation';
  end if;

  select * into account_row from public.app_builder_account_access where user_id = uid;
  if usage_row.create_source = 'free_first_project_create' then tier := 'promotion';
  elsif usage_row.create_source = 'standard_project_create' then tier := 'standard';
  elsif usage_row.create_source = 'pro_access' then
    tier := 'professional';
    expiry := account_row.pro_valid_until;
    if expiry is null or expiry <= now() then raise exception 'Professional access expired before project binding'; end if;
  else raise exception 'Unsupported entitlement source';
  end if;

  insert into public.app_builder_project_access(app_id,user_id,access_tier,valid_until,source_request_id,updated_at)
  values(p_app_id,uid,tier,expiry,request_key,now())
  on conflict (app_id) do update set
    user_id = excluded.user_id,
    access_tier = excluded.access_tier,
    valid_until = excluded.valid_until,
    source_request_id = excluded.source_request_id,
    updated_at = now();

  update public.app_builder_usage
    set create_request_id = null, create_source = null, create_claimed_at = null, updated_at = now()
    where user_id = uid;
  return jsonb_build_object('bound', true, 'tier', tier, 'valid_until', expiry);
end;
$$;

revoke all on function public.bind_app_builder_project_access(uuid,text) from public, anon, authenticated;
grant execute on function public.bind_app_builder_project_access(uuid,text) to authenticated;

create or replace function public.restore_failed_app_builder_create(p_request_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  request_key text := left(coalesce(nullif(trim(p_request_id), ''), ''), 160);
  usage_row public.app_builder_usage;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if request_key = '' then return jsonb_build_object('restored', false); end if;

  select * into usage_row from public.app_builder_usage where user_id = uid for update;
  if not found or usage_row.create_request_id is distinct from request_key or usage_row.create_source is null then
    return jsonb_build_object('restored', false);
  end if;
  if exists(select 1 from public.app_builder_project_access pa where pa.user_id = uid and pa.source_request_id = request_key) then
    return jsonb_build_object('restored', false, 'reason', 'already_bound');
  end if;

  if usage_row.create_source = 'free_first_project_create' then
    if exists(select 1 from public.apps a where a.owner_id = uid) then
      return jsonb_build_object('restored', false, 'reason', 'project_exists');
    end if;
    update public.app_builder_usage set free_first_project_claimed = false where user_id = uid;
  elsif usage_row.create_source = 'standard_project_create' then
    update public.app_builder_account_access
      set standard_project_credits = standard_project_credits + 1, updated_at = now()
      where user_id = uid;
  end if;

  update public.app_builder_usage
    set create_request_id = null, create_source = null, create_claimed_at = null, updated_at = now()
    where user_id = uid;
  return jsonb_build_object('restored', true, 'source', usage_row.create_source);
end;
$$;

revoke all on function public.restore_failed_app_builder_create(text) from public, anon, authenticated;
grant execute on function public.restore_failed_app_builder_create(text) to authenticated;

create or replace function public.consume_ai_credits(
  p_amount numeric,
  p_request_id text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  request_key text := left(coalesce(nullif(trim(p_request_id), ''), ''), 160);
  current_balance numeric;
  existing_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then raise exception 'Invalid credit amount'; end if;
  if request_key = '' then raise exception 'Request id is required'; end if;

  insert into public.credit_accounts(user_id,balance) values(uid,0) on conflict (user_id) do nothing;
  select balance into current_balance from public.credit_accounts where user_id = uid for update;
  select id into existing_id from public.credit_transactions
    where user_id = uid and request_id = request_key and type = 'ai_usage' limit 1;
  if existing_id is not null then
    return jsonb_build_object('charged', false, 'balance', current_balance, 'replayed', true);
  end if;
  if current_balance < p_amount then raise exception 'Insufficient credits'; end if;

  update public.credit_accounts set balance = balance - p_amount, updated_at = now()
    where user_id = uid returning balance into current_balance;
  insert into public.credit_transactions(user_id,amount,type,description,request_id,metadata)
    values(uid,-p_amount,'ai_usage',left(coalesce(p_description,'AI usage'),500),request_key,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('charged', true, 'balance', current_balance);
end;
$$;

revoke all on function public.consume_ai_credits(numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.consume_ai_credits(numeric,text,text,jsonb) to authenticated;

create or replace function public.refund_ai_credits(
  p_request_id text,
  p_amount numeric,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  request_key text := left(coalesce(nullif(trim(p_request_id), ''), ''), 160);
  current_balance numeric;
  charge_amount numeric;
  existing_refund uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 or request_key = '' then raise exception 'Invalid refund request'; end if;

  insert into public.credit_accounts(user_id,balance) values(uid,0) on conflict (user_id) do nothing;
  select balance into current_balance from public.credit_accounts where user_id = uid for update;
  select amount into charge_amount from public.credit_transactions
    where user_id = uid and request_id = request_key and type = 'ai_usage' limit 1;
  if charge_amount is null then return jsonb_build_object('refunded', false, 'balance', current_balance, 'reason', 'charge_not_found'); end if;
  if abs(charge_amount) <> p_amount then raise exception 'Refund amount does not match original charge'; end if;
  select id into existing_refund from public.credit_transactions
    where user_id = uid and request_id = request_key and type = 'ai_refund' limit 1;
  if existing_refund is not null then
    return jsonb_build_object('refunded', false, 'balance', current_balance, 'replayed', true);
  end if;

  update public.credit_accounts set balance = balance + p_amount, updated_at = now()
    where user_id = uid returning balance into current_balance;
  insert into public.credit_transactions(user_id,amount,type,description,request_id,metadata)
    values(uid,p_amount,'ai_refund',left(coalesce(p_description,'AI usage refund'),500),request_key,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('refunded', true, 'balance', current_balance);
end;
$$;

revoke all on function public.refund_ai_credits(text,numeric,text,jsonb) from public, anon, authenticated;
grant execute on function public.refund_ai_credits(text,numeric,text,jsonb) to authenticated;

-- Future payment webhooks/admin server paths can grant exactly one Standard project credit
-- or 365-day Professional access. Customers cannot execute these grant functions.
create or replace function public.grant_standard_project_credit(p_user_id uuid, p_count integer default 1)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_count < 1 or p_count > 100 then raise exception 'Invalid Standard access grant'; end if;
  insert into public.app_builder_account_access(user_id,standard_project_credits)
  values(p_user_id,p_count)
  on conflict (user_id) do update set
    standard_project_credits = public.app_builder_account_access.standard_project_credits + excluded.standard_project_credits,
    updated_at = now();
end;
$$;
revoke all on function public.grant_standard_project_credit(uuid,integer) from public, anon, authenticated;
grant execute on function public.grant_standard_project_credit(uuid,integer) to service_role;

create or replace function public.grant_pro_access(p_user_id uuid, p_days integer default 365)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_at timestamptz;
  end_at timestamptz;
begin
  if p_user_id is null or p_days < 1 or p_days > 730 then raise exception 'Invalid Professional access grant'; end if;
  select greatest(now(), coalesce(pro_valid_until, now())) into start_at
    from public.app_builder_account_access where user_id = p_user_id;
  start_at := coalesce(start_at, now());
  end_at := start_at + make_interval(days => p_days);
  insert into public.app_builder_account_access(user_id,pro_valid_from,pro_valid_until)
  values(p_user_id,now(),end_at)
  on conflict (user_id) do update set
    pro_valid_from = case when public.app_builder_account_access.pro_valid_until is null or public.app_builder_account_access.pro_valid_until <= now() then now() else public.app_builder_account_access.pro_valid_from end,
    pro_valid_until = end_at,
    updated_at = now();
  return end_at;
end;
$$;
revoke all on function public.grant_pro_access(uuid,integer) from public, anon, authenticated;
grant execute on function public.grant_pro_access(uuid,integer) to service_role;
