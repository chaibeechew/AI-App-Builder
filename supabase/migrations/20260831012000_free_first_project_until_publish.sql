create or replace function public.consume_app_builder_entitlement(p_operation text, p_app_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  free_used boolean;
  referral_count integer;
  first_app_id uuid;
  first_app_published boolean := false;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_operation not in ('create','modify') then raise exception 'Unsupported entitlement operation'; end if;

  insert into public.user_usage_counters(user_id) values(uid) on conflict (user_id) do nothing;

  if p_operation = 'create' then
    update public.user_usage_counters
      set free_create_used = true, updated_at = now()
      where user_id = uid and free_create_used = false
      returning true into free_used;
    if coalesce(free_used,false) then
      return jsonb_build_object('allowed',true,'source','free_first_project_create','promotion','free_first_project_until_publish');
    end if;
  end if;

  if p_operation = 'modify' and p_app_id is not null then
    select a.id,
           coalesce(a.publish_status = 'published', false)
      into first_app_id, first_app_published
      from public.apps a
      where a.owner_id = uid
      order by a.created_at asc, a.id asc
      limit 1;

    if first_app_id = p_app_id and not coalesce(first_app_published,false) then
      return jsonb_build_object(
        'allowed',true,
        'source','free_first_project_modify',
        'promotion','free_first_project_until_publish',
        'ends_at','project_publish'
      );
    end if;

    select count(*)::integer into referral_count
      from public.referral_rewards rr
      where rr.referrer_user_id = uid
        and rr.reward_type = 'first_app_created'
        and rr.status in ('pending','approved','paid');

    if referral_count < 7 and exists (
      select 1 from public.referral_rewards rr
      where rr.referrer_user_id = uid
        and rr.reward_type = 'first_app_created'
        and rr.status = 'pending'
        and rr.metadata->>'free_modify_consumed' is distinct from 'true'
    ) then
      update public.referral_rewards
        set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('free_modify_consumed',true,'consumed_at',now())
        where id = (
          select rr.id from public.referral_rewards rr
          where rr.referrer_user_id = uid
            and rr.reward_type = 'first_app_created'
            and rr.status = 'pending'
            and rr.metadata->>'free_modify_consumed' is distinct from 'true'
          order by rr.created_at limit 1
        );
      return jsonb_build_object('allowed',true,'source','referral_free_modify','referral_index',referral_count);
    end if;
  end if;

  return jsonb_build_object('allowed',false,'source',null);
end; $$;

revoke all on function public.consume_app_builder_entitlement(text,uuid) from public, anon, authenticated;
grant execute on function public.consume_app_builder_entitlement(text,uuid) to authenticated;
