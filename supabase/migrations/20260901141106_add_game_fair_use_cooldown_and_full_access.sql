alter table public.app_builder_account_access
  add column if not exists game_access_plan text not null default 'professional',
  add column if not exists game_cooldown_level integer not null default 0,
  add column if not exists game_cooldown_until timestamptz null,
  add column if not exists game_last_limit_at timestamptz null;

alter table public.app_builder_account_access
  drop constraint if exists app_builder_account_access_game_access_plan_check,
  add constraint app_builder_account_access_game_access_plan_check check (game_access_plan in ('professional','full')),
  drop constraint if exists app_builder_account_access_game_cooldown_level_check,
  add constraint app_builder_account_access_game_cooldown_level_check check (game_cooldown_level between 0 and 5);

create or replace function public.server_set_game_access_plan(
  p_user_id uuid,
  p_plan text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  plan_value text := lower(btrim(coalesce(p_plan,'')));
begin
  if p_user_id is null then raise exception 'User id is required'; end if;
  if plan_value not in ('professional','full') then raise exception 'Invalid Game access plan'; end if;
  insert into public.app_builder_account_access(user_id,game_access_plan,game_cooldown_level,game_cooldown_until,game_last_limit_at,updated_at)
  values(p_user_id,plan_value,0,null,null,now())
  on conflict (user_id) do update set
    game_access_plan=excluded.game_access_plan,
    game_cooldown_level=case when excluded.game_access_plan='full' then 0 else public.app_builder_account_access.game_cooldown_level end,
    game_cooldown_until=case when excluded.game_access_plan='full' then null else public.app_builder_account_access.game_cooldown_until end,
    game_last_limit_at=case when excluded.game_access_plan='full' then null else public.app_builder_account_access.game_last_limit_at end,
    updated_at=now();
  return jsonb_build_object('updated',true,'game_access_plan',plan_value);
end;
$$;

create or replace function public.server_reserve_game_creation(
  p_user_id uuid,
  p_request_id text,
  p_hourly_limit integer default 8
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := p_user_id;
  request_key text := btrim(coalesce(p_request_id,''));
  existing public.game_creation_reservations%rowtype;
  access_row public.app_builder_account_access%rowtype;
  active_count integer := 0;
  next_level integer := 0;
  cooldown_minutes integer := 0;
  cooldown_end timestamptz;
begin
  if uid is null then raise exception 'User id is required'; end if;
  if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
  if p_hourly_limit is null or p_hourly_limit<1 or p_hourly_limit>100 then raise exception 'Invalid hourly limit'; end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 77191));
  insert into public.app_builder_account_access(user_id) values(uid) on conflict (user_id) do nothing;
  select * into access_row from public.app_builder_account_access where user_id=uid for update;

  if access_row.game_access_plan='professional'
     and access_row.game_last_limit_at is not null
     and access_row.game_last_limit_at < now()-interval '7 days' then
    update public.app_builder_account_access
      set game_cooldown_level=0,game_cooldown_until=null,game_last_limit_at=null,updated_at=now()
      where user_id=uid
      returning * into access_row;
  end if;

  if access_row.game_access_plan='professional'
     and access_row.game_cooldown_until is not null
     and access_row.game_cooldown_until>now() then
    return jsonb_build_object(
      'allowed',false,'replayed',false,'status','limited','reason','cooldown',
      'cooldown_level',access_row.game_cooldown_level,
      'cooldown_until',access_row.game_cooldown_until,
      'cooldown_seconds',greatest(1,ceil(extract(epoch from (access_row.game_cooldown_until-now())))::integer),
      'normal_features_available',true,
      'upgrade_plan','full','upgrade_price_usd',199
    );
  end if;

  select * into existing
  from public.game_creation_reservations
  where user_id=uid and request_id=request_key
  for update;

  if found and existing.status='completed' then
    return jsonb_build_object('allowed',true,'replayed',true,'status','completed','app_id',existing.app_id,'reservation_id',existing.id,'game_access_plan',access_row.game_access_plan);
  end if;

  if found and existing.status='reserved' and existing.reserved_at >= now()-interval '10 minutes' then
    return jsonb_build_object('allowed',false,'replayed',true,'status','reserved','reason','in_progress','reservation_id',existing.id,'game_access_plan',access_row.game_access_plan);
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

  if access_row.game_access_plan='professional' and active_count>=p_hourly_limit then
    next_level := least(5,greatest(0,coalesce(access_row.game_cooldown_level,0))+1);
    cooldown_minutes := case next_level when 1 then 30 when 2 then 60 when 3 then 120 when 4 then 240 else 480 end;
    cooldown_end := now()+make_interval(mins=>cooldown_minutes);
    update public.app_builder_account_access
      set game_cooldown_level=next_level,
          game_cooldown_until=cooldown_end,
          game_last_limit_at=now(),
          updated_at=now()
      where user_id=uid;
    return jsonb_build_object(
      'allowed',false,'replayed',false,'status','limited','reason','cooldown',
      'cooldown_level',next_level,'cooldown_minutes',cooldown_minutes,'cooldown_until',cooldown_end,
      'normal_features_available',true,'upgrade_plan','full','upgrade_price_usd',199
    );
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

  return jsonb_build_object(
    'allowed',true,'replayed',false,'status','reserved','reservation_id',existing.id,
    'game_access_plan',access_row.game_access_plan,
    'ordinary_cooldown_exempt',access_row.game_access_plan='full',
    'remaining',case when access_row.game_access_plan='full' then null else greatest(0,p_hourly_limit-active_count-1) end
  );
end;
$$;

revoke all on function public.server_set_game_access_plan(uuid,text) from public, anon, authenticated;
revoke all on function public.server_reserve_game_creation(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.server_set_game_access_plan(uuid,text) to service_role;
grant execute on function public.server_reserve_game_creation(uuid,text,integer) to service_role;