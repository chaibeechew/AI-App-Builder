revoke insert, update, delete on table public.asset_library from anon;
revoke insert, update, delete on table public.project_assets from anon;

create unique index if not exists asset_library_user_fingerprint_unique_idx
  on public.asset_library(user_id, content_fingerprint)
  where content_fingerprint is not null;

alter table public.asset_library
  drop constraint if exists asset_library_reference_safety_check;

alter table public.asset_library
  add constraint asset_library_reference_safety_check check (
    length(file_name) between 1 and 180
    and length(storage_path) between 3 and 500
    and storage_path like (user_id::text || '/%')
    and (mime_type is null or length(mime_type) <= 120)
    and (file_size is null or (file_size > 0 and file_size <= 104857600))
    and (content_fingerprint is null or content_fingerprint ~ '^[0-9a-f]{64}$')
    and not (intelligence @> '{"reusableAcrossUsers": true}'::jsonb)
    and not (intelligence @> '{"rawPrivateAssetsReusableAcrossCustomers": true}'::jsonb)
  ) not valid;

alter table public.asset_library validate constraint asset_library_reference_safety_check;
