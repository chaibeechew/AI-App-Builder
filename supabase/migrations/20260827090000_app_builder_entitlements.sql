create table if not exists public.app_demo_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id uuid not null references public.apps(id) on delete cascade,
  version_id uuid not null references public.app_versions(id) on delete cascade,
  status text not null default 'active' check (status in ('active','expired','closed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_demo_sessions_user_idx on public.app_demo_sessions(user_id, created_at desc);
create index if not exists app_demo_sessions_app_idx on public.app_demo_sessions(app_id, created_at desc);
alter table public.app_demo_sessions enable row level security;
create policy "users read own demo sessions" on public.app_demo_sessions for select using (auth.uid() = user_id);
revoke insert, update, delete on public.app_demo_sessions from anon, authenticated;

create or replace function public.consume_app_builder_entitlement(p_operation text, p_app_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); free_used boolean; demo_ok boolean; referral_count integer; source text := null;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_operation not in ('create','modify') then raise exception 'Unsupported entitlement operation'; end if;
  insert into public.user_usage_counters(user_id) values(uid) on conflict (user_id) do nothing;

  if p_operation = 'create' then
    update public.user_usage_counters set free_create_used = true, updated_at = now()
      where user_id = uid and free_create_used = false returning true into free_used;
    if coalesce(free_used,false) then return jsonb_build_object('allowed',true,'source','free_create'); end if;
  end if;

  if p_operation = 'modify' then
    update public.user_usage_counters set demo_modify_used = true, updated_at = now()
      where user_id = uid and demo_modify_used = false returning true into demo_ok;
    if coalesce(demo_ok,false) then return jsonb_build_object('allowed',true,'source','demo_free_modify'); end if;

    select count(*)::integer into referral_count
      from public.referral_rewards rr
      where rr.referrer_user_id = uid and rr.reward_type = 'first_app_created' and rr.status in ('pending','approved','paid');
    if referral_count < 7 then
      if exists (select 1 from public.referral_rewards rr where rr.referrer_user_id = uid and rr.reward_type = 'first_app_created' and rr.status = 'pending' and rr.metadata->>'free_modify_consumed' is distinct from 'true') then
        update public.referral_rewards set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('free_modify_consumed',true,'consumed_at',now())
          where id = (select rr.id from public.referral_rewards rr where rr.referrer_user_id = uid and rr.reward_type = 'first_app_created' and rr.status = 'pending' and rr.metadata->>'free_modify_consumed' is distinct from 'true' order by rr.created_at limit 1);
        return jsonb_build_object('allowed',true,'source','referral_free_modify','referral_index',referral_count);
      end if;
    end if;
  end if;

  return jsonb_build_object('allowed',false,'source',null);
end; $$;

create or replace function public.create_app_demo(p_app_id uuid, p_version_id uuid, p_hours integer default 72)
returns public.app_demo_sessions language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); row public.app_demo_sessions;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.apps where id=p_app_id and owner_id=uid) then raise exception 'App access denied'; end if;
  if not exists(select 1 from public.app_versions where id=p_version_id and app_id=p_app_id) then raise exception 'Version access denied'; end if;
  insert into public.app_demo_sessions(user_id,app_id,version_id,expires_at)
  values(uid,p_app_id,p_version_id,now()+make_interval(hours=>least(greatest(coalesce(p_hours,72),1),168))) returning * into row;
  return row;
end; $$;

revoke all on function public.consume_app_builder_entitlement(text,uuid) from public, anon, authenticated;
grant execute on function public.consume_app_builder_entitlement(text,uuid) to authenticated;
revoke all on function public.create_app_demo(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.create_app_demo(uuid,uuid,integer) to authenticated;
