create index if not exists publish_requests_requested_by_idx on public.publish_requests (requested_by);
create index if not exists publish_requests_store_listing_id_idx on public.publish_requests (store_listing_id);
create index if not exists publish_requests_version_id_idx on public.publish_requests (version_id);
create index if not exists store_listings_version_id_idx on public.store_listings (version_id);
