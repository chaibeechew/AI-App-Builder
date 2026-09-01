create table if not exists public.multiplayer_session_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id uuid not null references public.apps(id) on delete cascade,
  request_id text not null,
  status text not null default 'reserved' check (status in ('reserved','searching','matched','cancelled','failed')),
  provider_ticket_id text null,
  match_id text null,
  region text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint multiplayer_session_requests_request_id_check check (char_length(request_id) between 1 and 160 and request_id ~ '^[A-Za-z0-9._:-]+$'),
  constraint multiplayer_session_requests_provider_ticket_check check (provider_ticket_id is null or char_length(provider_ticket_id) between 1 and 240),
  constraint multiplayer_session_requests_match_id_check check (match_id is null or char_length(match_id) between 1 and 240),
  constraint multiplayer_session_requests_region_check check (region is null or char_length(region) between 1 and 64),
  constraint multiplayer_session_requests_user_request_unique unique(user_id,request_id)
);

create index if not exists multiplayer_session_requests_app_user_idx on public.multiplayer_session_requests(app_id,user_id,updated_at desc);
alter table public.multiplayer_session_requests enable row level security;
revoke all on table public.multiplayer_session_requests from public,anon,authenticated;
grant select,insert,update,delete on table public.multiplayer_session_requests to service_role;

create or replace function public.server_reserve_multiplayer_session(p_user_id uuid,p_app_id uuid,p_request_id text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=p_user_id; request_key text:=btrim(coalesce(p_request_id,'')); existing public.multiplayer_session_requests%rowtype;
begin
 if uid is null or p_app_id is null then raise exception 'User and app are required'; end if;
 if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
 if not exists(select 1 from public.apps a where a.id=p_app_id and a.owner_id=uid) then raise exception 'Owned app not found'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_app_id::text,88423));
 select * into existing from public.multiplayer_session_requests where user_id=uid and request_id=request_key for update;
 if found then
  if existing.app_id<>p_app_id then raise exception 'Request id already belongs to another app'; end if;
  return jsonb_build_object('reserved',false,'replayed',true,'status',existing.status,'id',existing.id,'provider_ticket_id',existing.provider_ticket_id,'match_id',existing.match_id,'region',existing.region);
 end if;
 insert into public.multiplayer_session_requests(user_id,app_id,request_id,status) values(uid,p_app_id,request_key,'reserved') returning * into existing;
 return jsonb_build_object('reserved',true,'replayed',false,'status','reserved','id',existing.id);
end;$$;

create or replace function public.server_update_multiplayer_session(p_user_id uuid,p_app_id uuid,p_request_id text,p_status text,p_provider_ticket_id text default null,p_match_id text default null,p_region text default null) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=p_user_id; request_key text:=btrim(coalesce(p_request_id,'')); clean_status text:=lower(btrim(coalesce(p_status,''))); existing public.multiplayer_session_requests%rowtype;
begin
 if uid is null or p_app_id is null then raise exception 'User and app are required'; end if;
 if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
 if clean_status not in ('searching','matched','cancelled','failed') then raise exception 'Invalid multiplayer session status'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_app_id::text,88423));
 select * into existing from public.multiplayer_session_requests where user_id=uid and app_id=p_app_id and request_id=request_key for update;
 if not found then raise exception 'Multiplayer session reservation not found'; end if;
 if existing.status in ('cancelled','failed') and clean_status not in ('cancelled','failed') then raise exception 'Terminal multiplayer session cannot be reopened'; end if;
 update public.multiplayer_session_requests set status=clean_status,
  provider_ticket_id=coalesce(nullif(btrim(coalesce(p_provider_ticket_id,'')),''),provider_ticket_id),
  match_id=coalesce(nullif(btrim(coalesce(p_match_id,'')),''),match_id),
  region=coalesce(nullif(btrim(coalesce(p_region,'')),''),region),updated_at=now()
 where id=existing.id returning * into existing;
 return jsonb_build_object('updated',true,'status',existing.status,'id',existing.id,'provider_ticket_id',existing.provider_ticket_id,'match_id',existing.match_id,'region',existing.region);
end;$$;

revoke all on function public.server_reserve_multiplayer_session(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.server_update_multiplayer_session(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.server_reserve_multiplayer_session(uuid,uuid,text) to service_role;
grant execute on function public.server_update_multiplayer_session(uuid,uuid,text,text,text,text,text) to service_role;