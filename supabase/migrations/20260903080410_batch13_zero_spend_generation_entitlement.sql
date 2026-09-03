create or replace function public.server_consume_app_builder_zero_spend_entitlement(
  p_user_id uuid,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := p_user_id;
  request_key text := left(coalesce(nullif(trim(p_request_id), ''), ''), 160);
  usage_row public.app_builder_usage;
  account_row public.app_builder_account_access;
begin
  if uid is null then raise exception 'User id is required'; end if;
  if request_key = '' then raise exception 'Request id is required'; end if;

  insert into public.app_builder_usage(user_id) values(uid) on conflict(user_id) do nothing;
  insert into public.app_builder_account_access(user_id) values(uid) on conflict(user_id) do nothing;

  select * into usage_row from public.app_builder_usage where user_id = uid for update;
  select * into account_row from public.app_builder_account_access where user_id = uid for update;

  if usage_row.create_source is not null then
    if usage_row.create_request_id = request_key
      and usage_row.create_source in ('free_first_project_create', 'pro_access') then
      return jsonb_build_object(
        'allowed', true,
        'source', usage_row.create_source,
        'replayed', true,
        'zero_spend', true
      );
    end if;
    raise exception 'Another creation request is already in progress';
  end if;

  if not usage_row.free_first_project_claimed
    and not exists(select 1 from public.apps a where a.owner_id = uid) then
    update public.app_builder_usage
      set free_first_project_claimed = true,
          create_request_id = request_key,
          create_source = 'free_first_project_create',
          create_claimed_at = now(),
          updated_at = now()
      where user_id = uid;
    return jsonb_build_object(
      'allowed', true,
      'source', 'free_first_project_create',
      'promotion', 'free_first_project_until_publish',
      'zero_spend', true
    );
  end if;

  if account_row.pro_valid_until is not null and account_row.pro_valid_until > now() then
    update public.app_builder_usage
      set create_request_id = request_key,
          create_source = 'pro_access',
          create_claimed_at = now(),
          updated_at = now()
      where user_id = uid;
    return jsonb_build_object(
      'allowed', true,
      'source', 'pro_access',
      'valid_until', account_row.pro_valid_until,
      'zero_spend', true
    );
  end if;

  return jsonb_build_object(
    'allowed', false,
    'source', null,
    'zero_spend', true,
    'reason', 'zero_spend_entitlement_unavailable'
  );
end;
$$;

revoke all on function public.server_consume_app_builder_zero_spend_entitlement(uuid,text) from public, anon, authenticated;
grant execute on function public.server_consume_app_builder_zero_spend_entitlement(uuid,text) to service_role;
