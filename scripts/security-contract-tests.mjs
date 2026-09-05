import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));

const generate=read('app/api/generate/route.js');
const modify=read('app/api/modify/route.js');
const publish=read('app/api/apps/[id]/publish/route.js');
const quality=read('app/api/apps/[id]/quality/route.js');
const records=read('app/api/apps/[id]/records/route.js');
const database=read('app/api/apps/[id]/database/route.js');
const bootstrap=read('app/api/apps/[id]/bootstrap/route.js');
const workflowRun=read('app/api/apps/[id]/workflows/[workflowId]/run/route.js');
const checkout=read('app/api/apps/[id]/monetization/[offerId]/checkout/route.js');
const publishRequest=read('app/api/publish/request/route.js');
const storeApprove=read('app/api/store-metadata/approve/route.js');
const builderDomain=read('lib/cloud/builder-projects.js');
const builderAdapter=read('lib/cloud-adapters/builder-project-data.js');
const storePublishRpc=read('supabase/migrations/20260901135653_harden_store_publish_request_contract.sql');
const buyout=read('supabase/migrations/20260831031500_harden_has_active_buyout_rpc.sql');
const admin=read('lib/supabase/admin.js');
const finance=read('lib/app-builder-finance.js');
const serverRpc=read('supabase/migrations/20260831170000_server_only_entitlements_and_credits.sql');
const modifyRuntime=read('supabase/migrations/20260831181000_harden_professional_modify_runtime.sql');
const revokeLegacy=read('supabase/migrations/20260831171000_revoke_legacy_authenticated_financial_rpcs.sql');
const recordsMigration=read('supabase/migrations/20260831174000_add_app_data_records.sql');

// Legacy direct-provider routes still authenticate locally. Migrated Builder routes authenticate via a provider-opaque Cloud boundary.
for(const [name,source] of [
  ['publish',publish],['quality',quality],['records',records],['database',database],['bootstrap',bootstrap],
  ['workflow run',workflowRun],['checkout',checkout],['store approval',storeApprove],
]) assert.match(source,/auth\.getUser\(\)/,`${name} must authenticate with auth.getUser().`);

for(const [name,source] of [['generate',generate],['modify',modify],['publish request',publishRequest]]){
  assert.match(source,/lib\/cloud\/builder-projects\.js/,`${name} must cross the LANERIQ Cloud Builder Project boundary.`);
  assert.match(source,/getBuilderPrincipal\(\{requireVerified:true\}\)/,`${name} must require a verified Cloud principal.`);
  assert.doesNotMatch(source,/lib\/supabase\/|@supabase\//,`${name} must not directly import the current provider.`);
  assert.doesNotMatch(source,/createAdminClient|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/,`${name} must not hold provider admin credentials.`);
}
assert.match(builderDomain,/cloud-adapters\/builder-project-data\.js/);
assert.doesNotMatch(builderDomain,/lib\/supabase\/|@supabase\/|createAdminClient/,`Provider-opaque Builder domain must not import provider clients.`);
assert.match(builderAdapter,/\.\.\/supabase\/server\.js/);
assert.match(builderAdapter,/\.\.\/supabase\/admin\.js/);
assert.match(builderAdapter,/auth\.getUser\(\)/,'Builder compatibility adapter must validate server identity.');
assert.match(builderAdapter,/compatibilityVerified\(user\)/,'Builder principal must preserve compatibility verification as a bounded migration signal.');
assert.match(builderAdapter,/verified:\s*Boolean\(authoritativeVerified \|\| compatibilityVerified\(user\)\)/,'Builder principal must combine authoritative LANERIQ verification with compatibility verification without weakening the gate.');
assert.match(builderAdapter,/validateLaneriqSessionToken\(token\)/,'Builder must validate the LANERIQ primary session before accepting authoritative verification.');
assert.match(builderAdapter,/authority\?\.userId && authority\.userId !== data\.user\.id/,'LANERIQ and compatibility identities must never cross.');
assert.match(builderAdapter,/SESSION_IDENTITY_MISMATCH/,'Identity mismatch must fail closed.');
assert.match(builderAdapter,/if \(requireVerified && !principal\.verified\) return fail\("ACCOUNT_VERIFICATION_REQUIRED"\)/,'Genuinely unverified Builder principals must remain blocked.');

// Cloud adapter now owns the migrated route ownership/version/provider checks.
assert.match(builderAdapter,/\.eq\("owner_id", userId\)/,'Builder adapter must retain explicit owner isolation.');
assert.match(builderAdapter,/\.eq\("user_id", userId\)/,'User-owned Brand Kit/assets/account data must remain user scoped.');
assert.match(builderAdapter,/project\.current_version_id !== expectedVersionId/,'Modify must re-check the exact current version before privileged persistence.');
assert.match(builderAdapter,/project\.current_version_id !== versionId/,'Store metadata must remain current-version pinned.');
assert.match(builderAdapter,/server_persist_generated_project/,'Generate persistence RPC must be isolated behind the adapter.');
assert.match(builderAdapter,/server_save_app_modification/,'Modify persistence RPC must be isolated behind the adapter.');
assert.match(builderAdapter,/server_create_store_publish_request/,'Store publish request RPC must be isolated behind the adapter.');
assert.ok(builderAdapter.indexOf('resolvePrincipal(client, { requireVerified: true })') < builderAdapter.indexOf('admin.rpc("server_persist_generated_project"'),'Verified identity must be resolved before generated-project service-role persistence.');

assert.match(publish,/\.eq\(\s*["']owner_id["']\s*,\s*user\.id\s*\)/);
assert.match(quality,/\.eq\(\s*["']owner_id["']\s*,\s*user\.id\s*\)/);
assert.match(publish,/evaluateReleaseReadiness/);

// Durable app records: authenticate, bind project + row ownership, bound input, and conflict-safe updates.
assert.match(records,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(records,/\.eq\("owner_id",ctx\.user\.id\)/);
assert.match(records,/MAX_RECORDS\s*=\s*100/);
assert.match(records,/MAX_FIELDS\s*=\s*24/);
assert.match(records,/MAX_VALUE\s*=\s*2000/);
assert.match(records,/expectedUpdatedAt/);
assert.match(records,/status:expectedUpdatedAt\?409:404/);
assert.match(recordsMigration,/enable row level security/i);
assert.match(recordsMigration,/owner_id\s*=\s*\(select auth\.uid\(\)\)/i);

// No-code database: project ownership is checked before model reads/writes and credential-like fields are rejected.
assert.match(database,/function getOwnedApp[\s\S]*\.eq\("owner_id",\s*userId\)/);
assert.match(database,/SECRET_FIELD/);
assert.match(database,/SAFE_TYPES/);
assert.match(database,/owner_id:\s*user\.id/);
assert.match(database,/providerHidden:true/);

// Bootstrap: only the owner can attach modules/assets and every created child row is owner-bound.
assert.match(bootstrap,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(bootstrap,/\.eq\("id",app\.current_version_id\)\.eq\("app_id",id\)/);
for(const marker of ['app_backend_models','app_workflows','project_assets','video_projects'])assert.match(bootstrap,new RegExp(marker));
assert.match(bootstrap,/owner_id:user\.id/);
assert.match(bootstrap,/expectedVersionId/);

// Workflow execution: app + workflow + run history are all owner-scoped, replay-safe and bounded.
assert.match(workflowRun,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(workflowRun,/\.eq\("id",workflowId\)\.eq\("app_id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(workflowRun,/\.eq\("owner_id",user\.id\)\.eq\("workflow_id",workflowId\)\.eq\("idempotency_key",idempotencyKey\)/);
assert.match(workflowRun,/actions\.slice\(0,12\)/);
assert.match(workflowRun,/Workflow action timed out/);
assert.match(workflowRun,/safeFailureMessage/);

// Monetization checkout: authoritative owner-scoped offer data, secure redirect origin and owner-scoped tracking.
assert.match(checkout,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(checkout,/\.eq\("id",offerId\)\.eq\("app_id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(checkout,/url\.protocol!=="https:"/);
assert.match(checkout,/idempotencyKey=`checkout:\$\{user\.id\}:\$\{id\}:\$\{offer\.id\}:/);
assert.match(checkout,/owner_id:user\.id/);

// Store approval remains direct today; Publish Request is migrated and must keep the same exact-version chain inside the adapter.
assert.match(storeApprove,/\.eq\("id", listing\.app_id\)\.eq\("owner_id", user\.id\)/);
assert.match(storeApprove,/app\.current_version_id !== listing\.version_id/);
assert.ok(storeApprove.indexOf('.eq("owner_id", user.id)') < storeApprove.indexOf('createAdminClient()'),'Store approval must verify ownership before using admin client.');
assert.match(storeApprove,/\.eq\("app_id",app\.id\)\.eq\("version_id",app\.current_version_id\)/);

assert.match(publishRequest,/loadBuilderPublishPreparation/);
assert.match(publishRequest,/createBuilderStorePublishRequest/);
assert.match(publishRequest,/app\.current_version_id !== versionId/);
assert.match(publishRequest,/evaluateReleaseReadiness/);
assert.match(publishRequest,/officialSubmissionConfirmed:false/);
const publishBlock=builderAdapter.slice(builderAdapter.indexOf('async loadPublishPreparation'),builderAdapter.indexOf('async saveStoreListing'));
assert.match(publishBlock,/\.eq\("id", appId\)\.eq\("owner_id", userId\)/,'Publish adapter must bind the app to the current owner.');
assert.match(publishBlock,/\.eq\("id", versionId\)\.eq\("app_id", appId\)/,'Publish adapter must bind exact app/version.');
assert.match(publishBlock,/\.eq\("id", listingId\)\.eq\("app_id", appId\)/,'Publish adapter must bind listing to the same app.');
assert.ok(publishBlock.indexOf('resolvePrincipal') < publishBlock.indexOf('createAdminClient()'),'Publish adapter must authenticate before service-role escalation.');

assert.match(storePublishRpc,/security definer set search_path=''/);
assert.match(storePublishRpc,/where requested_by=uid and source_request_id=request_key for update/);
assert.match(storePublishRpc,/from public\.apps where id=p_app_id and owner_id=uid for update/);
assert.match(storePublishRpc,/current_version_id is distinct from p_version_id/);
assert.match(storePublishRpc,/from public\.store_listings where id=p_listing_id and app_id=p_app_id for update/);
assert.match(storePublishRpc,/listing_row\.version_id is distinct from p_version_id/);
assert.match(storePublishRpc,/listing_row\.customer_approved_at is null/);
assert.match(storePublishRpc,/source_request_id,metadata/);
assert.match(storePublishRpc,/officialSubmissionConfirmed',false/);
assert.match(storePublishRpc,/revoke all on function public\.server_create_store_publish_request\(uuid,uuid,uuid,uuid,text,text\) from public,anon,authenticated/);
assert.match(storePublishRpc,/grant execute on function public\.server_create_store_publish_request\(uuid,uuid,uuid,uuid,text,text\) to service_role/);

// Buyout RPC hardening.
assert.match(buyout,/to_regprocedure\('public\.has_active_buyout\(uuid,uuid\)'\)/);
assert.match(buyout,/alter function public\.has_active_buyout\(uuid, uuid\) rename to has_active_buyout_legacy/);
assert.match(buyout,/function public\.has_active_buyout\(p_app_id uuid\)/);
assert.match(buyout,/security invoker/);
assert.doesNotMatch(buyout,/function public\.has_active_buyout\(p_app_id uuid\)[\s\S]{0,120}security definer/);
assert.match(buyout,/drop function if exists public\.has_active_buyout_legacy\(uuid, uuid\)/);
assert.doesNotMatch(buyout,/grant execute on function public\.has_active_buyout(?:_legacy)?\(uuid, uuid\)/);

// Server-only finance and modification persistence.
assert.match(admin,/SUPABASE_SECRET_KEY\|\|process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
for(const name of ['server_consume_app_builder_entitlement','server_consume_ai_credits','server_refund_ai_credits','server_bind_app_builder_project_access','server_restore_failed_app_builder_create'])assert.match(finance,new RegExp(name));
for(const source of [generate,modify]){
  assert.match(source,/app-builder-finance/);
  assert.doesNotMatch(source,/\.rpc\(\s*["']consume_app_builder_entitlement["']/);
  assert.doesNotMatch(source,/\.rpc\(\s*["']consume_ai_credits["']/);
  assert.doesNotMatch(source,/\.rpc\(\s*["']refund_ai_credits["']/);
}
for(const name of ['server_consume_app_builder_entitlement','server_bind_app_builder_project_access','server_restore_failed_app_builder_create','server_consume_ai_credits','server_refund_ai_credits']){
  assert.match(serverRpc,new RegExp(`revoke all on function public\\.${name}`));
  assert.match(serverRpc,new RegExp(`grant execute on function public\\.${name}[^;]+ to service_role`));
}
assert.match(modify,/saveBuilderModification/);
assert.doesNotMatch(modify,/createAdminClient|server_save_app_modification/,'Modify route must not directly hold the privileged persistence implementation.');
const modifyBlock=builderAdapter.slice(builderAdapter.indexOf('async saveModification'),builderAdapter.indexOf('async loadPublishPreparation'));
assert.match(modifyBlock,/server_save_app_modification/);
assert.match(modifyBlock,/project\.current_version_id !== expectedVersionId/);
assert.ok(modifyBlock.indexOf('resolvePrincipal') < modifyBlock.indexOf('createAdminClient()'),'Modify adapter must authenticate and re-check ownership/version before service-role escalation.');
assert.match(modifyRuntime,/security definer/);
assert.match(modifyRuntime,/set search_path = ''/);
assert.match(modifyRuntime,/p_expected_version_id/);
assert.match(modifyRuntime,/source_request_id/);
assert.match(modifyRuntime,/revoke all on function public\.server_save_app_modification\(uuid,uuid,uuid,text,jsonb,text\)[\s\S]*from public, anon, authenticated/);
assert.match(modifyRuntime,/grant execute on function public\.server_save_app_modification\(uuid,uuid,uuid,text,jsonb,text\)[\s\S]*to service_role/);
for(const signature of ['consume_app_builder_entitlement\\(text,uuid,text\\)','bind_app_builder_project_access\\(uuid,text\\)','restore_failed_app_builder_create\\(text\\)','consume_ai_credits\\(numeric,text,text,jsonb\\)','refund_ai_credits\\(text,numeric,text,jsonb\\)'])assert.match(revokeLegacy,new RegExp(`revoke all on function public\\.${signature} from public,anon,authenticated`));

// No server credentials or non-public environment variables may appear in client components.
const forbidden=['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','VERCEL_TOKEN','OPENROUTER_API_KEY','GROQ_API_KEY','GEMINI_API_KEY','CLOUDFLARE_AI_API_TOKEN','STRIPE_SECRET_KEY','TWILIO_AUTH_TOKEN','RESEND_API_KEY'];
function filesUnder(dir){if(!exists(dir))return[];const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const rel=path.join(dir,entry.name);if(entry.isDirectory())out.push(...filesUnder(rel));else if(/\.(?:js|jsx|ts|tsx)$/.test(entry.name))out.push(rel)}return out;}
const clientFiles=filesUnder('app').filter(p=>/^\s*["']use client["'];/m.test(read(p))),leaked=[];
for(const file of clientFiles){const source=read(file);for(const name of forbidden)if(source.includes(name))leaked.push(`${file}: ${name}`);for(const m of source.matchAll(/process\.env\.([A-Z0-9_]+)/g))if(!m[1].startsWith('NEXT_PUBLIC_'))leaked.push(`${file}: non-public env ${m[1]}`)}
assert.deepEqual(leaked,[]);

console.log('✓ Migrated Builder routes are provider-opaque while Cloud adapter independently validates LANERIQ/compatibility identity, ownership and exact versions');
console.log('✓ Records, database and bootstrap are owner-scoped, bounded and conflict-safe');
console.log('✓ Workflow execution binds app/workflow/run ownership and is replay-safe');
console.log('✓ Checkout uses owner-scoped authoritative offers, HTTPS redirects and owner-scoped tracking');
console.log('✓ Store approval and Cloud publish requests verify owned exact-version chains before service-only atomic writes');
console.log('✓ Buyout migration is idempotent and SECURITY INVOKER');
console.log('✓ Entitlement, credit charge/refund and project binding use service-role-only RPCs');
console.log('✓ Professional AI modify persistence is Cloud-isolated, service-only, expected-version bound and replay safe');
console.log('✓ Legacy authenticated financial RPCs have a post-Preview revocation migration');
console.log(`✓ ${clientFiles.length} client component(s) scanned with no server-secret references`);
