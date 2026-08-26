-- Finance consistency patch.
alter table public.refund_requests add column if not exists amount numeric(18,2) check (amount is null or amount >= 0);
alter table public.refund_requests add column if not exists eligible_until timestamptz;
alter table public.withdrawals add column if not exists admin_note text;
alter table public.withdrawals add column if not exists reviewed_at timestamptz;
alter table public.withdrawals add column if not exists reviewed_by uuid references auth.users(id);
alter table public.refund_requests add column if not exists admin_note text;
alter table public.refund_requests add column if not exists reviewed_at timestamptz;
alter table public.refund_requests add column if not exists reviewed_by uuid references auth.users(id);

create or replace function public.request_subscription_refund(p_subscription_id uuid, p_reason text default null)
returns public.refund_requests language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); sub public.subscriptions; plan public.subscription_plans; refund public.refund_requests; window_days integer := 7; eligible_until timestamptz; refund_amount numeric(18,2);
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into sub from public.subscriptions where id = p_subscription_id and user_id = uid for update;
  if not found then raise exception 'Subscription not found'; end if;
  select * into plan from public.subscription_plans where id = sub.plan_id;
  if not found then raise exception 'Subscription plan not found'; end if;
  eligible_until := sub.created_at + make_interval(days => window_days);
  if now() > eligible_until then raise exception 'Refund window has expired'; end if;
  if exists (select 1 from public.refund_requests where subscription_id = p_subscription_id and status in ('pending','approved','processing')) then raise exception 'Refund already requested'; end if;
  refund_amount := plan.price_minor::numeric / 100;
  insert into public.refund_requests(user_id, subscription_id, amount, reason, eligible_until) values (uid, p_subscription_id, refund_amount, left(coalesce(p_reason, ''), 1000), eligible_until) returning * into refund;
  return refund;
end; $$;

grant execute on function public.request_subscription_refund(uuid, text) to authenticated;
revoke all on function public.request_subscription_refund(uuid, text) from public, anon;
revoke insert, update, delete on public.payout_accounts from authenticated;
