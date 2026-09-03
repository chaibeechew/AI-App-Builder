-- Persist the first generated App + Website version atomically and recover legacy partial requests.
create or replace function public.server_persist_generated_project(
  p_user_id uuid,
  p_request_id text,
  p_name text,
  p_description text,
  p_source_prompt text,
  p_specification jsonb,
  p_change_summary text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=p_user_id;
  caller uuid:=auth.uid();
  request_key text:=btrim(coalesce(p_request_id,''));
  clean_name text:=left(btrim(coalesce(p_name,'Untitled App')),200);
  clean_description text:=left(coalesce(p_description,''),4000);
  clean_prompt text:=left(coalesce(p_source_prompt,''),8000);
  app_row public.apps%rowtype;
  version_row public.app_versions%rowtype;
  app_existed boolean:=false;
  recovered_partial boolean:=false;
begin
  if caller is null or uid is null or caller is distinct from uid then raise exception 'Authenticated user mismatch'; end if;
  if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid generation request id'; end if;
  if clean_name='' then clean_name:='Untitled App'; end if;
  if p_specification is null or jsonb_typeof(p_specification)<>'object' then raise exception 'Generated specification must be a JSON object'; end if;

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
        return jsonb_build_object(
          'success',true,'replayed',true,'recovered_partial',false,
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
    return jsonb_build_object(
      'success',true,'replayed',true,'recovered_partial',recovered_partial,
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

  return jsonb_build_object(
    'success',true,'replayed',app_existed,'recovered_partial',false,
    'app_id',app_row.id,'app_name',app_row.name,'version_id',version_row.id,'version_no',version_row.version_no,
    'visibility',app_row.visibility,'publish_status',app_row.publish_status
  );
end;
$$;

revoke all on function public.server_persist_generated_project(uuid,text,text,text,text,jsonb,text) from public,anon;
grant execute on function public.server_persist_generated_project(uuid,text,text,text,text,jsonb,text) to authenticated,service_role;
