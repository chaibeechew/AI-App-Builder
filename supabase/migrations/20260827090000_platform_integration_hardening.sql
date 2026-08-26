-- Normalize the earlier entitlement table so all migrations use one schema.
alter table public.user_entitlements
  add column if not exists entitlement_type text;
alter table public.user_entitlements
  add column if not exists amount bigint not null default 0;
alter table public.user_entitlements
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.user_entitlements
set entitlement_type = coalesce(entitlement_type, 'access')
where entitlement_type is null;

alter table public.user_entitlements
  alter column entitlement_type set not null;

-- The original promo migration used a narrower source constraint; expand it safely.
alter table public.user_entitlements drop constraint if exists user_entitlements_source_type_check;
alter table public.user_entitlements
  add constraint user_entitlements_source_type_check
  check (source_type in ('promo','subscription','referral','admin','system'));

-- Prevent duplicate entitlement records for the same source/type.
create unique index if not exists user_entitlements_source_unique_idx
  on public.user_entitlements(source_type, source_id, entitlement_type)
  where source_id is not null;

-- Repair promo redemption so bonus credits use the canonical credit transaction ledger.
create or replace function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  promo public.promo_codes%rowtype;
  entitlement_until timestamptz;
  new_balance integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_code is null or length(trim(p_code)) < 3 or length(trim(p_code)) > 64 then raise exception 'Invalid promo code'; end if;

  select * into promo from public.promo_codes
  where code = upper(trim(p_code)) and is_active = true
  for update;
  if not found then raise exception 'Invalid or inactive promo code'; end if;
  if promo.starts_at is not null and now() < promo.starts_at then raise exception 'Promo code is not active yet'; end if;
  if promo.expires_at is not null and now() >= promo.expires_at then raise exception 'Promo code has expired'; end if;
  if promo.redemption_count >= promo.max_redemptions then raise exception 'Promo code redemption limit reached'; end if;
  if exists (select 1 from public.promo_redemptions where promo_code_id = promo.id and user_id = uid) then raise exception 'Promo code already redeemed by this user'; end if;

  insert into public.promo_redemptions(promo_code_id, user_id) values (promo.id, uid);
  update public.promo_codes set redemption_count = redemption_count + 1 where id = promo.id;

  if promo.bonus_credits > 0 then
    insert into public.credit_accounts(user_id, balance) values (uid, 0) on conflict (user_id) do nothing;
    update public.credit_accounts set balance = balance + promo.bonus_credits, updated_at = now() where user_id = uid returning balance into new_balance;
    insert into public.credit_transactions(user_id, amount, balance_after, transaction_type, reference_id, metadata)
    values (uid, promo.bonus_credits::integer, new_balance, 'promo', promo.id::text, jsonb_build_object('promoCodeId', promo.id, 'promoCode', promo.code));
  end if;

  if promo.free_days > 0 then
    entitlement_until := now() + make_interval(days => promo.free_days);
    insert into public.user_entitlements(user_id, source_type, source_id, entitlement_type, amount, valid_from, valid_until, metadata)
    values (uid, 'promo', promo.id, 'access', promo.bonus_credits, now(), entitlement_until, jsonb_build_object('promoCodeId', promo.id, 'promoCode', promo.code));
  end if;

  return jsonb_build_object('success', true, 'bonusCredits', promo.bonus_credits, 'freeDays', promo.free_days, 'validUntil', entitlement_until);
exception when unique_violation then
  raise exception 'Promo code already redeemed by this user';
end;
$$;

revoke all on function public.redeem_promo_code(text) from public, anon;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- Admin shortcut for marketing: create a 90-day free-use code without exposing admin inserts.
create or replace function public.generate_marketing_promo_code(
  p_description text default '90-day free access marketing campaign',
  p_max_redemptions integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  code text := 'MARKET-' || upper(encode(gen_random_bytes(6), 'hex'));
  promo_id uuid;
begin
  if uid is null or coalesce((select raw_app_meta_data->>'role' from auth.users where id = uid), '') <> 'admin' then
    raise exception 'Admin access required';
  end if;
  if p_max_redemptions < 1 or p_max_redemptions > 1000000 then raise exception 'Invalid redemption limit'; end if;

  insert into public.promo_codes(code, description, free_days, bonus_credits, max_redemptions, starts_at, expires_at, created_by)
  values (code, left(coalesce(p_description, ''), 500), 90, 0, p_max_redemptions, now(), now() + interval '90 days', uid)
  returning id into promo_id;

  insert into public.admin_audit_log(admin_user_id, action, target_type, target_id, metadata)
  values (uid, 'marketing_promo.create', 'promo_code', promo_id, jsonb_build_object('freeDays', 90, 'maxRedemptions', p_max_redemptions));

  return jsonb_build_object('id', promo_id, 'code', code, 'freeDays', 90, 'maxRedemptions', p_max_redemptions);
end;
$$;

revoke all on function public.generate_marketing_promo_code(text, integer) from public, anon;
grant execute on function public.generate_marketing_promo_code(text, integer) to authenticated;

-- Apple publishing foundation. Credentials remain server-side; clients only create a request.
create table if not exists public.app_publish_requests (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('apple_ios','apple_ipados','web','android')),
  status text not null default 'queued' check (status in ('queued','building','testing','ready','submitted','processing','published','failed','cancelled')),
  version_id uuid references public.app_versions(id) on delete set null,
  external_build_id text,
  external_submission_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_publish_requests_user_idx on public.app_publish_requests(user_id, created_at desc);
create index if not exists app_publish_requests_app_idx on public.app_publish_requests(app_id, created_at desc);

alter table public.app_publish_requests enable row level security;
revoke all on public.app_publish_requests from anon, authenticated;
grant select on public.app_publish_requests to authenticated;

create policy "Users can view their own publish requests"
on public.app_publish_requests for select to authenticated
using ((select auth.uid()) = user_id);

-- Server-only creation/update. No App Store credentials, signing keys, or provider tokens live here.
create or replace function public.queue_app_publish(p_app_id uuid, p_platform text, p_version_id uuid default null)
returns public.app_publish_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result public.app_publish_requests;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_platform not in ('apple_ios','apple_ipados','web','android') then raise exception 'Unsupported platform'; end if;
  if not exists (select 1 from public.apps where id = p_app_id and owner_id = uid) then raise exception 'App not found'; end if;
  if p_version_id is not null and not exists (select 1 from public.app_versions v join public.apps a on a.id = v.app_id where v.id = p_version_id and v.app_id = p_app_id and a.owner_id = uid) then raise exception 'Version does not belong to app'; end if;

  insert into public.app_publish_requests(app_id, user_id, platform, version_id)
  values (p_app_id, uid, p_platform, p_version_id)
  returning * into result;
  return result;
end;
$$;

revoke all on function public.queue_app_publish(uuid,text,uuid) from public, anon;
grant execute on function public.queue_app_publish(uuid,text,uuid) to authenticated;
