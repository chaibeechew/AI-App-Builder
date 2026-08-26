-- Safe, server-side credit lifecycle for AI generation/modification.
-- Uses the existing credit_accounts + credit_ledger schema.

create unique index if not exists credit_ledger_consume_request_uidx
  on public.credit_ledger(user_id, (metadata->>'requestId'))
  where entry_type = 'consume' and metadata ? 'requestId';

create or replace function public.consume_ai_credits(
  p_amount bigint,
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
  current_balance bigint;
  new_balance bigint;
  existing_balance bigint;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  if p_request_id is null or length(trim(p_request_id)) < 8 or length(p_request_id) > 128 then
    raise exception 'Invalid request id';
  end if;

  select balance_after into existing_balance
  from public.credit_ledger
  where user_id = uid
    and entry_type = 'consume'
    and metadata->>'requestId' = p_request_id
  order by created_at desc
  limit 1;

  if existing_balance is not null then
    return jsonb_build_object('charged', false, 'balance', existing_balance);
  end if;

  insert into public.credit_accounts(user_id, balance)
  values (uid, 0)
  on conflict (user_id) do nothing;

  select balance into current_balance
  from public.credit_accounts
  where user_id = uid
  for update;

  if current_balance < p_amount then
    raise exception 'Insufficient credits';
  end if;

  new_balance := current_balance - p_amount;

  update public.credit_accounts
  set balance = new_balance, updated_at = now()
  where user_id = uid;

  insert into public.credit_ledger(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    uid,
    'consume',
    -p_amount,
    new_balance,
    coalesce(p_description, 'AI usage'),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('requestId', p_request_id)
  );

  return jsonb_build_object('charged', true, 'balance', new_balance);
exception
  when unique_violation then
    select balance_after into existing_balance
    from public.credit_ledger
    where user_id = uid
      and entry_type = 'consume'
      and metadata->>'requestId' = p_request_id
    order by created_at desc
    limit 1;
    if existing_balance is not null then
      return jsonb_build_object('charged', false, 'balance', existing_balance);
    end if;
    raise;
end;
$$;

create or replace function public.refund_ai_credits(
  p_request_id text,
  p_amount bigint,
  p_description text default 'AI request failed - credit refund',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  original_amount bigint;
  current_balance bigint;
  new_balance bigint;
  already_refunded boolean;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if p_request_id is null or length(trim(p_request_id)) < 8 or length(p_request_id) > 128 then
    raise exception 'Invalid request id';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  select exists(
    select 1 from public.credit_ledger
    where user_id = uid
      and entry_type = 'refund'
      and metadata->>'requestId' = p_request_id
  ) into already_refunded;

  if already_refunded then
    select balance into current_balance from public.credit_accounts where user_id = uid;
    return jsonb_build_object('refunded', false, 'balance', current_balance);
  end if;

  select -amount into original_amount
  from public.credit_ledger
  where user_id = uid
    and entry_type = 'consume'
    and metadata->>'requestId' = p_request_id
  order by created_at desc
  limit 1;

  if original_amount is null or original_amount <> p_amount then
    raise exception 'Original AI credit charge not found';
  end if;

  select balance into current_balance
  from public.credit_accounts
  where user_id = uid
  for update;

  if current_balance is null then
    raise exception 'Credit account not found';
  end if;

  new_balance := current_balance + p_amount;

  update public.credit_accounts
  set balance = new_balance, updated_at = now()
  where user_id = uid;

  insert into public.credit_ledger(user_id, entry_type, amount, balance_after, description, metadata)
  values (
    uid,
    'refund',
    p_amount,
    new_balance,
    p_description,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('requestId', p_request_id)
  );

  return jsonb_build_object('refunded', true, 'balance', new_balance);
end;
$$;

revoke all on function public.consume_ai_credits(bigint, text, text, jsonb) from public, anon;
revoke all on function public.refund_ai_credits(text, bigint, text, jsonb) from public, anon;
grant execute on function public.consume_ai_credits(bigint, text, text, jsonb) to authenticated;
grant execute on function public.refund_ai_credits(text, bigint, text, jsonb) to authenticated;
