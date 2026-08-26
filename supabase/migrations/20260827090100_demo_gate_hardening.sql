create or replace function public.consume_app_builder_entitlement(p_operation text, p_app_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); free_used boolean; demo_ok boolean; referral_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_operation not in ('create','modify') then raise exception 'Unsupported entitlement operation'; end if;
  insert into public.user_usage_counters(user_id) values(uid) on conflict (user_id) do nothing;

  if p_operation = 'create' then
    update public.user_usage_counters set free_create_used=true,updated_at=now() where user_id=uid and free_create_used=false returning true into free_used;
    if coalesce(free_used,false) then return jsonb_build_object('allowed',true,'source','free_create'); end if;
  else
    if p_app_id is not null and exists(select 1 from public.app_demo_sessions d where d.user_id=uid and d.app_id=p_app_id and d.status='active' and d.expires_at>now()) then
      update public.user_usage_counters set demo_modify_used=true,updated_at=now() where user_id=uid and free_create_used=true and demo_modify_used=false returning true into demo_ok;
      if coalesce(demo_ok,false) then return jsonb_build_object('allowed',true,'source','demo_free_modify'); end if;
    end if;

    select rr.id into referral_id from public.referral_rewards rr
      where rr.referrer_user_id=uid and rr.reward_type='first_app_created' and rr.status in ('pending','approved','paid')
        and rr.metadata->>'free_modify_consumed' is distinct from 'true'
      order by rr.created_at limit 1;
    if referral_id is not null then
      if (select count(*) from public.referral_rewards rr where rr.referrer_user_id=uid and rr.reward_type='first_app_created' and rr.status in ('pending','approved','paid')) <= 7 then
        update public.referral_rewards set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('free_modify_consumed',true,'consumed_at',now()) where id=referral_id;
        return jsonb_build_object('allowed',true,'source','referral_free_modify');
      end if;
    end if;
  end if;
  return jsonb_build_object('allowed',false);
end; $$;
