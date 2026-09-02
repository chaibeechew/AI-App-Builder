create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.laneriq_verification_challenges (
  id text primary key,
  channel text not null check (channel in ('email','whatsapp')),
  recipient_hash text not null,
  code_hash text not null,
  referral_code text,
  status text not null default 'pending' check (status in ('pending','delivered','verified','expired','locked','superseded','delivery_failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  last_attempt_at timestamptz
);

create index if not exists laneriq_verification_recipient_created_idx
  on private.laneriq_verification_challenges (recipient_hash, created_at desc);
create index if not exists laneriq_verification_expiry_idx
  on private.laneriq_verification_challenges (expires_at)
  where consumed_at is null;

alter table private.laneriq_verification_challenges enable row level security;
revoke all on table private.laneriq_verification_challenges from public, anon, authenticated;
grant all on table private.laneriq_verification_challenges to service_role;

create or replace function public.laneriq_create_verification_challenge(
  p_id text,
  p_channel text,
  p_recipient_hash text,
  p_code_hash text,
  p_referral_code text,
  p_expires_at timestamptz,
  p_max_attempts integer
)
returns table(challenge_id text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_channel not in ('email','whatsapp') then
    raise exception 'unsupported verification channel';
  end if;
  if coalesce(length(p_id),0) < 24 or coalesce(length(p_recipient_hash),0) < 32 or coalesce(length(p_code_hash),0) < 32 then
    raise exception 'invalid verification challenge';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 minutes' then
    raise exception 'invalid verification expiry';
  end if;
  if p_max_attempts < 1 or p_max_attempts > 10 then
    raise exception 'invalid verification attempt limit';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_recipient_hash, 0));

  update private.laneriq_verification_challenges as existing
     set status = 'superseded'
   where existing.recipient_hash = p_recipient_hash
     and existing.channel = p_channel
     and existing.consumed_at is null
     and existing.status in ('pending','delivered')
     and existing.expires_at > now();

  insert into private.laneriq_verification_challenges(
    id, channel, recipient_hash, code_hash, referral_code, status, max_attempts, expires_at
  ) values (
    p_id, p_channel, p_recipient_hash, p_code_hash, nullif(left(coalesce(p_referral_code,''),64),''), 'pending', p_max_attempts, p_expires_at
  )
  on conflict (id) do nothing;

  return query
  select created.id, created.expires_at
    from private.laneriq_verification_challenges as created
   where created.id = p_id;
end;
$$;

create or replace function public.laneriq_mark_verification_delivery(
  p_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('delivered','delivery_failed') then
    raise exception 'invalid delivery status';
  end if;
  update private.laneriq_verification_challenges
     set status = p_status
   where id = p_id
     and consumed_at is null
     and status in ('pending','delivered');
end;
$$;

create or replace function public.laneriq_consume_verification_challenge(
  p_id text,
  p_recipient_hash text,
  p_code_hash text
)
returns table(decision text, referral_code text, attempts integer, max_attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c private.laneriq_verification_challenges%rowtype;
begin
  select challenge.* into c
    from private.laneriq_verification_challenges as challenge
   where challenge.id = p_id
   for update;

  if not found or c.recipient_hash <> p_recipient_hash or c.channel <> 'email' then
    return query select 'invalid'::text, null::text, 0, 0;
    return;
  end if;

  if c.consumed_at is not null or c.status = 'verified' then
    return query select 'consumed'::text, c.referral_code, c.attempts, c.max_attempts;
    return;
  end if;

  if c.status = 'superseded' then
    return query select 'superseded'::text, c.referral_code, c.attempts, c.max_attempts;
    return;
  end if;

  if c.status = 'delivery_failed' then
    return query select 'delivery_failed'::text, c.referral_code, c.attempts, c.max_attempts;
    return;
  end if;

  if c.expires_at <= now() then
    update private.laneriq_verification_challenges as challenge
       set status='expired'
     where challenge.id=p_id;
    return query select 'expired'::text, c.referral_code, c.attempts, c.max_attempts;
    return;
  end if;

  if c.attempts >= c.max_attempts then
    update private.laneriq_verification_challenges as challenge
       set status='locked'
     where challenge.id=p_id;
    return query select 'locked'::text, c.referral_code, c.attempts, c.max_attempts;
    return;
  end if;

  if c.code_hash <> p_code_hash then
    update private.laneriq_verification_challenges as challenge
       set attempts = challenge.attempts + 1,
           last_attempt_at = now(),
           status = case when challenge.attempts + 1 >= challenge.max_attempts then 'locked' else challenge.status end
     where challenge.id = p_id;
    return query
    select case when c.attempts + 1 >= c.max_attempts then 'locked' else 'invalid' end::text,
           c.referral_code,
           c.attempts + 1,
           c.max_attempts;
    return;
  end if;

  update private.laneriq_verification_challenges as challenge
     set attempts = challenge.attempts + 1,
         last_attempt_at = now(),
         consumed_at = now(),
         status = 'verified'
   where challenge.id = p_id;

  return query select 'verified'::text, c.referral_code, c.attempts + 1, c.max_attempts;
end;
$$;

revoke all on function public.laneriq_create_verification_challenge(text,text,text,text,text,timestamptz,integer) from public, anon, authenticated;
revoke all on function public.laneriq_mark_verification_delivery(text,text) from public, anon, authenticated;
revoke all on function public.laneriq_consume_verification_challenge(text,text,text) from public, anon, authenticated;
grant execute on function public.laneriq_create_verification_challenge(text,text,text,text,text,timestamptz,integer) to service_role;
grant execute on function public.laneriq_mark_verification_delivery(text,text) to service_role;
grant execute on function public.laneriq_consume_verification_challenge(text,text,text) to service_role;
