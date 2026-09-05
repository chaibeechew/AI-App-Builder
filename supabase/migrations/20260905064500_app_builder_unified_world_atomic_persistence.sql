-- App Builder versions and their project-scoped Unified World / Evidence envelope must advance together.
-- World-aware RPC names are intentionally separate from legacy RPCs to avoid PostgREST overload ambiguity.

create or replace function public.server_persist_generated_project_world(
  p_user_id uuid,
  p_request_id text,
  p_name text,
  p_description text,
  p_source_prompt text,
  p_specification jsonb,
  p_change_summary text,
  p_memory_json jsonb,
  p_learning_scope text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=p_user_id;
  request_key text:=btrim(coalesce(p_request_id,''));
  clean_name text:=left(btrim(coalesce(p_name,'Untitled App')),200);
  clean_description text:=left(coalesce(p_description,''),4000);
  clean_prompt text:=left(coalesce(p_source_prompt,''),8000);
  clean_learning_scope text:=case when p_learning_scope in ('project_only','anonymized_patterns') then p_learning_scope else 'project_only' end;
  app_row public.apps%rowtype;
  version_row public.app_versions%rowtype;
  app_existed boolean:=false;
  recovered_partial boolean:=false;
  memory_saved boolean:=false;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'service_role required'; end if;
  if uid is null then raise exception 'User id required'; end if;
  if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid generation request id'; end if;
  if clean_name='' then clean_name:='Untitled App'; end if;
  if p_specification is null or jsonb_typeof(p_specification)<>'object' then raise exception 'Generated specification must be a JSON object'; end if;
  if octet_length(p_specification::text)>1500000 then raise exception 'Generated specification is too large'; end if;
  if p_memory_json is null or jsonb_typeof(p_memory_json)<>'object' then raise exception 'Project memory must be a JSON object'; end if;
  if octet_length(p_memory_json::text)>350000 then raise exception 'Project memory is too large'; end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||request_key,73129));

  select * into app_row
  from public.apps
  where owner_id=uid and generation_request_id=request_key
  for update;

  if found then
    app_existed:=true;
    if app_row.current_version_id is not null then
      select * into version_row from public.app_versions where id=app_row.current_version_id and app_id=app_row.id;
      if found then
        if version_row.version_no=1 then
          insert into public.project_memory(app_id,owner_id,memory_json,learning_scope,updated_at)
          values(app_row.id,uid,p_memory_json,clean_learning_scope,now())
          on conflict(app_id) do update set memory_json=excluded.memory_json,learning_scope=excluded.learning_scope,updated_at=excluded.updated_at
          where public.project_memory.owner_id=uid;
          memory_saved:=true;
        end if;
        return jsonb_build_object(
          'success',true,'replayed',true,'recovered_partial',false,'memory_saved',memory_saved,
          'app_id',app_row.id,'app_name',app_row.name,'version_id',version_row.id,'version_no',version_row.version_no,
          'visibility',app_row.visibility,'publish_status',app_row.publish_status
        );
      end if;
      recovered_partial:=true;
    else
      recovered_partial:=true;
    end if;

    select * into version_row from public.app_versions where app_id=app_row.id and version_no=1 for update;
    if not found then
      insert into public.app_versions(app_id,version_no,specification,change_summary,created_by)
      values(app_row.id,1,p_specification,p_change_summary,uid)
      returning * into version_row;
    end if;
    update public.apps set current_version_id=version_row.id,updated_at=now() where id=app_row.id and owner_id=uid returning * into app_row;
    insert into public.project_memory(app_id,owner_id,memory_json,learning_scope,updated_at)
    values(app_row.id,uid,p_memory_json,clean_learning_scope,now())
    on conflict(app_id) do update set memory_json=excluded.memory_json,learning_scope=excluded.learning_scope,updated_at=excluded.updated_at
    where public.project_memory.owner_id=uid;
    return jsonb_build_object(
      'success',true,'replayed',true,'recovered_partial',recovered_partial,'memory_saved',true,
      'app_id',app_row.id,'app_name',app_row.name,'version_id',version_row.id,'version_no',version_row.version_no,
      'visibility',app_row.visibility,'publish_status',app_row.publish_status
    );
  end if;

  insert into public.apps(owner_id,name,description,source_prompt,generation_request_id,visibility,publish_status)
  values(uid,clean_name,clean_description,clean_prompt,request_key,'private','draft')
  returning * into app_row;

  insert into public.app_versions(app_id,version_no,specification,change_summary,created_by)
  values(app_row.id,1,p_specification,p_change_summary,uid)
  returning * into version_row;

  update public.apps set current_version_id=version_row.id,updated_at=now()
  where id=app_row.id and owner_id=uid
  returning * into app_row;

  insert into public.project_memory(app_id,owner_id,memory_json,learning_scope,updated_at)
  values(app_row.id,uid,p_memory_json,clean_learning_scope,now())
  on conflict(app_id) do update set memory_json=excluded.memory_json,learning_scope=excluded.learning_scope,updated_at=excluded.updated_at
  where public.project_memory.owner_id=uid;

  return jsonb_build_object(
    'success',true,'replayed',app_existed,'recovered_partial',false,'memory_saved',true,
    'app_id',app_row.id,'app_name',app_row.name,'version_id',version_row.id,'version_no',version_row.version_no,
    'visibility',app_row.visibility,'publish_status',app_row.publish_status
  );
end;
$$;

revoke all on function public.server_persist_generated_project_world(uuid,text,text,text,text,jsonb,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.server_persist_generated_project_world(uuid,text,text,text,text,jsonb,text,jsonb,text) to service_role;

create or replace function public.server_save_app_modification_world(
  p_user_id uuid,
  p_app_id uuid,
  p_expected_version_id uuid,
  p_request_id text,
  p_specification jsonb,
  p_change_summary text,
  p_memory_json jsonb,
  p_learning_scope text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  request_key text:=left(coalesce(nullif(trim(p_request_id),''),''),160);
  clean_learning_scope text:=case when p_learning_scope in ('project_only','anonymized_patterns') then p_learning_scope else 'project_only' end;
  current_version uuid;
  existing_version public.app_versions%rowtype;
  next_version integer;
  new_version public.app_versions%rowtype;
  replay_memory_saved boolean:=false;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'service_role required'; end if;
  if p_user_id is null or p_app_id is null or p_expected_version_id is null then raise exception 'Modification identity is required'; end if;
  if request_key='' then raise exception 'Modification request id is required'; end if;
  if p_specification is null or jsonb_typeof(p_specification)<>'object' then raise exception 'Modification specification must be an object'; end if;
  if octet_length(p_specification::text)>1500000 then raise exception 'Modification specification is too large'; end if;
  if p_memory_json is null or jsonb_typeof(p_memory_json)<>'object' then raise exception 'Project memory must be a JSON object'; end if;
  if octet_length(p_memory_json::text)>350000 then raise exception 'Project memory is too large'; end if;

  select a.current_version_id into current_version
  from public.apps a
  where a.id=p_app_id and a.owner_id=p_user_id
  for update;
  if not found then raise exception 'App access denied'; end if;

  select * into existing_version
  from public.app_versions v
  where v.app_id=p_app_id and v.source_request_id=request_key
  limit 1;
  if found then
    if existing_version.created_by is distinct from p_user_id then raise exception 'Modification request ownership mismatch'; end if;
    if current_version is not distinct from existing_version.id then
      insert into public.project_memory(app_id,owner_id,memory_json,learning_scope,updated_at)
      values(p_app_id,p_user_id,p_memory_json,clean_learning_scope,now())
      on conflict(app_id) do update set memory_json=excluded.memory_json,learning_scope=excluded.learning_scope,updated_at=excluded.updated_at
      where public.project_memory.owner_id=p_user_id;
      replay_memory_saved:=true;
    end if;
    return jsonb_build_object('id',existing_version.id,'version_no',existing_version.version_no,'created_at',existing_version.created_at,'replayed',true,'memory_saved',replay_memory_saved);
  end if;

  if current_version is distinct from p_expected_version_id then raise exception 'Project changed during modification. Refresh and retry.'; end if;

  select v.version_no+1 into next_version
  from public.app_versions v
  where v.id=p_expected_version_id and v.app_id=p_app_id;
  if next_version is null then raise exception 'Expected project version not found'; end if;

  begin
    insert into public.app_versions(app_id,version_no,specification,change_summary,created_by,source_request_id)
    values(p_app_id,next_version,p_specification,left(coalesce(p_change_summary,'AI modification'),4000),p_user_id,request_key)
    returning * into new_version;
  exception when unique_violation then
    raise exception 'Project changed during modification. Refresh and retry.';
  end;

  update public.apps
  set name=coalesce(nullif(btrim(p_specification->>'name'),''),name),
      description=coalesce(p_specification->>'description',description),
      current_version_id=new_version.id,
      updated_at=now()
  where id=p_app_id and owner_id=p_user_id;

  insert into public.project_memory(app_id,owner_id,memory_json,learning_scope,updated_at)
  values(p_app_id,p_user_id,p_memory_json,clean_learning_scope,now())
  on conflict(app_id) do update set memory_json=excluded.memory_json,learning_scope=excluded.learning_scope,updated_at=excluded.updated_at
  where public.project_memory.owner_id=p_user_id;

  return jsonb_build_object('id',new_version.id,'version_no',new_version.version_no,'created_at',new_version.created_at,'replayed',false,'memory_saved',true);
end;
$$;

revoke all on function public.server_save_app_modification_world(uuid,uuid,uuid,text,jsonb,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.server_save_app_modification_world(uuid,uuid,uuid,text,jsonb,text,jsonb,text) to service_role;
