create or replace function public.project_memory_tree_is_safe(p_value jsonb, p_depth integer default 0)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  pair record;
  item jsonb;
  item_count integer := 0;
  value_type text;
begin
  if p_depth > 4 then return false; end if;
  value_type := jsonb_typeof(p_value);
  if value_type is null or value_type = 'null' then return true; end if;
  if value_type = 'string' then return char_length(p_value #>> '{}') <= 1000; end if;
  if value_type in ('number','boolean') then return true; end if;
  if value_type = 'array' then
    if jsonb_array_length(p_value) > 50 then return false; end if;
    for item in select value from jsonb_array_elements(p_value) loop
      if not public.project_memory_tree_is_safe(item,p_depth+1) then return false; end if;
    end loop;
    return true;
  end if;
  if value_type = 'object' then
    for pair in select key,value from jsonb_each(p_value) loop
      item_count := item_count + 1;
      if item_count > 40 then return false; end if;
      if char_length(pair.key) < 1 or char_length(pair.key) > 80 or pair.key !~ '^[a-zA-Z0-9_ -]+$' then return false; end if;
      if lower(pair.key) ~ '(password|passwd|secret|token|api[_-]?key|credential|private[_-]?key|auth[_-]?key)' then return false; end if;
      if not public.project_memory_tree_is_safe(pair.value,p_depth+1) then return false; end if;
    end loop;
    return true;
  end if;
  return false;
exception when others then return false;
end;
$$;

create or replace function public.project_memory_flat_object_is_safe(p_value jsonb, p_max_keys integer default 24, p_max_string integer default 2000)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare pair record; item_count integer := 0; value_type text;
begin
  if p_value is null then return true; end if;
  if jsonb_typeof(p_value) <> 'object' then return false; end if;
  for pair in select key,value from jsonb_each(p_value) loop
    item_count := item_count + 1;
    if item_count > p_max_keys then return false; end if;
    if char_length(pair.key) < 1 or char_length(pair.key) > 80 or pair.key !~ '^[a-zA-Z0-9_ -]+$' then return false; end if;
    if lower(pair.key) ~ '(password|passwd|secret|token|api[_-]?key|credential|private[_-]?key|auth[_-]?key)' then return false; end if;
    value_type := jsonb_typeof(pair.value);
    if value_type not in ('string','number','boolean') then return false; end if;
    if value_type = 'string' and char_length(pair.value #>> '{}') > p_max_string then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create or replace function public.project_memory_json_is_safe(p_memory jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  key_name text;
  prefs jsonb;
  media jsonb;
  item jsonb;
  learned jsonb;
  allowed text[] := array['requestedName','requested_name','brandPreferences','brand_preferences','visualPreferences','visual_preferences','userPreferences','user_preferences','workflowPreferences','workflow_preferences','contentGuidance','content_guidance','mediaPreferences','media_preferences','industryPlan','industry_plan','lastBuildAt','last_build_at','lastModificationAt','last_modification_at','lastModificationInstruction','last_modification_instruction','lastPreciseTarget','last_precise_target','lastSelfHealApplied','last_self_heal_applied','selfHeal','self_heal','learnedFrom','learned_from','storePublishingDeclarations','store_publishing_declarations','rawPrivateAssetsReusableAcrossCustomers','learning_scope'];
begin
  if p_memory is null or jsonb_typeof(p_memory) <> 'object' then return false; end if;
  if octet_length(p_memory::text) > 131072 then return false; end if;
  for key_name in select jsonb_object_keys(p_memory) loop
    if not (key_name = any(allowed)) then return false; end if;
  end loop;
  if p_memory ? 'requestedName' and char_length(coalesce(p_memory->>'requestedName','')) > 200 then return false; end if;
  if p_memory ? 'requested_name' and char_length(coalesce(p_memory->>'requested_name','')) > 200 then return false; end if;
  if p_memory ? 'contentGuidance' and char_length(coalesce(p_memory->>'contentGuidance','')) > 6000 then return false; end if;
  if p_memory ? 'content_guidance' and char_length(coalesce(p_memory->>'content_guidance','')) > 6000 then return false; end if;
  if p_memory ? 'lastModificationInstruction' and char_length(coalesce(p_memory->>'lastModificationInstruction','')) > 1000 then return false; end if;
  if p_memory ? 'last_modification_instruction' and char_length(coalesce(p_memory->>'last_modification_instruction','')) > 1000 then return false; end if;
  if p_memory ? 'lastBuildAt' and char_length(coalesce(p_memory->>'lastBuildAt','')) > 80 then return false; end if;
  if p_memory ? 'last_build_at' and char_length(coalesce(p_memory->>'last_build_at','')) > 80 then return false; end if;
  if p_memory ? 'lastModificationAt' and char_length(coalesce(p_memory->>'lastModificationAt','')) > 80 then return false; end if;
  if p_memory ? 'last_modification_at' and char_length(coalesce(p_memory->>'last_modification_at','')) > 80 then return false; end if;
  if p_memory ? 'rawPrivateAssetsReusableAcrossCustomers' and coalesce((p_memory->>'rawPrivateAssetsReusableAcrossCustomers')::boolean,false) then return false; end if;
  if p_memory ? 'learning_scope' and coalesce(p_memory->>'learning_scope','') not in ('project-only','anonymized-patterns-opt-in','project_only','anonymized_patterns') then return false; end if;

  foreach key_name in array array['brandPreferences','brand_preferences','visualPreferences','visual_preferences','userPreferences','user_preferences','workflowPreferences','workflow_preferences'] loop
    if p_memory ? key_name then
      prefs := p_memory->key_name;
      if not public.project_memory_flat_object_is_safe(prefs,24,2000) then return false; end if;
    end if;
  end loop;

  foreach key_name in array array['mediaPreferences','media_preferences'] loop
    if p_memory ? key_name then
      media := p_memory->key_name;
      if jsonb_typeof(media) <> 'array' or jsonb_array_length(media) > 30 then return false; end if;
      for item in select value from jsonb_array_elements(media) loop
        if jsonb_typeof(item) = 'string' then
          if char_length(item #>> '{}') > 1000 then return false; end if;
        elsif jsonb_typeof(item) = 'object' then
          if octet_length(item::text) > 12288 or not public.project_memory_flat_object_is_safe(item,12,1000) then return false; end if;
        else return false;
        end if;
      end loop;
    end if;
  end loop;

  foreach key_name in array array['learnedFrom','learned_from'] loop
    if p_memory ? key_name then
      learned := p_memory->key_name;
      if jsonb_typeof(learned) <> 'array' or jsonb_array_length(learned) > 12 then return false; end if;
      for item in select value from jsonb_array_elements(learned) loop
        if jsonb_typeof(item) <> 'string' or char_length(item #>> '{}') > 200 then return false; end if;
      end loop;
    end if;
  end loop;

  foreach key_name in array array['industryPlan','industry_plan'] loop
    if p_memory ? key_name and (octet_length((p_memory->key_name)::text) > 32768 or not public.project_memory_tree_is_safe(p_memory->key_name,0)) then return false; end if;
  end loop;
  foreach key_name in array array['lastPreciseTarget','last_precise_target','selfHeal','self_heal'] loop
    if p_memory ? key_name and (octet_length((p_memory->key_name)::text) > 8192 or not public.project_memory_tree_is_safe(p_memory->key_name,0)) then return false; end if;
  end loop;
  foreach key_name in array array['storePublishingDeclarations','store_publishing_declarations'] loop
    if p_memory ? key_name and (octet_length((p_memory->key_name)::text) > 16384 or not public.project_memory_tree_is_safe(p_memory->key_name,0)) then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

alter table public.project_memory drop constraint if exists project_memory_json_safe_check;
alter table public.project_memory add constraint project_memory_json_safe_check check (public.project_memory_json_is_safe(memory_json)) not valid;
alter table public.project_memory validate constraint project_memory_json_safe_check;

alter policy project_memory_owner_all on public.project_memory
  using (
    owner_id = (select auth.uid())
    and exists (select 1 from public.apps a where a.id = project_memory.app_id and a.owner_id = (select auth.uid()))
  )
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.apps a where a.id = project_memory.app_id and a.owner_id = (select auth.uid()))
  );

revoke all on public.project_memory from anon;
grant select, insert, update, delete on public.project_memory to authenticated;
revoke truncate, references, trigger on public.project_memory from authenticated;
