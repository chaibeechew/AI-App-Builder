-- Marketing promo codes with server-side redemption and immutable redemption records.
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  free_days integer not null default 0 check (free_days >= 0 and free_days <= 3650),
  bonus_credits bigint not null default 0 check (bonus_credits >= 0 and bonus_credits <= 1000000000),
  max_redemptions integer not null default 1 check (max_redemptions > 0 and max_redemptions <= 10000000),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id),
  user_id uuid not null references auth.users(id),
  redeemed_at timestamptz not null default now(),
  unique (promo_code_id, user_id)
);

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_type text not null check (source_type in ('promo','subscription','referral','admin')),
  source_id uuid,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists promo_redemptions_user_idx on public.promo_redemptions(user_id, redeemed_at desc);
create index if not exists user_entitlements_user_idx on public.user_entitlements(user_id, valid_until);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.user_entitlements enable row level security;

-- No direct INSERT/UPDATE/DELETE grants to normal authenticated users.
revoke all on public.promo_codes from anon, authenticated;
revoke all on public.promo_redemptions from anon, authenticated;
revoke all on public.user_entitlements from anon, authenticated;

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
  new_balance bigint;
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

  if exists (select 1 from public.promo_redemptions where promo_code_id = promo.id and user_id = uid) then
    raise exception 'Promo code already redeemed by this user';
  end if;

  insert into public.promo_redemptions(promo_code_id, user_id) values (promo.id, uid);
  update public.promo_codes set redemption_count = redemption_count + 1 where id = promo.id;

  if promo.bonus_credits > 0 then
    insert into public.credit_accounts(user_id, balance) values (uid, 0)
    on conflict (user_id) do nothing;
    update public.credit_accounts set balance = balance + promo.bonus_credits, updated_at = now() where user_id = uid returning balance into new_balance;
    insert into public.credit_ledger(user_id, entry_type, amount, balance_after, description, metadata)
    values (uid, 'promo', promo.bonus_credits, new_balance, coalesce(promo.description, 'Promo reward'), jsonb_build_object('promoCodeId', promo.id, 'promoCode', promo.code));
  end if;

  if promo.free_days > 0 then
    entitlement_until := now() + make_interval(days => promo.free_days);
    insert into public.user_entitlements(user_id, source_type, source_id, valid_from, valid_until)
    values (uid, 'promo', promo.id, now(), entitlement_until);
  end if;

  return jsonb_build_object('success', true, 'bonusCredits', promo.bonus_credits, 'freeDays', promo.free_days, 'validUntil', entitlement_until);
exception when unique_violation then
  raise exception 'Promo code already redeemed by this user';
end;
$$;

revoke all on function public.redeem_promo_code(text) from public, anon;
grant execute on function public.redeem_promo_code(text) to authenticated;
