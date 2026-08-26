-- Admin finance controls: all money-moving actions happen through SECURITY DEFINER functions.
-- Client/admin UI must never write balances or final payment states directly.

create table if not exists public.finance_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.finance_audit_log enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.admin_review_withdrawal(p_withdrawal_id uuid, p_action text, p_note text default null)
returns public.withdrawals
language plpgsql security definer
set search_path = ''
as $$
declare
  w public.withdrawals; result public.withdrawals; new_status text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_action not in ('approve','reject') then raise exception 'Invalid withdrawal action'; end if;
  select * into w from public.withdrawals where id = p_withdrawal_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  if w.status <> 'pending' then raise exception 'Withdrawal is not pending'; end if;
  new_status := case when p_action = 'approve' then 'approved' else 'rejected' end;
  update public.withdrawals set status = new_status, admin_note = p_note, reviewed_at = now(), reviewed_by = auth.uid() where id = w.id returning * into result;
  if new_status = 'rejected' then
    update public.cash_accounts set available_amount = available_amount + w.amount, reserved_amount = greatest(0, reserved_amount - w.amount), updated_at = now() where user_id = w.user_id;
    insert into public.cash_ledger(user_id, entry_type, amount, balance_after, reference_id, description)
      select w.user_id, 'withdrawal_release', w.amount, available_amount, w.id, 'Withdrawal rejected; reserved funds released' from public.cash_accounts where user_id = w.user_id;
  end if;
  insert into public.finance_audit_log(admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'withdrawal_' || p_action, 'withdrawal', w.id, jsonb_build_object('note', p_note));
  return result;
end;
$$;

grant execute on function public.admin_review_withdrawal(uuid, text, text) to authenticated;

create or replace function public.admin_review_refund(p_refund_id uuid, p_action text, p_note text default null)
returns public.refund_requests
language plpgsql security definer
set search_path = ''
as $$
declare r public.refund_requests; result public.refund_requests; new_status text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_action not in ('approve','reject') then raise exception 'Invalid refund action'; end if;
  select * into r from public.refund_requests where id = p_refund_id for update;
  if not found then raise exception 'Refund request not found'; end if;
  if r.status <> 'pending' then raise exception 'Refund request is not pending'; end if;
  new_status := case when p_action = 'approve' then 'approved' else 'rejected' end;
  update public.refund_requests set status = new_status, admin_note = p_note, reviewed_at = now(), reviewed_by = auth.uid() where id = r.id returning * into result;
  insert into public.finance_audit_log(admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'refund_' || p_action, 'refund_request', r.id, jsonb_build_object('note', p_note));
  return result;
end;
$$;

grant execute on function public.admin_review_refund(uuid, text, text) to authenticated;

create or replace function public.admin_finance_queue()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare out jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'withdrawals', coalesce((select jsonb_agg(to_jsonb(w) order by w.requested_at asc) from public.withdrawals w where w.status = 'pending'), '[]'::jsonb),
    'refunds', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at asc) from public.refund_requests r where r.status = 'pending'), '[]'::jsonb)
  ) into out;
  return out;
end;
$$;

grant execute on function public.admin_finance_queue() to authenticated;
revoke all on public.finance_audit_log from anon, authenticated;
