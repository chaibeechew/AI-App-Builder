alter table public.profiles
  add column if not exists display_name text;

alter table public.apps
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'listed')),
  add column if not exists publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published'));

create index if not exists apps_visibility_idx on public.apps(visibility);

create policy "Users can update visibility and publish status on their own apps"
on public.apps for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
