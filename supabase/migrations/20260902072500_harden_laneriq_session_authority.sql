do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='laneriq_sessions_token_hash_shape_chk'
  ) then
    alter table private.laneriq_sessions
      add constraint laneriq_sessions_token_hash_shape_chk
      check (token_hash ~ '^[0-9a-f]{64}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname='laneriq_sessions_time_order_chk'
  ) then
    alter table private.laneriq_sessions
      add constraint laneriq_sessions_time_order_chk
      check (expires_at > created_at and expires_at <= created_at + interval '30 days');
  end if;

  if not exists (
    select 1 from pg_constraint where conname='laneriq_sessions_state_chk'
  ) then
    alter table private.laneriq_sessions
      add constraint laneriq_sessions_state_chk
      check (
        (status='active' and revoked_at is null)
        or (status='revoked' and revoked_at is not null)
        or (status='expired' and revoked_at is null)
      );
  end if;
end
$$;

create or replace function public.laneriq_create_session(
  p_id uuid,
  p_token_hash text,
  p_user_id uuid,
  p_expires_at timestamptz
)
returns table(session_id uuid, user_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(length(p_token_hash),0) <> 64 or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid session token hash';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'invalid session expiry';
  end if;

  -- Serialize per identity so concurrent sign-ins cannot exceed the active-session cap.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));

  update private.laneriq_sessions as expired_session
     set status='expired'
   where expired_session.user_id=p_user_id
     and expired_session.status='active'
     and expired_session.expires_at <= now();

  update private.laneriq_sessions as old_session
     set status='revoked', revoked_at=now()
   where old_session.user_id=p_user_id
     and old_session.status='active'
     and old_session.id in (
       select s.id
         from private.laneriq_sessions as s
        where s.user_id=p_user_id
          and s.status='active'
        order by s.created_at desc
        offset 9
     );

  insert into private.laneriq_sessions(id,token_hash,user_id,expires_at)
  values(p_id,p_token_hash,p_user_id,p_expires_at);

  -- Bound stale per-user session history without touching active records.
  delete from private.laneriq_sessions as stale
   where stale.user_id=p_user_id
     and stale.status in ('revoked','expired')
     and stale.created_at < now() - interval '30 days';

  return query
  select s.id,s.user_id,s.expires_at
    from private.laneriq_sessions as s
   where s.id=p_id;
end;
$$;

revoke all on function public.laneriq_create_session(uuid,text,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.laneriq_create_session(uuid,text,uuid,timestamptz) to service_role;
