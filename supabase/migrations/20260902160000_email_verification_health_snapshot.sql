create or replace function public.laneriq_email_verification_health()
returns table(
  status text,
  last_error_code text,
  attempts integer,
  max_attempts integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  return query
  select
    m.status,
    m.last_error_code,
    m.attempts,
    m.max_attempts,
    m.updated_at
  from private.laneriq_email_messages m
  where m.purpose = 'verification'
  order by m.created_at desc
  limit 1;
end;
$$;

revoke all on function public.laneriq_email_verification_health() from public, anon, authenticated;
grant execute on function public.laneriq_email_verification_health() to service_role;
