-- Professional/Standard AI modify persistence must be atomic, replay-safe and service-only.

alter table public.app_versions
  add column if not exists source_request_id text;

create unique index if not exists app_versions_app_request_unique
  on public.app_versions(app_id, source_request_id)
  where source_request_id is not null;

create or replace function public.server_save_app_modification(
  p_user_id uuid,
  p_app_id uuid,
  p_expected_version_id uuid,
  p_request_id text,
  p_specification jsonb,
  p_change_summary text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_key text := left(coalesce(nullif(trim(p_request_id),''),''),160);
  current_version uuid;
  existing_version public.app_versions;
  next_version integer;
  new_version public.app_versions;
begin
  if p_user_id is null or p_app_id is null or p_expected_version_id is null then
    raise exception 'Modification identity is required';
  end if;
  if request_key = '' then raise exception 'Modification request id is required'; end if;
  if p_specification is null or jsonb_typeof(p_specification) <> 'object' then
    raise exception 'Modification specification must be an object';
  end if;
  if octet_length(p_specification::text) > 1500000 then
    raise exception 'Modification specification is too large';
  end if;

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
      raise exception 'Modification request ownership mismatch';
    end if;
    return jsonb_build_object(
      'id', existing_version.id,
      'version_no', existing_version.version_no,
      'created_at', existing_version.created_at,
      'replayed', true
    );
  end if;

  if current_version is distinct from p_expected_version_id then
    raise exception 'Project changed during modification. Refresh and retry.';
  end if;

  select coalesce(max(v.version_no),0) + 1 into next_version
  from public.app_versions v where v.app_id = p_app_id;

  begin
    insert into public.app_versions(
      app_id, version_no, specification, change_summary, created_by, source_request_id
    ) values (
      p_app_id, next_version, p_specification,
      left(coalesce(p_change_summary,'AI modification'),4000), p_user_id, request_key
    ) returning * into new_version;
  exception when unique_violation then
    raise exception 'Project changed during modification. Refresh and retry.';
  end;

  update public.apps
  set name = coalesce(nullif(btrim(p_specification->>'name'),''), name),
      description = coalesce(p_specification->>'description', description),
      current_version_id = new_version.id
  where id = p_app_id and owner_id = p_user_id;

  return jsonb_build_object(
    'id', new_version.id,
    'version_no', new_version.version_no,
    'created_at', new_version.created_at,
    'replayed', false
  );
end;
$$;

revoke all on function public.server_save_app_modification(uuid,uuid,uuid,text,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.server_save_app_modification(uuid,uuid,uuid,text,jsonb,text)
  to service_role;
