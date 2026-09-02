import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const safetySource=read("lib/auth/session-safety.js");
const safety=await import(`data:text/javascript;base64,${Buffer.from(safetySource).toString("base64")}`);
const runtime=read("lib/publishing/public-project-runtime.js");
const appPage=read("app/a/[id]/page.js");
const websitePage=read("app/website/[id]/page.js");
const manifest=read("app/a/[id]/manifest.webmanifest/route.js");
const publishRoute=read("app/api/apps/[id]/publish/route.js");
const migration=read("supabase/migrations/20260902005140_harden_public_publish_anon_grants.sql");

const uuid="123e4567-e89b-42d3-a456-426614174000";
assert.equal(safety.isPublicPublishedRuntimePath(`/a/${uuid}`),true);
assert.equal(safety.isPublicPublishedRuntimePath(`/a/${uuid}/manifest.webmanifest`),true);
assert.equal(safety.isPublicPublishedRuntimePath(`/website/${uuid}`),true);
assert.equal(safety.isPublicAccountPath(`/a/${uuid}`),true);
assert.equal(safety.isPublicAccountPath(`/website/${uuid}`),true);
assert.equal(safety.isPublicPublishedRuntimePath(`/a/${uuid}/admin`),false,"Published App auth bypass must be exact/bounded, not a prefix wildcard.");
assert.equal(safety.isPublicPublishedRuntimePath(`/website/${uuid}/admin`),false,"Published Website auth bypass must be exact/bounded, not a prefix wildcard.");
assert.equal(safety.isPublicPublishedRuntimePath("/a/not-a-uuid"),false);
assert.equal(safety.isPublicPublishedRuntimePath("/website/not-a-uuid"),false);
assert.equal(safety.isPublicAccountPath(`/api/apps/${uuid}`),false,"Publishing must never make project APIs public.");
assert.equal(safety.isPublicAccountPath(`/app-dashboard/${uuid}`),false,"Publishing must never make owner dashboards public.");

for(const pattern of [
  /createAdminClient/,
  /PUBLIC_VISIBILITY = new Set\(\["listed", "public"\]\)/,
  /app\.publish_status === "published"/,
  /if \(!isOwner && !isPublished\) return null/,
  /\.eq\("id", app\.current_version_id\)/,
  /\.eq\("app_id", app\.id\)/,
  /createSignedUrl\(asset\.storage_path, 900\)/,
]) assert.match(runtime,pattern);
assert.doesNotMatch(runtime,/source_prompt|created_by|credit|email|phone/i,"Public runtime loader must not select account/source/financial fields.");

for(const source of [appPage,websitePage]){
  assert.match(source,/createClient/);
  assert.match(source,/supabase\.auth\.getUser\(\)/,"Owner preview must still use trusted session identity.");
  assert.match(source,/loadVisibleProject\(\{\s*id,\s*userId:/);
  assert.match(source,/loadVisibleProjectMedia/);
  assert.doesNotMatch(source,/supabase\.from\("apps"\)/,"Public render pages must not depend on anonymous Data API project reads.");
  assert.doesNotMatch(source,/supabase\.from\("app_versions"\)/,"Public render pages must not expose project specifications through anon RLS.");
}
assert.match(websitePage,/Created with LANERIQ AI/);
assert.doesNotMatch(websitePage,/AI BUILD APP & WEB/);

for(const pattern of [
  /loadVisibleProject/,
  /status: 404/,
  /private, no-store/,
  /isPublished \? "public, max-age=300" : "private, no-store, max-age=0"/,
]) assert.match(manifest,pattern);

assert.match(publishRoute,/path:`\/a\/\$\{id\}`/);
assert.match(publishRoute,/websitePath:`\/website\/\$\{id\}`/);
assert.match(publishRoute,/visibility:result\?\.visibility/);
assert.match(publishRoute,/publish_status:result\?\.publish_status/);

assert.match(migration,/revoke insert, update, delete on table public\.apps from anon/i);
assert.match(migration,/revoke insert, update, delete on table public\.app_versions from anon/i);
assert.doesNotMatch(migration,/create policy|grant select|grant insert|grant update|grant delete/i,"Public runtime hardening must not add anonymous row policies or grants.");

console.log("✓ Published App/Website routes bypass auth only for exact UUID runtime paths; owner APIs/dashboards remain protected");
console.log("✓ Public rendering uses server-only minimal-field reads and exact current-version loading instead of anonymous project RLS");
console.log("✓ Private/draft projects and manifests fail closed; published manifests use bounded public cache while owner previews stay no-store");
console.log("✓ Anonymous project-table writes are revoked without adding public Data API policies or grants");
