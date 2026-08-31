-- Low-risk database performance hardening verified against the live Preview database.
-- Cover foreign keys used by deletes/joins and make auth.uid() an init-plan value in owner RLS.

create index if not exists ai_ops_events_owner_id_idx on public.ai_ops_events(owner_id);
create index if not exists app_folder_nodes_parent_id_idx on public.app_folder_nodes(parent_id);
create index if not exists app_revenue_events_store_link_id_idx on public.app_revenue_events(store_link_id);
create index if not exists app_source_files_folder_id_idx on public.app_source_files(folder_id);
create index if not exists app_versions_created_by_idx on public.app_versions(created_by);
create index if not exists app_workflows_owner_id_idx on public.app_workflows(owner_id);
create index if not exists apps_current_version_id_idx on public.apps(current_version_id);
create index if not exists monetization_offers_owner_id_idx on public.monetization_offers(owner_id);
create index if not exists payment_checkout_logs_offer_id_idx on public.payment_checkout_logs(offer_id);
create index if not exists payment_checkout_logs_owner_id_idx on public.payment_checkout_logs(owner_id);
create index if not exists project_integrations_owner_id_idx on public.project_integrations(owner_id);
create index if not exists referrals_referred_user_id_idx on public.referrals(referred_user_id);
create index if not exists video_clips_owner_id_idx on public.video_clips(owner_id);
create index if not exists video_projects_app_id_idx on public.video_projects(app_id);
create index if not exists video_versions_owner_id_idx on public.video_versions(owner_id);
create index if not exists workflow_records_owner_id_idx on public.workflow_records(owner_id);

alter policy "brand kits select own" on public.brand_kits using ((select auth.uid()) = user_id);
alter policy "brand kits insert own" on public.brand_kits with check ((select auth.uid()) = user_id);
alter policy "brand kits update own" on public.brand_kits using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy project_memory_owner_all on public.project_memory using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy app_workflows_owner_all on public.app_workflows using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy project_assets_select_own on public.project_assets using ((select auth.uid()) = owner_id);
alter policy project_assets_insert_own on public.project_assets with check (((select auth.uid()) = owner_id) and exists (select 1 from public.apps a where a.id = project_assets.app_id and a.owner_id = (select auth.uid())) and exists (select 1 from public.asset_library al where al.id = project_assets.asset_id and al.user_id = (select auth.uid())));
alter policy project_assets_update_own on public.project_assets using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
alter policy project_assets_delete_own on public.project_assets using ((select auth.uid()) = owner_id);
alter policy workflow_runs_select_own on public.workflow_runs using ((select auth.uid()) = owner_id);
alter policy workflow_runs_insert_own on public.workflow_runs with check ((select auth.uid()) = owner_id);
alter policy workflow_runs_update_own on public.workflow_runs using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
alter policy workflow_records_select_own on public.workflow_records using ((select auth.uid()) = owner_id);
alter policy workflow_records_insert_own on public.workflow_records with check ((select auth.uid()) = owner_id);
alter policy workflow_records_update_own on public.workflow_records using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
alter policy workflow_records_delete_own on public.workflow_records using ((select auth.uid()) = owner_id);
alter policy video_projects_own_all on public.video_projects using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
alter policy video_clips_own_all on public.video_clips using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
alter policy video_versions_own_all on public.video_versions using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Authenticated users need only one permissive SELECT policy. Anonymous published-asset
-- reads remain separate so public customer sites can resolve published project media.
alter policy asset_library_published_project_read on public.asset_library to anon using (
  exists (
    select 1 from public.project_assets pa
    join public.apps a on a.id = pa.app_id
    where pa.asset_id = asset_library.id
      and (a.visibility = 'public' or a.publish_status = 'published')
  )
);
alter policy asset_library_select_own on public.asset_library to authenticated using (
  ((select auth.uid()) = user_id)
  or exists (
    select 1 from public.project_assets pa
    join public.apps a on a.id = pa.app_id
    where pa.asset_id = asset_library.id
      and (a.visibility = 'public' or a.publish_status = 'published')
  )
);
