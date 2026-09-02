create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.laneriq_sessions (
  id uuid primary key,
  token_hash text not null unique,
  user_id uuid not null,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists laneriq_sessions_user_created_idx
  on private.laneriq_sessions (user_id, created_at desc);
create index if not exists laneriq_sessions_expiry_idx
  on private.laneriq_sessions (expires_at)
  where status = 'active';

alter table private.laneriq_sessions enable row level security;
revoke all on table private.laneriq_sessions from public, anon, authenticated;
grant all on table private.laneriq_sessions to service_role;

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
  if coalesce(length(p_token_hash),0) <> 64 then
    raise exception 'invalid session token hash';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'invalid session expiry';
  end if;

  -- Keep a bounded number of active browser sessions per identity.
  update private.laneriq_sessions as old_session
     set status = 'revoked', revoked_at = now()
   where old_session.user_id = p_user_id
     and old_session.status = 'active'
     and old_session.id in (
       select s.id
         from private.laneriq_sessions as s
        where s.user_id = p_user_id
          and s.status = 'active'
        order by s.created_at desc
        offset 9
     );

  insert into private.laneriq_sessions(id, token_hash, user_id, expires_at)
  values (p_id, p_token_hash, p_user_id, p_expires_at);

  return query
  select s.id, s.user_id, s.expires_at
    from private.laneriq_sessions as s
   where s.id = p_id;
end;
$$;

create or replace function public.laneriq_validate_session(p_token_hash text)
returns table(session_id uuid, user_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(length(p_token_hash),0) <> 64 then
    return;
  end if;

  update private.laneriq_sessions as expired_session
     set status = 'expired'
   where expired_session.token_hash = p_token_hash
     and expired_session.status = 'active'
     and expired_session.expires_at <= now();

  return query
  select s.id, s.user_id, s.expires_at
    from private.laneriq_sessions as s
   where s.token_hash = p_token_hash
     and s.status = 'active'
     and s.revoked_at is null
     and s.expires_at > now()
   limit 1;
end;
$$;

create or replace function public.laneriq_revoke_session(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if coalesce(length(p_token_hash),0) <> 64 then
    return false;
  end if;
  update private.laneriq_sessions as s
     set status = 'revoked', revoked_at = now()
   where s.token_hash = p_token_hash
     and s.status = 'active';
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;

revoke all on function public.laneriq_create_session(uuid,text,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.laneriq_validate_session(text) from public, anon, authenticated;
revoke all on function public.laneriq_revoke_session(text) from public, anon, authenticated;
grant execute on function public.laneriq_create_session(uuid,text,uuid,timestamptz) to service_role;
grant execute on function public.laneriq_validate_session(text) to service_role;
grant execute on function public.laneriq_revoke_session(text) to service_role;
