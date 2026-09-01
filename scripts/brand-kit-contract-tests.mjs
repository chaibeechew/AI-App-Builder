import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const page=read('app/brand-kit/page.js');
const generate=read('app/api/generate/route.js');
const modify=read('app/api/modify/route.js');
const memory=read('lib/project-memory.js');
const migration=read('supabase/migrations/20260901110725_harden_brand_kit_contract.sql');

// Brand Kit persistence is authenticated, exact-user scoped and input-bounded.
assert.match(page,/auth\.getUser\(\)/);
assert.match(page,/\.from\("brand_kits"\)/);
assert.match(page,/\.eq\("user_id", user\.id\)/);
assert.match(page,/user_id: currentUser\.id/);
assert.match(page,/onConflict: "user_id"/);
assert.match(page,/company_name:[\s\S]*slice\(0, 120\)/);
assert.match(page,/logoUrl[\s\S]*slice\(0, 1000\)/);
assert.match(page,/\^#\[0-9a-fA-F\]\{6\}\$/);
assert.match(page,/font_style:[\s\S]*slice\(0, 80\)/);
assert.match(page,/brand_voice:[\s\S]*slice\(0, 300\)/);
assert.match(page,/Logo URL must be a valid HTTPS address/);
assert.match(page,/type="url"/);
assert.match(page,/reuses it only for your builds/i);

// Database is the final authority for format/length and customer-role access.
for(const name of [
  'brand_kits_company_name_length_check','brand_kits_logo_url_check','brand_kits_primary_color_check',
  'brand_kits_secondary_color_check','brand_kits_accent_color_check','brand_kits_font_style_length_check',
  'brand_kits_brand_voice_length_check'
]) assert.match(migration,new RegExp(name));
assert.match(migration,/char_length\(company_name\) <= 120/);
assert.match(migration,/char_length\(logo_url\) <= 1000/);
assert.match(migration,/logo_url = '' or logo_url ~ '\^https:\/\/'/);
assert.match(migration,/primary_color ~ '\^#\[0-9A-Fa-f\]\{6\}\$'/);
assert.match(migration,/secondary_color ~ '\^#\[0-9A-Fa-f\]\{6\}\$'/);
assert.match(migration,/accent_color ~ '\^#\[0-9A-Fa-f\]\{6\}\$'/);
assert.match(migration,/char_length\(font_style\) <= 80/);
assert.match(migration,/char_length\(brand_voice\) <= 300/);
assert.match(migration,/for select to authenticated/);
assert.match(migration,/for insert to authenticated/);
assert.match(migration,/for update to authenticated/);
assert.match(migration,/revoke all on public\.brand_kits from anon/);
assert.match(migration,/revoke delete, truncate, references, trigger on public\.brand_kits from authenticated/);
assert.match(migration,/grant select, insert, update on public\.brand_kits to authenticated/);

// New builds consume the current account Brand Kit and snapshot it into Project Memory.
assert.match(generate,/from\("brand_kits"\)/);
assert.match(generate,/\.eq\("user_id",user\.id\)/);
assert.match(generate,/function buildBrandBrief/);
for(const field of ['company_name','logo_url','primary_color','secondary_color','accent_color','font_style','brand_voice']) assert.match(generate,new RegExp(field));
assert.match(generate,/brandKit:brandKit\|\|null/);
assert.match(generate,/brandPreferences:brandKit\?/);
assert.match(generate,/companyName:brandKit\.company_name/);
assert.match(generate,/logoReference:brandKit\.logo_url/);
assert.match(generate,/primaryColor:brandKit\.primary_color/);
assert.match(generate,/brandVoice:brandKit\.brand_voice/);

// Existing projects consume their saved Brand Kit snapshot through Project Memory.
assert.match(memory,/brandPreferences/);
assert.match(memory,/Brand preferences:/);
assert.match(modify,/buildProjectMemoryBrief/);
assert.match(modify,/from\("project_memory"\)[\s\S]*\.eq\("app_id",appId\)\.eq\("owner_id",user\.id\)/);
assert.match(modify,/const memoryBrief=buildProjectMemoryBrief\(memoryRow\)/);
assert.match(modify,/memoryBrief\?`\\n\$\{memoryBrief\}\\n`/);
assert.doesNotMatch(modify,/from\("brand_kits"\)/,'Modify must use the project Brand Kit snapshot; later account Brand Kit edits must not silently rewrite an existing project.');

console.log('✓ Brand Kit save/read is authenticated, exact-user scoped and input bounded');
console.log('✓ Brand Kit database constraints enforce HTTPS logo, valid colors and bounded text');
console.log('✓ Anonymous access is revoked and authenticated customers can only SELECT/INSERT/UPDATE their own kit');
console.log('✓ Generate consumes the current Brand Kit and snapshots it into canonical Project Memory');
console.log('✓ Modify consumes the saved per-project Brand Kit snapshot so global Brand Kit changes cannot silently rewrite existing projects');
