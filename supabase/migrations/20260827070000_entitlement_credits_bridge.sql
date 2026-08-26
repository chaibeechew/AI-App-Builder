-- Secure bridge: entitlements may grant credits, but clients cannot mint either.

create or replace function public.grant_entitlement_credits(p_entitlement_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.user_entitlements;
  ca public.credit_accounts;
  existing bigint;
  new_balance bigint;
begin
  select * into e from public.user_entitlements where id = p_entitlement_id for update;
  if not found then raise exception 'Entitlement not found'; end if;
  if e.valid_from > now() or (e.valid_until is not null and e.valid_until <= now()) then
    raise exception 'Entitlement is not active';
  end if;
  if e.amount <= 0 then return 0; end if;

  select count(*) into existing
  from public.credit_transactions
  where user_id = e.user_id
    and source_type = 'entitlement'
    and source_id = e.id;
  if existing > 0 then return 0; end if;

  insert into public.credit_accounts(user_id, balance)
  values (e.user_id, e.amount)
  on conflict (user_id) do update
    set balance = public.credit_accounts.balance + excluded.balance,
        updated_at = now()
  returning balance into new_balance;

  insert into public.credit_transactions(user_id, transaction_type, amount, balance_after, source_type, source_id, metadata)
  values (e.user_id, 'grant', e.amount, new_balance, 'entitlement', e.id, jsonb_build_object('entitlement_source', e.source_type));

  return e.amount;
end;
$$;

revoke all on function public.grant_entitlement_credits(uuid) from public, anon, authenticated;

-- Consumption remains server-only and cannot be invoked by a browser.
revoke all on function public.consume_credits(uuid, bigint, text, text) from public, anon, authenticated;

-- Admin/server paths can call the bridge with a privileged database role.
