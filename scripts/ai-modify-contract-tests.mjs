import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const modify=read('app/api/modify/route.js');
const builderDomain=read('lib/cloud/builder-projects.js');
const builderAdapter=read('lib/cloud-adapters/builder-project-data.js');
const precise=read('app/components/PreciseEditAssistant.js');
const proAssistant=read('app/pro/[id]/ProAssistant.js');
const proPage=read('app/pro/[id]/page.js');
const runtime=read('supabase/migrations/20260831181000_harden_professional_modify_runtime.sql');
const memory=read('lib/project-memory.js');

// Request identity and ownership are mandatory; arbitrary unsaved client specs are not a supported persistence path.
assert.match(modify,/A saved project is required for AI Modify/);
assert.match(modify,/A stable modification request ID is required/);
assert.match(modify,/REQUEST_ID_PATTERN/);
assert.doesNotMatch(modify,/clientSpecification/);
assert.match(modify,/getBuilderPrincipal\(\{requireVerified:true\}\)/);
assert.match(modify,/loadBuilderModificationContext/);
assert.doesNotMatch(modify,/lib\/supabase\/|@supabase\/|createAdminClient/);
assert.match(builderAdapter,/auth\.getUser\(\)/);
assert.match(builderAdapter,/\.eq\("id", appId\)\.eq\("owner_id", userId\)/);

// Full-request replay safety: Cloud context returns the exact saved specification before AI/credits on retry.
assert.match(builderAdapter,/source_request_id/);
assert.match(modify,/replayPayload/);
assert.match(builderAdapter,/\.eq\("created_by", userId\)/);
const replayCheck=modify.indexOf('const context=await loadBuilderModificationContext');
const financeStart=modify.indexOf('const entitlement=await consumeAppBuilderEntitlement');
const aiStart=modify.indexOf('const ai=await withTimeout(generateWithFallback(prompt)');
assert.ok(replayCheck>0&&financeStart>0&&aiStart>0&&replayCheck<financeStart&&replayCheck<aiStart,'Cloud replay/context lookup must happen before finance and AI execution.');
assert.match(modify,/if\(replayVersion\?\.specification\)return NextResponse\.json\(replayPayload/);
assert.match(modify,/if\(save\.replayed\)/);
assert.match(modify,/Saved replay version could not be loaded safely/);
assert.match(modify,/persisted\.specification/);

// Precise/stale edits are version-bound before credit/AI work begins; adapter re-checks before service-role persistence.
assert.match(modify,/expectedVersionId/);
assert.match(modify,/expectedVersionId!==owned\.current_version_id/);
assert.match(modify,/changed after the editor loaded/);
const staleCheck=modify.indexOf('expectedVersionId&&expectedVersionId!==owned.current_version_id');
assert.ok(staleCheck>0&&staleCheck<financeStart&&staleCheck<aiStart,'Stale editor protection must run before finance and AI.');
assert.match(modify,/baseVersionId=owned\.current_version_id/);
const modifySaveBlock=builderAdapter.slice(builderAdapter.indexOf('async saveModification'),builderAdapter.indexOf('async loadPublishPreparation'));
assert.match(modifySaveBlock,/project\.current_version_id !== expectedVersionId/);
assert.match(modifySaveBlock,/\.eq\("id", version\.id\)\.eq\("app_id", appId\)/);

// AI work is bounded and must not reduce deterministic project quality.
assert.match(modify,/PRIMARY_AI_TIMEOUT_MS/);
assert.match(modify,/REPAIR_AI_TIMEOUT_MS/);
assert.match(modify,/Primary AI modification/);
assert.match(modify,/AI quality repair/);
assert.match(modify,/AI self-heal/);
assert.match(modify,/function qualityRegressed/);
assert.match(modify,/Number\(after\.overall\|\|0\)<Number\(before\.overall\|\|0\)/);
assert.match(modify,/some\(x=>Number\(x\.score\|\|0\)<Number\(oldMap\[x\.id\]\|\|0\)\)/);
assert.match(modify,/if\(qualityRegressed\(currentQuality,repaired\.quality\)\)throw new Error/);
assert.match(modify,/if\(!healed\.selfHeal\.passed\)throw new Error/);
assert.match(modify,/if\(qualityRegressed\(currentQuality,healed\.quality\)\)throw new Error/);

// Project Memory and current saved version are the authoritative modification context.
assert.match(modify,/buildProjectMemoryBrief\(memoryRow\)/);
assert.match(modify,/memoryBrief\?`/);
assert.match(modify,/Preserve existing functionality and remembered project preferences/);
assert.match(modify,/Never reuse private assets across customers/);
assert.match(modify,/mergeProjectMemory/);
assert.match(builderAdapter,/\.from\("project_memory"\)/);
assert.match(memory,/rawPrivateAssetsReusableAcrossCustomers:false/);

// Persistence is Cloud-isolated, atomic, append-only, expected-version bound, request-idempotent and service-only.
assert.match(modify,/saveBuilderModification/);
assert.match(builderDomain,/saveBuilderModification/);
assert.doesNotMatch(builderDomain,/lib\/supabase\/|@supabase\/|createAdminClient/);
assert.match(modifySaveBlock,/const admin = createAdminClient\(\)/);
assert.match(modifySaveBlock,/server_save_app_modification/);
assert.match(modifySaveBlock,/p_expected_version_id: expectedVersionId/);
assert.match(modifySaveBlock,/p_request_id: requestId/);
assert.ok(modifySaveBlock.indexOf('resolvePrincipal')<modifySaveBlock.indexOf('createAdminClient()'),'Cloud adapter must authenticate and re-check ownership/version before privileged persistence.');
assert.match(runtime,/create unique index if not exists app_versions_app_request_unique/);
assert.match(runtime,/for update/i);
assert.match(runtime,/current_version is distinct from p_expected_version_id/);
assert.match(runtime,/source_request_id = request_key/);
assert.match(runtime,/replayed', true/);
assert.match(runtime,/insert into public\.app_versions/);
assert.match(runtime,/current_version_id = new_version\.id/);
assert.match(runtime,/revoke all on function public\.server_save_app_modification[\s\S]*from public, anon, authenticated/);
assert.match(runtime,/grant execute on function public\.server_save_app_modification[\s\S]*to service_role/);

// Failed paid modifications refund through the same request-bound financial runtime.
assert.match(modify,/refundAiCredits/);
assert.match(modify,/if\(charged&&chargeRequestId&&userId\)/);
assert.match(modify,/AI modification failed - automatic refund/);
assert.match(modify,/status:504/);
assert.match(modify,/No new version was accepted/);

// Both customer Modify surfaces keep one request ID across retry and bind the loaded version.
assert.match(precise,/pendingOperationRef=useRef\(null\)/);
assert.match(precise,/expectedVersionId:versionId/);
assert.match(precise,/pendingOperationRef\.current\.id/);
assert.match(precise,/Recovered the already-saved precise edit without applying it twice/);
assert.doesNotMatch(precise,/specification:spec/);
assert.match(proAssistant,/pendingOperationRef = useRef\(null\)/);
assert.match(proAssistant,/expectedVersionRef = useRef\(currentVersionId\|\|""\)/);
assert.match(proAssistant,/expectedVersionId:expectedVersionRef\.current/);
assert.match(proAssistant,/pendingOperationRef\.current\.id/);
assert.match(proAssistant,/same request ID will safely recover/);
assert.match(proPage,/currentVersionId=\{current\.id\}/);

console.log('✓ AI Modify requires a saved Cloud-owned project and a stable request identity');
console.log('✓ Cloud replay returns the exact persisted specification before AI or charging');
console.log('✓ Precise and Pro edits are expected-version bound and adapter re-checks version before privileged persistence');
console.log('✓ Quality regression and structural self-heal failures cannot be persisted');
console.log('✓ Cloud-isolated service-only persistence appends one replay-safe version and protects concurrent edits');
console.log('✓ Paid failures refund safely and customer retry surfaces reuse the same operation identity');
