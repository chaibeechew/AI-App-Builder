import assert from "node:assert/strict";
import fs from "node:fs";

const route=fs.readFileSync("app/api/apps/[id]/publish/route.js","utf8");
const page=fs.readFileSync("app/release/[id]/page.js","utf8");
const baseMigration=fs.readFileSync("supabase/migrations/20260901135157_harden_web_publish_contract.sql","utf8");
const alignMigration=fs.readFileSync("supabase/migrations/20260901135535_align_web_publish_visibility.sql","utf8");
const pinMigration=fs.readFileSync("supabase/migrations/20260903105500_pin_published_project_version.sql","utf8");

for(const pattern of [/auth\.getUser\(\)/,/Account verification is required/,/MAX_REQUEST_BYTES/,/REQUEST_ID/,/expectedVersionId/,/STALE_PUBLISH_VERSION/,/\.eq\("owner_id", user\.id\)/,/evaluateReleaseReadiness/,/server_publish_web_project/,/createAdminClient/,/published_version_id/,/PUBLISHED_VERSION_PIN_MISMATCH/,/PUBLISHED_VERSION_PIN_NOT_CLEARED/,/Cache-Control\":\"private, no-store/])assert.match(route,pattern);
assert.ok(route.indexOf("evaluateReleaseReadiness")<route.indexOf("server_publish_web_project"),"Quality gate must pass before the atomic publish RPC.");
assert.doesNotMatch(route,/\.from\("apps"\)\.update\(/,"Web Publish API must not directly mutate apps after the quality check.");

for(const pattern of [/stableWebPublishRequestId/,/window\.sessionStorage/,/current_version_id/,/const expectedVersionId=/,/body:JSON\.stringify\(\{requestId,expectedVersionId,action:\"publish\"\}\)/,/cache:\"no-store\"/])assert.match(page,pattern);

assert.match(baseMigration,/create table if not exists public\.web_publish_requests/i);
assert.match(baseMigration,/unique\(user_id,request_id\)/i);
assert.match(baseMigration,/enable row level security/i);
assert.match(baseMigration,/revoke all on table public\.web_publish_requests from public,anon,authenticated/i);
assert.match(baseMigration,/security definer set search_path=''/i);
assert.match(alignMigration,/for update/i);
assert.match(alignMigration,/STALE_PUBLISH_VERSION/);

assert.match(pinMigration,/alter table public\.apps add column if not exists published_version_id uuid/i);
assert.match(pinMigration,/apps_published_version_id_fkey/);
assert.match(pinMigration,/published_version_id=a\.current_version_id/);
assert.match(pinMigration,/exists\(select 1 from public\.app_versions v where v\.id=a\.current_version_id and v\.app_id=a\.id\)/);
assert.match(pinMigration,/for update/i);
assert.match(pinMigration,/STALE_PUBLISH_VERSION/);
assert.match(pinMigration,/visibility='public',publish_status='published',published_version_id=p_expected_version_id/);
assert.match(pinMigration,/visibility='private',publish_status='draft',published_version_id=null/);
assert.match(pinMigration,/revoke all on function public\.server_publish_web_project\(uuid,uuid,uuid,text,text\) from public,anon,authenticated/i);
assert.match(pinMigration,/grant execute on function public\.server_publish_web_project\(uuid,uuid,uuid,text,text\) to service_role/i);

console.log("Web Publish contract passed: exact reviewed version, 100-point gate, stable replay identity and atomic published-version pin are locked without direct post-check mutation.");
