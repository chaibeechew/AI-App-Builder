-- Final billing/credits integration. Payment success remains server-controlled.

create or replace function public.grant_entitlement_credits(p_entitlement_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.user_entitlements;
  account public.credit_accounts;
  existing_count integer;
begin
  select * into e from public.user_entitlements where id = p_entitlement_id for update;
  if not found then raise exception 'Entitlement not found'; end if;
  if e.valid_from > now() or (e.valid_until is not null and e.valid_until <= now()) then
    raise exception 'Entitlement is not active';
  end if;
  if e.amount <= 0 then return 0; end if;

  select count(*) into existing_count
  from public.credit_transactions
  where user_id = e.user_id
    and transaction_type = 'subscription'
    and reference_id = e.id::text;
  if existing_count > 0 then return 0; end if;

  insert into public.credit_accounts(user_id, balance)
  values (e.user_id, 0)
  on conflict (user_id) do nothing;

  update public.credit_accounts
  set balance = balance + e.amount, updated_at = now()
  where user_id = e.user_id
  returning * into account;

  insert into public.credit_transactions(user_id, amount, balance_after, transaction_type, reference_id, metadata)
  values (e.user_id, e.amount, account.balance, 'subscription', e.id::text,
          jsonb_build_object('entitlement_id', e.id, 'source_type', e.source_type, 'source_id', e.source_id));

  return e.amount;
end;
$$;

revoke all on function public.grant_entitlement_credits(uuid) from public, anon, authenticated;

-- Called only by a trusted payment/webhook path after a provider-confirmed subscription state.
create or replace function public.sync_subscription_entitlement(p_subscription_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions;
  p public.subscription_plans;
  e public.user_entitlements;
begin
  select * into s from public.subscriptions where id = p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if s.status not in ('active','trialing') then raise exception 'Subscription is not active'; end if;

  select * into p from public.subscription_plans where id = s.plan_id;
  if not found then raise exception 'Subscription plan not found'; end if;

  select * into e
  from public.grant_entitlement(
    s.user_id,
    'subscription',
    s.id,
    'included_credits',
    p.included_credits,
    coalesce(s.current_period_start, now()),
    s.current_period_end,
    jsonb_build_object('plan_code', p.code, 'subscription_id', s.id)
  );

  perform public.grant_entitlement_credits(e.id);
  return e.id;
end;
$$;

revoke all on function public.sync_subscription_entitlement(uuid) from public, anon, authenticated;

-- No client-side payment mutation path.
revoke all on public.payment_events from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
