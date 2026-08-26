create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  currency text not null default 'CREDIT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('grant','consume','refund','adjustment','subscription','promo','referral_reward')),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_created_idx
  on public.credit_ledger(user_id, created_at desc);

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

create or replace function public.consume_credits(p_amount bigint, p_description text default null, p_metadata jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_balance bigint;
begin
  if uid is null or p_amount is null or p_amount <= 0 then
    return null;
  end if;

  insert into public.credit_accounts(user_id, balance)
  values (uid, 0)
  on conflict (user_id) do nothing;

  update public.credit_accounts
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = uid
    and balance >= p_amount
  returning balance into new_balance;

  if new_balance is null then
    return null;
  end if;

  insert into public.credit_ledger(user_id, entry_type, amount, balance_after, description, metadata)
  values (uid, 'consume', -p_amount, new_balance, p_description, coalesce(p_metadata, '{}'::jsonb));

  return new_balance;
end;
$$;

revoke all on function public.consume_credits(bigint, text, jsonb) from public, anon;
grant execute on function public.consume_credits(bigint, text, jsonb) to authenticated;

alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;

revoke all on public.credit_accounts from anon, authenticated;
revoke all on public.credit_ledger from anon, authenticated;
grant select on public.credit_accounts to authenticated;
grant select on public.credit_ledger to authenticated;

create policy "Users can view their own credit account"
on public.credit_accounts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own credit ledger"
on public.credit_ledger for select
to authenticated
using ((select auth.uid()) = user_id);
