-- LANERIQ AI Privacy-First Analytics
-- Product analytics stores anonymous aggregate counters only.
-- No session IDs, user IDs, IP addresses, device IDs, referrers, page paths or arbitrary metadata are accepted.

create table if not exists public.analytics_daily_aggregates (
  app_id uuid not null references public.apps(id) on delete cascade,
  event_day date not null,
  event_name text not null check (event_name in (
    'app_view','website_view','game_view','page_view','cta_click','share',
    'install_prompt','record_saved','workflow_started','workflow_completed'
  )),
  channel text not null check (channel in ('app','website','game')),
  event_count bigint not null default 0 check (event_count >= 0),
  primary key (app_id,event_day,event_name,channel)
);

comment on table public.analytics_daily_aggregates is
  'LANERIQ AI anonymous aggregate analytics only: project + UTC day + event type + channel + count.';
comment on column public.analytics_daily_aggregates.app_id is 'Project identifier; not a visitor identifier.';
comment on column public.analytics_daily_aggregates.event_day is 'UTC calendar day only; no per-visitor timestamp is stored.';
comment on column public.analytics_daily_aggregates.event_name is 'Bounded aggregate product event category.';
comment on column public.analytics_daily_aggregates.channel is 'App, Website or Game aggregate channel.';
comment on column public.analytics_daily_aggregates.event_count is 'Anonymous aggregate count.';

alter table public.analytics_daily_aggregates enable row level security;

revoke all on table public.analytics_daily_aggregates from public, anon, authenticated;
grant select on table public.analytics_daily_aggregates to authenticated;
grant select, insert, update, delete on table public.analytics_daily_aggregates to service_role;

drop policy if exists analytics_daily_owner_select on public.analytics_daily_aggregates;
create policy analytics_daily_owner_select
on public.analytics_daily_aggregates
for select
to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.apps
    where public.apps.id = public.analytics_daily_aggregates.app_id
      and public.apps.owner_id = (select auth.uid())
  )
);

create or replace function public.server_record_anonymous_analytics_event(
  p_app_id uuid,
  p_event_name text,
  p_channel text
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_count bigint;
begin
  if p_app_id is null then
    raise exception 'app id is required' using errcode = '22023';
  end if;

  if p_event_name not in (
    'app_view','website_view','game_view','page_view','cta_click','share',
    'install_prompt','record_saved','workflow_started','workflow_completed'
  ) then
    raise exception 'unsupported analytics event' using errcode = '22023';
  end if;

  if p_channel not in ('app','website','game') then
    raise exception 'unsupported analytics channel' using errcode = '22023';
  end if;

  if not exists (select 1 from public.apps where public.apps.id = p_app_id) then
    return 0;
  end if;

  insert into public.analytics_daily_aggregates(app_id,event_day,event_name,channel,event_count)
  values (p_app_id,(timezone('UTC',now()))::date,p_event_name,p_channel,1)
  on conflict (app_id,event_day,event_name,channel)
  do update set event_count = public.analytics_daily_aggregates.event_count + 1
  returning event_count into next_count;

  return next_count;
end;
$$;

revoke execute on function public.server_record_anonymous_analytics_event(uuid,text,text) from public, anon, authenticated;
grant execute on function public.server_record_anonymous_analytics_event(uuid,text,text) to service_role;

-- Retire the legacy event-level store before real customer analytics data exists.
-- The table remains temporarily for migration compatibility, but no API role can read or write it.
truncate table public.analytics_events;
alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from public, anon, authenticated, service_role;
comment on table public.analytics_events is
  'LEGACY DISABLED: event-level analytics is prohibited by LANERIQ AI privacy policy. Use analytics_daily_aggregates only.';
