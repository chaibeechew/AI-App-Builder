drop policy if exists "website_enquiries_service_role_only" on public.website_enquiries;
create policy "website_enquiries_service_role_only" on public.website_enquiries
for all to service_role
using (true)
with check (true);
