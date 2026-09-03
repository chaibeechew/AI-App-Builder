-- LANERIQ AI in-app notifications: zero-cost first-party delivery channel.
create table if not exists public.laneriq_in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 4000),
  href text null check (href is null or char_length(href) <= 1000),
  purpose text not null default 'transactional' check (char_length(purpose) between 1 and 40),
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists laneriq_in_app_notifications_user_created_idx
  on public.laneriq_in_app_notifications(user_id, created_at desc);

alter table public.laneriq_in_app_notifications enable row level security;

revoke all on public.laneriq_in_app_notifications from public, anon;
grant select, update on public.laneriq_in_app_notifications to authenticated;
grant all on public.laneriq_in_app_notifications to service_role;

drop policy if exists laneriq_in_app_notifications_select_own on public.laneriq_in_app_notifications;
create policy laneriq_in_app_notifications_select_own
  on public.laneriq_in_app_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists laneriq_in_app_notifications_update_own on public.laneriq_in_app_notifications;
create policy laneriq_in_app_notifications_update_own
  on public.laneriq_in_app_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.server_create_in_app_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_href text default null,
  p_purpose text default 'transactional',
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_user_id is null then raise exception 'user_id_required'; end if;
  if p_title is null or char_length(trim(p_title)) < 1 or char_length(p_title) > 180 then raise exception 'invalid_title'; end if;
  if p_body is null or char_length(trim(p_body)) < 1 or char_length(p_body) > 4000 then raise exception 'invalid_body'; end if;
  if p_href is not null and char_length(p_href) > 1000 then raise exception 'invalid_href'; end if;
  if p_purpose is null or char_length(trim(p_purpose)) < 1 or char_length(p_purpose) > 40 then raise exception 'invalid_purpose'; end if;

  insert into public.laneriq_in_app_notifications(user_id,title,body,href,purpose,metadata)
  values (p_user_id,trim(p_title),trim(p_body),nullif(trim(coalesce(p_href,'')),''),trim(p_purpose),coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.server_create_in_app_notification(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.server_create_in_app_notification(uuid,text,text,text,text,jsonb) to service_role;
