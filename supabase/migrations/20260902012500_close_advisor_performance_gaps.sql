-- Close live Supabase advisor gaps without weakening protective indexes.
-- The same DDL was verified against the LANERIQ AI production database first.

create index if not exists game_creation_reservations_app_id_idx
  on public.game_creation_reservations(app_id);

create index if not exists web_publish_requests_version_id_idx
  on public.web_publish_requests(version_id);

-- This older index is byte-for-byte equivalent to the canonical upload-reference
-- uniqueness index created by 20260901124338_harden_upload_reference_asset_contract.sql.
-- Keep the canonical name because CI and the upload/image/avatar contracts depend on it.
drop index if exists public.asset_library_owner_fingerprint_uq;
