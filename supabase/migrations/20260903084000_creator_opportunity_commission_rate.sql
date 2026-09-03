-- Make Creator Opportunity's +5 percentage-point share operational in the commission ledger.
-- Normal qualifying app revenue remains 5%; an approved Creator Opportunity account is 10%.

create or replace function public.calculate_app_commission(p_revenue_event_id uuid)
returns public.app_commission_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.app_revenue_events;
  result public.app_commission_ledger;
  q_amount numeric(18,2);
  commission_rate numeric(8,6) := 0.05;
  opportunity_bonus numeric(5,2) := 0;
begin
  select * into r from public.app_revenue_events where id = p_revenue_event_id for update;
  if not found then raise exception 'Revenue event not found'; end if;

  select case
    when coalesce(aa.creator_opportunity_active,false) then coalesce(aa.creator_opportunity_bonus_share_percent,5)
    else 0
  end
  into opportunity_bonus
  from public.apps a
  left join public.app_builder_account_access aa on aa.user_id=a.owner_id
  where a.id=r.app_id;

  commission_rate := least(1::numeric, 0.05 + (coalesce(opportunity_bonus,0) / 100));
  q_amount := case when r.qualifying then r.gross_amount else 0 end;

  insert into public.app_commission_ledger(app_id,revenue_event_id,rate,qualifying_amount,commission_amount,currency)
  values (r.app_id,r.id,commission_rate,q_amount,round(q_amount*commission_rate,2),r.currency)
  on conflict (revenue_event_id) do update set
    rate=excluded.rate,
    qualifying_amount=excluded.qualifying_amount,
    commission_amount=excluded.commission_amount,
    currency=excluded.currency
  returning * into result;
  return result;
end;
$$;

revoke all on function public.calculate_app_commission(uuid) from public, anon, authenticated;
