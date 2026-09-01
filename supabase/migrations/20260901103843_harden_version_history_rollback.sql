create or replace function public.server_rollback_app_version(
  p_user_id uuid,
  p_app_id uuid,
  p_target_version_id uuid,
  p_expected_current_version_id uuid,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_key text := 'rollback:' || left(coalesce(nullif(trim(p_request_id),''),''),151);
  current_version uuid;
  existing_version public.app_versions;
  target_version public.app_versions;
  next_version integer;
  new_version public.app_versions;
begin
  if p_user_id is null or p_app_id is null or p_target_version_id is null or p_expected_current_version_id is null then
    raise exception 'Rollback identity is required';
  end if;
  if request_key = 'rollback:' then raise exception 'Rollback request id is required'; end if;

  select a.current_version_id into current_version
  from public.apps a
  where a.id = p_app_id and a.owner_id = p_user_id
  for update;
  if not found then raise exception 'App access denied'; end if;

  select * into existing_version
  from public.app_versions v
  where v.app_id = p_app_id and v.source_request_id = request_key
  limit 1;
  if found then
    if existing_version.created_by is distinct from p_user_id then
      raise exception 'Rollback request ownership mismatch';
    end if;
    return jsonb_build_object(
      'id', existing_version.id,
      'version_no', existing_version.version_no,
      'created_at', existing_version.created_at,
      'change_summary', existing_version.change_summary,
      'target_version_id', p_target_version_id,
      'replayed', true
    );
  end if;

  if current_version is distinct from p_expected_current_version_id then
    raise exception 'Project changed during rollback. Refresh and retry.';
  end if;
  if p_target_version_id = current_version then
    raise exception 'Target version is already current';
  end if;

  select * into target_version
  from public.app_versions v
  where v.id = p_target_version_id and v.app_id = p_app_id
  limit 1;
  if not found then raise exception 'Version not found'; end if;
  if target_version.specification is null or jsonb_typeof(target_version.specification) <> 'object' then
    raise exception 'Version specification is invalid';
  end if;

  select coalesce(max(v.version_no),0) + 1 into next_version
  from public.app_versions v
  where v.app_id = p_app_id;

  begin
    insert into public.app_versions(
      app_id, version_no, specification, change_summary, created_by, source_request_id
    ) values (
      p_app_id,
      next_version,
      target_version.specification,
      left('Rollback to version ' || target_version.version_no::text,4000),
      p_user_id,
      request_key
    ) returning * into new_version;
  exception when unique_violation then
    raise exception 'Project changed during rollback. Refresh and retry.';
  end;

  update public.apps
  set current_version_id = new_version.id,
      name = coalesce(nullif(btrim(target_version.specification->>'name'),''), name),
      description = coalesce(target_version.specification->>'description', description)
  where id = p_app_id and owner_id = p_user_id;

  return jsonb_build_object(
    'id', new_version.id,
    'version_no', new_version.version_no,
    'created_at', new_version.created_at,
    'change_summary', new_version.change_summary,
    'target_version_id', target_version.id,
    'target_version_no', target_version.version_no,
    'replayed', false
  );
end;
$$;

revoke all on function public.server_rollback_app_version(uuid,uuid,uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.server_rollback_app_version(uuid,uuid,uuid,uuid,text)
  to service_role;
