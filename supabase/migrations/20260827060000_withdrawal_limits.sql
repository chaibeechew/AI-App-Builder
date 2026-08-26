-- Withdrawal guardrails: $10 minimum, $1,000 per transaction, $2,000 daily, $5,000 monthly.
-- Limits are enforced inside the trusted database function, not by the client.

insert into public.platform_settings(key, value)
values
  ('maximum_withdrawal_usd', '1000'::jsonb),
  ('daily_withdrawal_limit_usd', '2000'::jsonb),
  ('monthly_withdrawal_limit_usd', '5000'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

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
  max_amount numeric := 1000;
  daily_limit numeric := 2000;
  monthly_limit numeric := 5000;
  daily_total numeric;
  monthly_total numeric;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount < min_amount then raise exception 'Minimum withdrawal is $10'; end if;
  if p_amount > max_amount then raise exception 'Maximum single withdrawal is $1,000'; end if;

  select * into payout from public.payout_accounts
  where id = p_payout_account_id and user_id = uid and status = 'verified'
  for update;
  if not found then raise exception 'Verified payout account required'; end if;
  if payout.cooling_until is not null and now() < payout.cooling_until then raise exception 'Payout account is still in cooling period'; end if;

  select coalesce(sum(amount), 0) into daily_total
  from public.withdrawals
  where user_id = uid
    and requested_at >= date_trunc('day', now())
    and requested_at < date_trunc('day', now()) + interval '1 day'
    and status not in ('rejected','failed','cancelled');
  if daily_total + p_amount > daily_limit then raise exception 'Daily withdrawal limit is $2,000'; end if;

  select coalesce(sum(amount), 0) into monthly_total
  from public.withdrawals
  where user_id = uid
    and requested_at >= date_trunc('month', now())
    and requested_at < date_trunc('month', now()) + interval '1 month'
    and status not in ('rejected','failed','cancelled');
  if monthly_total + p_amount > monthly_limit then raise exception 'Monthly withdrawal limit is $5,000'; end if;

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
