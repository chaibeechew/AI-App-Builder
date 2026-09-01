alter table public.brand_kits drop constraint if exists brand_kits_company_name_length_check;
alter table public.brand_kits drop constraint if exists brand_kits_logo_url_check;
alter table public.brand_kits drop constraint if exists brand_kits_primary_color_check;
alter table public.brand_kits drop constraint if exists brand_kits_secondary_color_check;
alter table public.brand_kits drop constraint if exists brand_kits_accent_color_check;
alter table public.brand_kits drop constraint if exists brand_kits_font_style_length_check;
alter table public.brand_kits drop constraint if exists brand_kits_brand_voice_length_check;

alter table public.brand_kits
  add constraint brand_kits_company_name_length_check check (char_length(company_name) <= 120),
  add constraint brand_kits_logo_url_check check (char_length(logo_url) <= 1000 and (logo_url = '' or logo_url ~ '^https://')),
  add constraint brand_kits_primary_color_check check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint brand_kits_secondary_color_check check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint brand_kits_accent_color_check check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint brand_kits_font_style_length_check check (char_length(font_style) <= 80),
  add constraint brand_kits_brand_voice_length_check check (char_length(brand_voice) <= 300);

drop policy if exists "brand kits select own" on public.brand_kits;
drop policy if exists "brand kits insert own" on public.brand_kits;
drop policy if exists "brand kits update own" on public.brand_kits;

create policy "brand kits select own" on public.brand_kits for select to authenticated using ((select auth.uid()) = user_id);
create policy "brand kits insert own" on public.brand_kits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "brand kits update own" on public.brand_kits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.brand_kits from anon;
revoke delete, truncate, references, trigger on public.brand_kits from authenticated;
grant select, insert, update on public.brand_kits to authenticated;
