-- Refund + cash withdrawal foundation.
-- Referral earnings are a temporary six-month campaign; cash and AI Credits remain separate.

create table if not exists public.cash_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_amount numeric(18,2) not null default 0 check (available_amount >= 0),
  pending_amount numeric(18,2) not null default 0 check (pending_amount >= 0),
  reserved_amount numeric(18,2) not null default 0 check (reserved_amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('referral_pending','referral_release','withdrawal_reserve','withdrawal_release','withdrawal_paid','refund_reversal','admin_adjustment')),
  amount numeric(18,2) not null check (amount <> 0),
  balance_after numeric(18,2) not null check (balance_after >= 0),
  reference_id uuid,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cash_ledger_user_created_idx on public.cash_ledger(user_id, created_at desc);

create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  account_reference text not null,
  status text not null default 'pending' check (status in ('pending','verified','disabled')),
  verified_at timestamptz,
  cooling_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, account_reference)
);

create index if not exists payout_accounts_user_idx on public.payout_accounts(user_id, updated_at desc);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payout_account_id uuid not null references public.payout_accounts(id),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','approved','processing','paid','rejected','failed','cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  paid_at timestamptz,
  failure_reason text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists withdrawals_user_idx on public.withdrawals(user_id, requested_at desc);

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id),
  status text not null default 'requested' check (status in ('requested','approved','rejected','processing','refunded','cancelled')),
  reason text,
  requested_at timestamptz not null default now(),
  eligible_until timestamptz not null,
  processed_at timestamptz,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists refund_requests_one_open_per_subscription
  on public.refund_requests(subscription_id)
  where status in ('requested','approved','processing');

create index if not exists refund_requests_user_idx on public.refund_requests(user_id, requested_at desc);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings(key, value)
values
  ('referral_campaign', jsonb_build_object('enabled', true, 'duration_days', 180)),
  ('referral_reward_hold_days', '30'::jsonb),
  ('minimum_withdrawal_usd', '10'::jsonb),
  ('withdrawal_processing_business_days', jsonb_build_object('min', 3, 'max', 7)),
  ('payout_account_cooling_hours', '72'::jsonb),
  ('subscription_refund_window_days', '7'::jsonb)
on conflict (key) do nothing;

alter table public.cash_accounts enable row level security;
alter table public.cash_ledger enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.withdrawals enable row level security;
alter table public.refund_requests enable row level security;
alter table public.platform_settings enable row level security;

revoke all on public.cash_accounts from anon, authenticated;
revoke all on public.cash_ledger from anon, authenticated;
revoke all on public.payout_accounts from anon, authenticated;
revoke all on public.withdrawals from anon, authenticated;
revoke all on public.refund_requests from anon, authenticated;
revoke all on public.platform_settings from anon, authenticated;

grant select on public.cash_accounts to authenticated;
grant select on public.cash_ledger to authenticated;
grant select on public.payout_accounts to authenticated;
grant select on public.withdrawals to authenticated;
grant select on public.refund_requests to authenticated;

create policy "Users can view own cash account" on public.cash_accounts
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can view own cash ledger" on public.cash_ledger
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can view own payout accounts" on public.payout_accounts
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can view own withdrawals" on public.withdrawals
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can view own refund requests" on public.refund_requests
for select to authenticated using ((select auth.uid()) = user_id);

-- Server-side withdrawal request. It reserves money atomically; the client never supplies a balance.
create or replace function public.request_withdrawal(p_payout_account_id uuid, p_amount numeric)
returns public.withdrawals
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  account public.cash_accounts;
  payout public.payout_accounts;
  withdrawal public.withdrawals;
  min_amount numeric := 10;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount < min_amount then raise exception 'Minimum withdrawal is $10'; end if;

  select * into payout from public.payout_accounts
  where id = p_payout_account_id and user_id = uid and status = 'verified'
  for update;
  if not found then raise exception 'Verified payout account required'; end if;
  if payout.cooling_until is not null and now() < payout.cooling_until then raise exception 'Payout account is still in cooling period'; end if;

  insert into public.cash_accounts(user_id) values (uid) on conflict (user_id) do nothing;
  select * into account from public.cash_accounts where user_id = uid for update;
  if account.available_amount < p_amount then raise exception 'Insufficient available balance'; end if;

  update public.cash_accounts
  set available_amount = available_amount - p_amount,
      reserved_amount = reserved_amount + p_amount,
      updated_at = now()
  where user_id = uid;

  insert into public.withdrawals(user_id, payout_account_id, amount, status)
  values (uid, p_payout_account_id, p_amount, 'pending')
  returning * into withdrawal;

  insert into public.cash_ledger(user_id, entry_type, amount, balance_after, reference_id, description)
  select uid, 'withdrawal_reserve', -p_amount, available_amount, withdrawal.id, 'Withdrawal reserved'
  from public.cash_accounts where user_id = uid;

  return withdrawal;
end;
$$;

grant execute on function public.request_withdrawal(uuid, numeric) to authenticated;
revoke all on function public.request_withdrawal(uuid, numeric) from public, anon;

-- Refund request only; actual money movement must be performed by a verified server-side payment workflow.
create or replace function public.request_subscription_refund(p_subscription_id uuid, p_reason text default null)
returns public.refund_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  sub public.subscriptions;
  refund public.refund_requests;
  window_days integer := 7;
  eligible_until timestamptz;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into sub from public.subscriptions where id = p_subscription_id and user_id = uid for update;
  if not found then raise exception 'Subscription not found'; end if;
  eligible_until := sub.created_at + make_interval(days => window_days);
  if now() > eligible_until then raise exception 'Refund window has expired'; end if;
  if exists (select 1 from public.refund_requests where subscription_id = p_subscription_id and status in ('requested','approved','processing')) then raise exception 'Refund already requested'; end if;

  insert into public.refund_requests(user_id, subscription_id, reason, eligible_until)
  values (uid, p_subscription_id, left(coalesce(p_reason, ''), 1000), eligible_until)
  returning * into refund;
  return refund;
end;
$$;

grant execute on function public.request_subscription_refund(uuid, text) to authenticated;
revoke all on function public.request_subscription_refund(uuid, text) from public, anon;

-- Referral rewards remain pending for 30 days. This function is intended for a trusted scheduled/server process.
create or replace function public.release_mature_referral_rewards()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reward public.referral_rewards;
  released integer := 0;
  hold_days integer := 30;
  account_balance numeric;
begin
  for reward in
    select * from public.referral_rewards
    where status = 'pending'
      and amount > 0
      and qualified_at is not null
      and qualified_at <= now() - make_interval(days => hold_days)
    for update skip locked
  loop
    update public.referral_rewards
    set status = 'available', available_at = now()
    where id = reward.id and status = 'pending';

    insert into public.cash_accounts(user_id) values (reward.referrer_user_id)
    on conflict (user_id) do nothing;
    update public.cash_accounts
    set available_amount = available_amount + reward.amount,
        pending_amount = greatest(0, pending_amount - reward.amount),
        updated_at = now()
    where user_id = reward.referrer_user_id
    returning available_amount into account_balance;

    insert into public.cash_ledger(user_id, entry_type, amount, balance_after, reference_id, description)
    values (reward.referrer_user_id, 'referral_release', reward.amount, account_balance, reward.id, 'Referral reward released after holding period');
    released := released + 1;
  end loop;
  return released;
end;
$$;

revoke all on function public.release_mature_referral_rewards() from public, anon, authenticated;

-- No direct client writes to cash, withdrawals, refunds, or settings.
