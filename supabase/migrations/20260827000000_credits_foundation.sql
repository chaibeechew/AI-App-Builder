create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  transaction_type text not null check (transaction_type in ('grant','consume','refund','adjustment','subscription','promo','referral_reward')),
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions(user_id, created_at desc);

create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.credit_accounts(user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_credits on auth.users;
create trigger on_auth_user_created_credits
after insert on auth.users
for each row execute function public.handle_new_user_credits();

create or replace function public.ensure_credit_account(target_user_id uuid)
returns public.credit_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.credit_accounts;
begin
  if auth.uid() is null or auth.uid() <> target_user_id then
    raise exception 'Not authorized';
  end if;

  insert into public.credit_accounts(user_id, balance)
  values (target_user_id, 0)
  on conflict (user_id) do nothing;

  select * into account
  from public.credit_accounts
  where user_id = target_user_id;

  return account;
end;
$$;

create or replace function public.consume_credits(
  credit_amount integer,
  transaction_type text default 'consume',
  reference_id text default null,
  transaction_metadata jsonb default '{}'::jsonb
)
returns public.credit_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_balance integer;
  new_balance integer;
  account public.credit_accounts;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if credit_amount is null or credit_amount <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  if transaction_type not in ('consume') then
    raise exception 'Invalid transaction type';
  end if;

  insert into public.credit_accounts(user_id, balance)
  values (current_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into current_balance
  from public.credit_accounts
  where user_id = current_user_id
  for update;

  if current_balance < credit_amount then
    raise exception 'Insufficient credits';
  end if;

  new_balance := current_balance - credit_amount;

  update public.credit_accounts
  set balance = new_balance, updated_at = now()
  where user_id = current_user_id
  returning * into account;

  insert into public.credit_transactions(user_id, amount, balance_after, transaction_type, reference_id, metadata)
  values (current_user_id, -credit_amount, new_balance, transaction_type, reference_id, coalesce(transaction_metadata, '{}'::jsonb));

  return account;
end;
$$;

create or replace function public.grant_credits(
  target_user_id uuid,
  credit_amount integer,
  transaction_type text default 'grant',
  reference_id text default null,
  transaction_metadata jsonb default '{}'::jsonb
)
returns public.credit_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_balance integer;
  account public.credit_accounts;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Grants are intentionally not exposed as a normal user action.
  -- They are reserved for trusted server-side/admin flows.
  if transaction_type not in ('grant','refund','adjustment','subscription','promo','referral_reward') then
    raise exception 'Invalid grant type';
  end if;

  if credit_amount is null or credit_amount <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  -- Until an explicit admin role is introduced, a user may only grant credits to themselves
  -- through trusted server-side calls that use this function's security boundary.
  if current_user_id <> target_user_id then
    raise exception 'Not authorized';
  end if;

  insert into public.credit_accounts(user_id, balance)
  values (target_user_id, 0)
  on conflict (user_id) do nothing;

  update public.credit_accounts
  set balance = balance + credit_amount, updated_at = now()
  where user_id = target_user_id
  returning * into account;

  new_balance := account.balance;

  insert into public.credit_transactions(user_id, amount, balance_after, transaction_type, reference_id, metadata)
  values (target_user_id, credit_amount, new_balance, transaction_type, reference_id, coalesce(transaction_metadata, '{}'::jsonb));

  return account;
end;
$$;

create or replace function public.touch_credit_account_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists credit_accounts_touch_updated_at on public.credit_accounts;
create trigger credit_accounts_touch_updated_at
before update on public.credit_accounts
for each row execute function public.touch_credit_account_updated_at();

alter table public.credit_accounts enable row level security;
alter table public.credit_transactions enable row level security;

revoke all on public.credit_accounts from anon, authenticated;
revoke all on public.credit_transactions from anon, authenticated;
grant select on public.credit_accounts to authenticated;
grant select on public.credit_transactions to authenticated;
grant execute on function public.ensure_credit_account(uuid) to authenticated;
grant execute on function public.consume_credits(integer, text, text, jsonb) to authenticated;
-- grant_credits is intentionally not granted to authenticated users.

create policy "Users can view their own credit account"
on public.credit_accounts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own credit transactions"
on public.credit_transactions for select
to authenticated
using ((select auth.uid()) = user_id);

revoke execute on function public.handle_new_user_credits() from public, anon, authenticated;
revoke execute on function public.touch_credit_account_updated_at() from public, anon, authenticated;
revoke execute on function public.grant_credits(uuid, integer, text, text, jsonb) from public, anon, authenticated;
