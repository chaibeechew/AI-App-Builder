import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const foundation=read('supabase/migrations/20260826000000_ai_app_builder_foundation.sql');
const modifyRuntime=read('supabase/migrations/20260831181000_harden_professional_modify_runtime.sql');
const rollbackRuntime=read('supabase/migrations/20260901103843_harden_version_history_rollback.sql');
const rollbackRoute=read('app/api/apps/[id]/rollback/route.js');
const legacyRoute=read('app/api/apps/[id]/route.js');
const rollbackButton=read('app/app-dashboard/[id]/versions/VersionRollbackButton.js');
const historyPage=read('app/app-dashboard/[id]/versions/page.js');

// Version numbers are unique per project and modification persistence already locks the app row.
assert.match(foundation,/unique \(app_id, version_no\)/i);
assert.match(modifyRuntime,/server_save_app_modification/);
assert.match(modifyRuntime,/for update/);
assert.match(modifyRuntime,/p_expected_version_id/);
assert.match(modifyRuntime,/app_versions_app_request_unique/);

// Rollback is one database transaction: owner lock -> stale check -> append version -> advance current pointer.
assert.match(rollbackRuntime,/server_rollback_app_version/);
assert.match(rollbackRuntime,/security definer/i);
assert.match(rollbackRuntime,/set search_path = ''/);
assert.match(rollbackRuntime,/where a\.id = p_app_id and a\.owner_id = p_user_id[\s\S]*for update/);
assert.match(rollbackRuntime,/request_key text := 'rollback:'/);
assert.match(rollbackRuntime,/source_request_id = request_key/);
assert.match(rollbackRuntime,/current_version is distinct from p_expected_current_version_id/);
assert.match(rollbackRuntime,/Project changed during rollback\. Refresh and retry\./);
assert.match(rollbackRuntime,/insert into public\.app_versions\([\s\S]*source_request_id/);
assert.match(rollbackRuntime,/update public\.apps[\s\S]*current_version_id = new_version\.id/);
assert.match(rollbackRuntime,/exception when unique_violation/);
assert.match(rollbackRuntime,/replayed', true/);
assert.match(rollbackRuntime,/replayed', false/);
assert.match(rollbackRuntime,/revoke all on function public\.server_rollback_app_version\(uuid,uuid,uuid,uuid,text\)[\s\S]*from public, anon, authenticated/);
assert.match(rollbackRuntime,/grant execute on function public\.server_rollback_app_version\(uuid,uuid,uuid,uuid,text\)[\s\S]*to service_role/);

// HTTP route verifies the authenticated owner before invoking the service-only atomic RPC.
assert.match(rollbackRoute,/auth\.getUser\(\)/);
assert.match(rollbackRoute,/\.eq\("owner_id", user\.id\)/);
assert.match(rollbackRoute,/expectedCurrentVersionId/);
assert.match(rollbackRoute,/requestId/);
assert.match(rollbackRoute,/STALE_VERSION/);
assert.match(rollbackRoute,/createAdminClient\(\)/);
assert.match(rollbackRoute,/admin\.rpc\("server_rollback_app_version"/);
assert.ok(rollbackRoute.indexOf('.eq("owner_id", user.id)') < rollbackRoute.indexOf('createAdminClient()'),'Ownership must be checked before the admin client is used.');
assert.doesNotMatch(rollbackRoute,/\.from\("app_versions"\)[\s\S]{0,300}\.insert\(/);
assert.doesNotMatch(rollbackRoute,/\.from\("apps"\)[\s\S]{0,300}\.update\(/);

// The historical direct-pointer rollback endpoint is disabled so history cannot be bypassed.
assert.match(legacyRoute,/LEGACY_ROLLBACK_DISABLED/);
assert.match(legacyRoute,/status: 410/);
assert.doesNotMatch(legacyRoute,/current_version_id:\s*version\.id/);

// UI sends the exact version it believes is current plus a replay-safe request id.
assert.match(rollbackButton,/expectedCurrentVersionId/);
assert.match(rollbackButton,/requestId: rollbackRequestId/);
assert.match(rollbackButton,/crypto\?\.randomUUID/);
assert.match(rollbackButton,/setRequestId\(rollbackRequestId\)/);
assert.match(rollbackButton,/response\.status === 409/);
assert.match(historyPage,/expectedCurrentVersionId=\{app\.current_version_id\}/);
assert.match(historyPage,/creates a new version instead of deleting history/i);
assert.match(historyPage,/stale rollback attempts are blocked/i);

console.log('✓ Version numbers remain unique and modification/rollback writers serialize on the project row');
console.log('✓ Rollback is atomic, owner-bound, stale-version protected and replay safe');
console.log('✓ Rollback always appends a new version before advancing the current pointer');
console.log('✓ Legacy direct-pointer rollback is disabled');
console.log('✓ Version History UI supplies expected-current and stable request identity');
