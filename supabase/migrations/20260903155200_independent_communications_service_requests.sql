create table if not exists public.communication_service_requests (
  id uuid primary key default gen_random_uuid(),
  client_hash text not null,
  nonce_hash text not null,
  idempotency_hash text not null,
  body_hash text not null,
  status text not null default 'claimed',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  constraint communication_service_requests_status_check check (status in ('claimed','completed','failed')),
  constraint communication_service_requests_client_hash_check check (char_length(client_hash) between 32 and 128),
  constraint communication_service_requests_nonce_hash_check check (char_length(nonce_hash) between 32 and 128),
  constraint communication_service_requests_idempotency_hash_check check (char_length(idempotency_hash) between 32 and 128),
  constraint communication_service_requests_body_hash_check check (char_length(body_hash) between 32 and 128)
);

create unique index if not exists communication_service_requests_nonce_uq
  on public.communication_service_requests(client_hash,nonce_hash);
create unique index if not exists communication_service_requests_idempotency_uq
  on public.communication_service_requests(client_hash,idempotency_hash);
create index if not exists communication_service_requests_expiry_idx
  on public.communication_service_requests(expires_at);

alter table public.communication_service_requests enable row level security;
revoke all on public.communication_service_requests from public,anon,authenticated;
grant select,insert,update,delete on public.communication_service_requests to service_role;

create or replace function public.server_claim_communication_service_request(
  p_client_hash text,
  p_nonce_hash text,
  p_idempotency_hash text,
  p_body_hash text,
  p_expires_at timestamptz
)
returns table(request_id uuid,decision text)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_existing public.communication_service_requests%rowtype;
  v_id uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'service_role required'; end if;
  if char_length(coalesce(p_client_hash,'')) not between 32 and 128
     or char_length(coalesce(p_nonce_hash,'')) not between 32 and 128
     or char_length(coalesce(p_idempotency_hash,'')) not between 32 and 128
     or char_length(coalesce(p_body_hash,'')) not between 32 and 128 then
    raise exception 'invalid service request hash';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '15 minutes' then
    raise exception 'invalid service request expiry';
  end if;

  delete from public.communication_service_requests where expires_at < now() - interval '1 hour';
  perform pg_advisory_xact_lock(hashtextextended(p_client_hash,0));

  select * into v_existing from public.communication_service_requests
    where client_hash=p_client_hash and nonce_hash=p_nonce_hash limit 1;
  if found then
    return query select v_existing.id,'replay_nonce'::text;
    return;
  end if;

  select * into v_existing from public.communication_service_requests
    where client_hash=p_client_hash and idempotency_hash=p_idempotency_hash limit 1;
  if found then
    if v_existing.body_hash <> p_body_hash then
      return query select v_existing.id,'idempotency_conflict'::text;
    else
      return query select v_existing.id,'idempotent_replay'::text;
    end if;
    return;
  end if;

  insert into public.communication_service_requests(client_hash,nonce_hash,idempotency_hash,body_hash,status,expires_at)
  values(p_client_hash,p_nonce_hash,p_idempotency_hash,p_body_hash,'claimed',p_expires_at)
  returning id into v_id;

  return query select v_id,'claimed'::text;
end;
$$;

create or replace function public.server_finish_communication_service_request(
  p_request_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'service_role required'; end if;
  if p_status not in ('completed','failed') then raise exception 'invalid service request completion status'; end if;
  update public.communication_service_requests
    set status=p_status,completed_at=now()
    where id=p_request_id::uuid and status='claimed';
end;
$$;

revoke all on function public.server_claim_communication_service_request(text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.server_finish_communication_service_request(text,text) from public,anon,authenticated;
grant execute on function public.server_claim_communication_service_request(text,text,text,text,timestamptz) to service_role;
grant execute on function public.server_finish_communication_service_request(text,text) to service_role;
