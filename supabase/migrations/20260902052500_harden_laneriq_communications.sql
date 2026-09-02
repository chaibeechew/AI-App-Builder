create table if not exists public.communication_dispatches (
  id uuid primary key default gen_random_uuid(),
  scope_hash text not null,
  recipient_hash text not null,
  channel text not null,
  purpose text not null,
  idempotency_key text not null,
  status text not null default 'claimed',
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint communication_dispatches_channel_check check (channel in ('email','whatsapp')),
  constraint communication_dispatches_purpose_check check (purpose in ('verification','transactional','automation')),
  constraint communication_dispatches_status_check check (status in ('claimed','completed','failed','integration_required','skipped')),
  constraint communication_dispatches_scope_hash_check check (char_length(scope_hash) between 32 and 128),
  constraint communication_dispatches_recipient_hash_check check (char_length(recipient_hash) between 32 and 128),
  constraint communication_dispatches_idempotency_check check (char_length(idempotency_key) between 1 and 180)
);

create unique index if not exists communication_dispatches_scope_idempotency_uq
on public.communication_dispatches(scope_hash,idempotency_key);
create index if not exists communication_dispatches_rate_idx
on public.communication_dispatches(scope_hash,channel,purpose,created_at desc);
create index if not exists communication_dispatches_recipient_rate_idx
on public.communication_dispatches(recipient_hash,channel,purpose,created_at desc);

alter table public.communication_dispatches enable row level security;
revoke all on public.communication_dispatches from public,anon,authenticated;
grant select,insert,update on public.communication_dispatches to service_role;

create or replace function public.server_claim_communication_dispatch(
  p_scope_hash text,
  p_recipient_hash text,
  p_channel text,
  p_purpose text,
  p_idempotency_key text,
  p_hourly_limit integer,
  p_daily_limit integer,
  p_cooldown_seconds integer
)
returns table(dispatch_id uuid,decision text,retry_after_seconds integer,dispatch_status text)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_existing public.communication_dispatches%rowtype;
  v_last timestamptz;
  v_hourly integer;
  v_daily integer;
  v_recipient_hourly integer;
  v_recipient_daily integer;
  v_retry integer;
  v_id uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'service_role required'; end if;
  if p_channel not in ('email','whatsapp') or p_purpose not in ('verification','transactional','automation') then raise exception 'unsupported communication route'; end if;
  if p_hourly_limit < 1 or p_daily_limit < p_hourly_limit or p_cooldown_seconds < 0 then raise exception 'invalid communication limit'; end if;
  if char_length(coalesce(p_scope_hash,'')) not between 32 and 128 or char_length(coalesce(p_recipient_hash,'')) not between 32 and 128 then raise exception 'invalid communication hash'; end if;
  if char_length(coalesce(p_idempotency_key,'')) not between 1 and 180 then raise exception 'invalid communication idempotency key'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_scope_hash||':'||p_channel||':'||p_purpose||':'||p_recipient_hash,0));

  select * into v_existing from public.communication_dispatches
    where scope_hash=p_scope_hash and idempotency_key=p_idempotency_key limit 1;
  if found then
    return query select v_existing.id,'replay'::text,0,v_existing.status;
    return;
  end if;

  select max(created_at) into v_last from public.communication_dispatches
    where recipient_hash=p_recipient_hash and channel=p_channel and purpose=p_purpose
      and status in ('claimed','completed');
  if v_last is not null and extract(epoch from (now()-v_last)) < p_cooldown_seconds then
    v_retry:=greatest(1,p_cooldown_seconds-floor(extract(epoch from (now()-v_last)))::integer);
    return query select null::uuid,'cooldown'::text,v_retry,null::text;
    return;
  end if;

  select count(*)::integer into v_hourly from public.communication_dispatches
    where scope_hash=p_scope_hash and channel=p_channel and purpose=p_purpose
      and created_at>=now()-interval '1 hour' and status in ('claimed','completed');
  if v_hourly>=p_hourly_limit then
    return query select null::uuid,'hourly_limit'::text,3600,null::text;
    return;
  end if;

  select count(*)::integer into v_recipient_hourly from public.communication_dispatches
    where recipient_hash=p_recipient_hash and channel=p_channel and purpose=p_purpose
      and created_at>=now()-interval '1 hour' and status in ('claimed','completed');
  if v_recipient_hourly>=p_hourly_limit then
    return query select null::uuid,'recipient_hourly_limit'::text,3600,null::text;
    return;
  end if;

  select count(*)::integer into v_daily from public.communication_dispatches
    where scope_hash=p_scope_hash and channel=p_channel and purpose=p_purpose
      and created_at>=now()-interval '24 hours' and status in ('claimed','completed');
  if v_daily>=p_daily_limit then
    return query select null::uuid,'daily_limit'::text,86400,null::text;
    return;
  end if;

  select count(*)::integer into v_recipient_daily from public.communication_dispatches
    where recipient_hash=p_recipient_hash and channel=p_channel and purpose=p_purpose
      and created_at>=now()-interval '24 hours' and status in ('claimed','completed');
  if v_recipient_daily>=p_daily_limit then
    return query select null::uuid,'recipient_daily_limit'::text,86400,null::text;
    return;
  end if;

  insert into public.communication_dispatches(scope_hash,recipient_hash,channel,purpose,idempotency_key,status)
  values(p_scope_hash,p_recipient_hash,p_channel,p_purpose,p_idempotency_key,'claimed')
  returning id into v_id;
  return query select v_id,'claimed'::text,0,'claimed'::text;
end;
$$;

create or replace function public.server_finish_communication_dispatch(
  p_dispatch_id text,
  p_status text,
  p_provider_message_id text default null,
  p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'service_role required'; end if;
  if p_status not in ('completed','failed','integration_required','skipped') then raise exception 'invalid dispatch completion status'; end if;
  update public.communication_dispatches
    set status=p_status,
        provider_message_id=left(p_provider_message_id,300),
        error_code=left(p_error_code,120),
        completed_at=now()
  where id=p_dispatch_id::uuid and status='claimed';
end;
$$;

revoke all on function public.server_claim_communication_dispatch(text,text,text,text,text,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.server_finish_communication_dispatch(text,text,text,text) from public,anon,authenticated;
grant execute on function public.server_claim_communication_dispatch(text,text,text,text,text,integer,integer,integer) to service_role;
grant execute on function public.server_finish_communication_dispatch(text,text,text,text) to service_role;
