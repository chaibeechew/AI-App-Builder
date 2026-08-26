-- Finance schema completion. Safe to run after the existing finance migrations.

create table if not exists public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  available_amount numeric(18,2) not null default 0 check (available_amount >= 0),
  reserved_amount numeric(18,2) not null default 0 check (reserved_amount >= 0),
  pending_amount numeric(18,2) not null default 0 check (pending_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_reference text not null,
  status text not null default 'pending' check (status in ('pending','verified','suspended','removed')),
  cooling_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payout_account_id uuid not null references public.payout_accounts(id),
  amount numeric(18,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','approved','processing','paid','rejected','failed','cancelled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null,
  amount numeric(18,2) not null,
  balance_after numeric(18,2) not null,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid,
  amount numeric(18,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','approved','processing','refunded','rejected','cancelled')),
  reason text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.cash_accounts enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.withdrawals enable row level security;
alter table public.cash_ledger enable row level security;
alter table public.refund_requests enable row level security;

drop policy if exists cash_accounts_owner_select on public.cash_accounts;
create policy cash_accounts_owner_select on public.cash_accounts for select using (auth.uid() = user_id);
drop policy if exists payout_accounts_owner_all on public.payout_accounts;
create policy payout_accounts_owner_all on public.payout_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists withdrawals_owner_select on public.withdrawals;
create policy withdrawals_owner_select on public.withdrawals for select using (auth.uid() = user_id);
drop policy if exists cash_ledger_owner_select on public.cash_ledger;
create policy cash_ledger_owner_select on public.cash_ledger for select using (auth.uid() = user_id);
drop policy if exists refund_requests_owner_select on public.refund_requests;
create policy refund_requests_owner_select on public.refund_requests for select using (auth.uid() = user_id);

-- No client insert/update/delete policies on cash balances, ledger, withdrawals, or refund requests.
