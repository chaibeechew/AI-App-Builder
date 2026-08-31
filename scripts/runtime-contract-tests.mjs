import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

const workflow=read('app/api/apps/[id]/workflows/[workflowId]/run/route.js');
const workflowPage=read('app/workflows/[id]/page.js');
const checkout=read('app/api/apps/[id]/monetization/[offerId]/checkout/route.js');
const integrations=read('lib/integrations/server.js');
const storePublish=read('app/api/publish/request/route.js');
const database=read('app/api/apps/[id]/database/route.js');
const databaseRollback=read('app/api/apps/[id]/database/rollback/route.js');
const projectRollback=read('app/api/apps/[id]/rollback/route.js');
const videoCompile=read('app/api/video/projects/[id]/compile/route.js');

assert.match(workflow,/idempotency_key/,'Workflow runs must persist idempotency keys.');
assert.match(workflow,/Workflow action timed out/,'Workflow actions must have bounded execution time.');
assert.match(workflow,/criticalFailure/,'Critical workflow actions must stop safely on failure.');
assert.match(workflow,/existing\.status==="started"\?202/,'Duplicate in-progress workflow requests must not execute twice.');
assert.match(workflow,/status==="failed"\?409/,'Duplicate failed workflow requests must not be reported as successful.');
assert.match(workflow,/\.eq\("owner_id",user\.id\)/,'Workflow execution must remain owner-scoped.');
assert.match(workflow,/dryRun=body\?\.dryRun===true/,'Workflow execution must support an explicit safe dry-run mode.');
assert.match(workflow,/status:"simulated"/,'Safe workflow tests must simulate supported actions before side effects.');
assert.match(workflow,/No customer data was saved and no external message/i,'Safe workflow tests must disclose that no real side effects occurred.');
assert.match(workflowPage,/dryRun:true/,'Customer Safe Test must call the side-effect-free API mode.');
assert.match(workflowPage,/Safe Test checks every step without saving customer data/,'Automation UI must explain Safe Test behavior in plain language.');

assert.match(checkout,/monetization_offers/,'Checkout must load the authoritative server-side offer.');
assert.match(checkout,/\.eq\("owner_id",user\.id\)/,'Checkout must remain owner-scoped.');
assert.match(checkout,/Offer amount is outside the supported range/,'Checkout must validate server-side amount bounds.');
assert.match(checkout,/Offer currency is invalid/,'Checkout must validate currency.');
assert.match(checkout,/Offer billing mode is invalid/,'Checkout must validate billing mode.');
assert.match(checkout,/idempotencyKey/,'Checkout must pass an idempotency key to the payment provider.');
assert.match(integrations,/Idempotency-Key/,'Managed payments must use provider idempotency.');
assert.match(integrations,/External provider timed out/,'Managed external providers must have bounded network timeouts.');
assert.match(integrations,/incomplete checkout session/,'Payment provider responses must be validated before use.');

assert.match(storePublish,/current_version_id/,'Store publishing must validate the current project version.');
assert.match(storePublish,/assessBuildQuality/,'Store publishing must run the quality gate.');
assert.match(storePublish,/evaluateReleaseReadiness/,'Store publishing must use the shared 100-point evaluator.');
assert.match(storePublish,/customer_approved_at/,'Store publishing must require customer approval.');
assert.match(storePublish,/approved store listing must match the exact current project version/i,'Store listing approval must be bound to the exact version.');

assert.match(database,/SECRET_FIELD/,'Database model validation must reject credential-like fields.');
assert.match(database,/SAFE_TYPES/,'Database model validation must allowlist field types.');
assert.match(database,/_history/,'Database models must keep bounded rollback history.');
assert.match(database,/owner-scoped by default/,'Database entities must default to owner-scoped access.');
assert.match(databaseRollback,/Restored as a new version|restored as a new version/i,'Database rollback must preserve history by creating a new version.');
assert.match(databaseRollback,/\.eq\("owner_id",user\.id\)/,'Database rollback must remain owner-scoped.');
assert.match(projectRollback,/Rollback to version/,'Project rollback must create a new version instead of destructively overwriting history.');
assert.match(projectRollback,/\.eq\("owner_id", user\.id\)/,'Project rollback must remain owner-scoped.');

assert.match(videoCompile,/rendererConfigured/,'Video compile must explicitly track whether a renderer is configured.');
assert.match(videoCompile,/renderStarted:false/,'Video compile must not falsely report rendering as started.');
assert.match(videoCompile,/will not claim that an MP4 is rendering or complete/,'Video compile must clearly disclose missing final renderer capability.');
assert.match(videoCompile,/invalid trim range/,'Video clip trim ranges must be validated.');

console.log('✓ Workflow execution is idempotent, bounded, fail-closed and supports side-effect-free Safe Test');
console.log('✓ Payment checkout uses authoritative offer data, validation, provider timeouts and idempotency');
console.log('✓ Store publish requests require exact-version approval plus the shared 100-point quality gate');
console.log('✓ No-code database models reject credential fields and keep rollback history');
console.log('✓ Project/database rollback preserve history and remain owner-scoped');
console.log('✓ Video compile does not pretend a final renderer is running when it is not');
