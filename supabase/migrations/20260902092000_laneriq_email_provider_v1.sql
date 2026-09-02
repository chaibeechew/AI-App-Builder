create schema if not exists private;

create table if not exists private.laneriq_email_messages (
  id text primary key,
  recipient_hash text not null,
  payload_ciphertext text not null,
  payload_iv text not null,
  payload_tag text not null,
  purpose text not null check (purpose in ('verification','transactional','automation')),
  status text not null default 'queued' check (status in ('queued','sending','sent','deferred','bounced','failed')),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 20),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  provider_receipt text,
  last_error_code text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table private.laneriq_email_messages enable row level security;
revoke all on schema private from public, anon, authenticated;
revoke all on private.laneriq_email_messages from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.laneriq_email_messages to service_role;

create index if not exists laneriq_email_messages_queue_idx
  on private.laneriq_email_messages (status, next_attempt_at, created_at)
  where status in ('queued','deferred');

create or replace function public.laneriq_enqueue_email(
  p_id text,
  p_recipient_hash text,
  p_payload_ciphertext text,
  p_payload_iv text,
  p_payload_tag text,
  p_purpose text,
  p_max_attempts integer default 5
)
returns table(message_id text, decision text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  insert into private.laneriq_email_messages(
    id, recipient_hash, payload_ciphertext, payload_iv, payload_tag,
    purpose, max_attempts
  ) values (
    p_id, p_recipient_hash, p_payload_ciphertext, p_payload_iv, p_payload_tag,
    p_purpose, greatest(1, least(20, coalesce(p_max_attempts, 5)))
  )
  on conflict (id) do nothing;

  return query
  select p_id,
    case when found then 'queued'::text else 'duplicate'::text end;
end;
$$;

create or replace function public.laneriq_claim_email(p_id text default null)
returns table(
  message_id text,
  payload_ciphertext text,
  payload_iv text,
  payload_tag text,
  purpose text,
  attempts integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_id text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  select m.id into selected_id
  from private.laneriq_email_messages m
  where (p_id is null or m.id = p_id)
    and m.status in ('queued','deferred')
    and m.next_attempt_at <= now()
    and m.attempts < m.max_attempts
  order by m.created_at
  for update skip locked
  limit 1;

  if selected_id is null then
    return;
  end if;

  update private.laneriq_email_messages m
  set status = 'sending',
      attempts = m.attempts + 1,
      claimed_at = now(),
      updated_at = now()
  where m.id = selected_id;

  return query
  select m.id, m.payload_ciphertext, m.payload_iv, m.payload_tag,
         m.purpose, m.attempts, m.max_attempts
  from private.laneriq_email_messages m
  where m.id = selected_id;
end;
$$;

create or replace function public.laneriq_finish_email(
  p_id text,
  p_status text,
  p_provider_receipt text default null,
  p_error_code text default null,
  p_retry_after_seconds integer default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_status not in ('sent','deferred','bounced','failed') then
    raise exception 'invalid email status';
  end if;

  update private.laneriq_email_messages m
  set status = p_status,
      provider_receipt = case when p_status = 'sent' then nullif(left(coalesce(p_provider_receipt,''), 300),'') else m.provider_receipt end,
      last_error_code = nullif(left(coalesce(p_error_code,''), 120),''),
      next_attempt_at = case
        when p_status = 'deferred' then now() + make_interval(secs => greatest(30, least(86400, coalesce(p_retry_after_seconds, 300))))
        else m.next_attempt_at
      end,
      sent_at = case when p_status = 'sent' then now() else m.sent_at end,
      updated_at = now()
  where m.id = p_id and m.status = 'sending';

  get diagnostics updated = row_count;
  return updated;
end;
$$;

revoke all on function public.laneriq_enqueue_email(text,text,text,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.laneriq_claim_email(text) from public, anon, authenticated;
revoke all on function public.laneriq_finish_email(text,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.laneriq_enqueue_email(text,text,text,text,text,text,integer) to service_role;
grant execute on function public.laneriq_claim_email(text) to service_role;
grant execute on function public.laneriq_finish_email(text,text,text,text,integer) to service_role;
