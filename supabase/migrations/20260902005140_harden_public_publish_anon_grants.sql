-- Published App/Website rendering is served through the server-only runtime loader.
-- Anonymous Data API clients must never gain direct write capability on project source tables.
revoke insert, update, delete on table public.apps from anon;
revoke insert, update, delete on table public.app_versions from anon;
