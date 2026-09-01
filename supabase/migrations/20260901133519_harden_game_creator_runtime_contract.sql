create table if not exists public.game_creation_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  status text not null default 'reserved' check (status in ('reserved','completed','released')),
  app_id uuid null references public.apps(id) on delete set null,
  reserved_at timestamptz not null default now(),
  completed_at timestamptz null,
  released_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint game_creation_reservations_request_id_check check (char_length(request_id) between 1 and 160 and request_id ~ '^[A-Za-z0-9._:-]+$'),
  constraint game_creation_reservations_user_request_unique unique (user_id, request_id)
);

create index if not exists game_creation_reservations_user_reserved_idx
  on public.game_creation_reservations(user_id, reserved_at desc)
  where status in ('reserved','completed');

alter table public.game_creation_reservations enable row level security;
revoke all on table public.game_creation_reservations from public, anon, authenticated;
grant select on table public.game_creation_reservations to service_role;

create or replace function public.server_reserve_game_creation(
  p_user_id uuid,
  p_request_id text,
  p_hourly_limit integer default 6
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := p_user_id;
  request_key text := btrim(coalesce(p_request_id,''));
  existing public.game_creation_reservations%rowtype;
  active_count integer := 0;
begin
  if uid is null then raise exception 'User id is required'; end if;
  if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
  if p_hourly_limit is null or p_hourly_limit<1 or p_hourly_limit>100 then raise exception 'Invalid hourly limit'; end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 77191));

  select * into existing
  from public.game_creation_reservations
  where user_id=uid and request_id=request_key
  for update;

  if found and existing.status='completed' then
    return jsonb_build_object('allowed',true,'replayed',true,'status','completed','app_id',existing.app_id,'reservation_id',existing.id);
  end if;

  if found and existing.status='reserved' and existing.reserved_at >= now()-interval '10 minutes' then
    return jsonb_build_object('allowed',false,'replayed',true,'status','reserved','reason','in_progress','reservation_id',existing.id);
  end if;

  if found and existing.status='reserved' then
    update public.game_creation_reservations
      set status='released',released_at=now(),updated_at=now()
      where id=existing.id;
    existing.status := 'released';
  end if;

  select count(*)::integer into active_count
  from public.game_creation_reservations
  where user_id=uid
    and request_id<>request_key
    and status in ('reserved','completed')
    and reserved_at>=now()-interval '1 hour';

  if active_count>=p_hourly_limit then
    return jsonb_build_object('allowed',false,'replayed',false,'status','limited','reason','hourly_limit','remaining',0);
  end if;

  if existing.id is null then
    insert into public.game_creation_reservations(user_id,request_id,status,reserved_at,updated_at)
    values(uid,request_key,'reserved',now(),now())
    returning * into existing;
  else
    update public.game_creation_reservations
      set status='reserved',app_id=null,reserved_at=now(),completed_at=null,released_at=null,updated_at=now()
      where id=existing.id
      returning * into existing;
  end if;

  return jsonb_build_object('allowed',true,'replayed',false,'status','reserved','reservation_id',existing.id,'remaining',greatest(0,p_hourly_limit-active_count-1));
end;
$$;

create or replace function public.server_finalize_game_creation(
  p_user_id uuid,
  p_request_id text,
  p_app_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := p_user_id;
  request_key text := btrim(coalesce(p_request_id,''));
  existing public.game_creation_reservations%rowtype;
begin
  if uid is null or p_app_id is null then raise exception 'User and app are required'; end if;
  if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
  if not exists(select 1 from public.apps a where a.id=p_app_id and a.owner_id=uid) then raise exception 'Owned app not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 77191));
  select * into existing from public.game_creation_reservations where user_id=uid and request_id=request_key for update;
  if not found then raise exception 'Game creation reservation not found'; end if;
  if existing.status='completed' then
    if existing.app_id is distinct from p_app_id then raise exception 'Reservation already bound to another app'; end if;
    return jsonb_build_object('completed',true,'replayed',true,'app_id',existing.app_id,'reservation_id',existing.id);
  end if;
  if existing.status<>'reserved' then raise exception 'Game creation reservation is not active'; end if;

  update public.game_creation_reservations
    set status='completed',app_id=p_app_id,completed_at=now(),released_at=null,updated_at=now()
    where id=existing.id;
  return jsonb_build_object('completed',true,'replayed',false,'app_id',p_app_id,'reservation_id',existing.id);
end;
$$;

create or replace function public.server_release_game_creation(
  p_user_id uuid,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := p_user_id;
  request_key text := btrim(coalesce(p_request_id,''));
  existing public.game_creation_reservations%rowtype;
begin
  if uid is null then raise exception 'User id is required'; end if;
  if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 77191));
  select * into existing from public.game_creation_reservations where user_id=uid and request_id=request_key for update;
  if not found then return jsonb_build_object('released',false,'reason','not_found'); end if;
  if existing.status='completed' then return jsonb_build_object('released',false,'reason','completed','app_id',existing.app_id); end if;
  if existing.status='released' then return jsonb_build_object('released',false,'replayed',true); end if;
  update public.game_creation_reservations set status='released',released_at=now(),updated_at=now() where id=existing.id;
  return jsonb_build_object('released',true,'replayed',false);
end;
$$;

revoke all on function public.server_reserve_game_creation(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.server_finalize_game_creation(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.server_release_game_creation(uuid,text) from public, anon, authenticated;
grant execute on function public.server_reserve_game_creation(uuid,text,integer) to service_role;
grant execute on function public.server_finalize_game_creation(uuid,text,uuid) to service_role;
grant execute on function public.server_release_game_creation(uuid,text) to service_role;