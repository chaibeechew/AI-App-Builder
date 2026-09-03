alter table public.multiplayer_session_requests
  add column if not exists provider_claim_token uuid,
  add column if not exists provider_claimed_at timestamptz;

create index if not exists multiplayer_session_provider_claim_idx
  on public.multiplayer_session_requests(user_id, app_id, provider_claimed_at desc)
  where provider_claim_token is not null;

create or replace function public.server_claim_multiplayer_provider_v2(
  p_user_id uuid,
  p_app_id uuid,
  p_request_id text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  uid uuid:=p_user_id;
  request_key text:=btrim(coalesce(p_request_id,''));
  existing public.multiplayer_session_requests%rowtype;
  claim uuid;
begin
  if uid is null or p_app_id is null then raise exception 'User and app are required'; end if;
  if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_app_id::text,88424));
  select * into existing from public.multiplayer_session_requests
    where user_id=uid and app_id=p_app_id and request_id=request_key for update;
  if not found then raise exception 'Multiplayer session reservation not found'; end if;
  if existing.provider_ticket_id is not null or existing.status in ('matched','cancelled','failed') then
    return jsonb_build_object('claimed',false,'replayed',true,'status',existing.status,'provider_ticket_id',existing.provider_ticket_id,'match_id',existing.match_id,'region',existing.region);
  end if;
  if existing.provider_claim_token is not null and existing.provider_claimed_at is not null and existing.provider_claimed_at > now()-interval '90 seconds' then
    return jsonb_build_object('claimed',false,'in_progress',true,'status',existing.status,'retry_after_ms',2000);
  end if;
  claim:=gen_random_uuid();
  update public.multiplayer_session_requests set provider_claim_token=claim,provider_claimed_at=now(),updated_at=now()
    where id=existing.id;
  return jsonb_build_object('claimed',true,'reclaimed',existing.provider_claim_token is not null,'claim_token',claim,'status',existing.status);
end;$$;

create or replace function public.server_finalize_multiplayer_provider_v2(
  p_user_id uuid,
  p_app_id uuid,
  p_request_id text,
  p_claim_token uuid,
  p_status text,
  p_provider_ticket_id text default null,
  p_match_id text default null,
  p_region text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  uid uuid:=p_user_id;
  request_key text:=btrim(coalesce(p_request_id,''));
  clean_status text:=lower(btrim(coalesce(p_status,'')));
  existing public.multiplayer_session_requests%rowtype;
begin
  if uid is null or p_app_id is null or p_claim_token is null then raise exception 'User, app and claim are required'; end if;
  if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
  if clean_status not in ('searching','matched','failed') then raise exception 'Invalid multiplayer provider status'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_app_id::text,88424));
  select * into existing from public.multiplayer_session_requests
    where user_id=uid and app_id=p_app_id and request_id=request_key for update;
  if not found then raise exception 'Multiplayer session reservation not found'; end if;
  if existing.provider_claim_token is distinct from p_claim_token then raise exception 'Multiplayer provider claim changed'; end if;
  if clean_status in ('searching','matched') and nullif(btrim(coalesce(p_provider_ticket_id,'')),'') is null then raise exception 'Provider ticket is required'; end if;
  update public.multiplayer_session_requests set
    status=clean_status,
    provider_ticket_id=coalesce(nullif(btrim(coalesce(p_provider_ticket_id,'')),''),provider_ticket_id),
    match_id=coalesce(nullif(btrim(coalesce(p_match_id,'')),''),match_id),
    region=coalesce(nullif(btrim(coalesce(p_region,'')),''),region),
    provider_claim_token=null,
    updated_at=now()
  where id=existing.id returning * into existing;
  return jsonb_build_object('updated',true,'status',existing.status,'provider_ticket_id',existing.provider_ticket_id,'match_id',existing.match_id,'region',existing.region);
end;$$;

revoke all on function public.server_claim_multiplayer_provider_v2(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.server_finalize_multiplayer_provider_v2(uuid,uuid,text,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.server_claim_multiplayer_provider_v2(uuid,uuid,text) to service_role;
grant execute on function public.server_finalize_multiplayer_provider_v2(uuid,uuid,text,uuid,text,text,text,text) to service_role;
