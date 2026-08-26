create table if not exists public.user_usage_counters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_create_used boolean not null default false,
  demo_modify_used boolean not null default false,
  paid_modify_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_usage_counters enable row level security;

create policy "users read own usage counters" on public.user_usage_counters
for select using (auth.uid() = user_id);

revoke insert, update, delete on public.user_usage_counters from anon, authenticated;

create or replace function public.consume_free_app_creation()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare ok boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.user_usage_counters(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.user_usage_counters set free_create_used = true, updated_at = now()
    where user_id = auth.uid() and free_create_used = false
    returning true into ok;
  return coalesce(ok, false);
end; $$;

create or replace function public.consume_demo_free_modify()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare ok boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.user_usage_counters(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.user_usage_counters set demo_modify_used = true, updated_at = now()
    where user_id = auth.uid() and demo_modify_used = false
    returning true into ok;
  return coalesce(ok, false);
end; $$;

create or replace function public.record_paid_modify()
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare n bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.user_usage_counters(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.user_usage_counters set paid_modify_count = paid_modify_count + 1, updated_at = now()
    where user_id = auth.uid() returning paid_modify_count into n;
  return n;
end; $$;

revoke all on function public.consume_free_app_creation() from public, anon, authenticated;
revoke all on function public.consume_demo_free_modify() from public, anon, authenticated;
revoke all on function public.record_paid_modify() from public, anon, authenticated;
