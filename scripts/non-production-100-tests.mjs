import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p),'utf8'):'';
const exists=(p)=>fs.existsSync(path.join(root,p));

const readiness=read('lib/non-production-readiness.js');
const dashboard=read('app/app-dashboard/[id]/page.js');
const pro=read('app/pro/[id]/page.js');
const proAssistant=read('app/pro/[id]/ProAssistant.js');
const publish=read('app/publish/[id]/page.js');
const metadata=read('app/api/store-metadata/route.js');
const metadataSave=read('app/api/store-metadata/save/route.js');
const publishingAgent=read('app/api/apps/[id]/publishing-agent/route.js');
const editor=read('app/editor/[id]/page.js');
const workflow=read('app/api/apps/[id]/workflows/[workflowId]/run/route.js');
const database=read('app/api/apps/[id]/database/route.js');
const checkout=read('app/api/apps/[id]/monetization/[offerId]/checkout/route.js');
const video=read('app/api/video/projects/[id]/compile/route.js');
const policy=read('config/product-policy.js');

assert.match(readiness,/NON_PRODUCTION_SCORE_REQUIRED = 100/,'Non-production readiness must require 100.');
for(const key of ['generation','editing','data','automation','publishing','security','reliability','visual','versioning','pro']) assert.match(readiness,new RegExp(`key: "${key}"`),`Missing readiness area: ${key}`);
assert.match(readiness,/productionHeld: true/,'Production must remain explicitly held in this readiness model.');
assert.match(readiness,/score === 100/,'Every readiness area must require a perfect score.');
assert.match(policy,/productionPromotionHold: true/,'Platform Production promotion must remain held.');
assert.match(policy,/explicitApprovalRequiredBeforeProduction: true/,'Production must require explicit approval before promotion.');

assert.ok(exists('app/pro/[id]/page.js')&&exists('app/pro/[id]/ProAssistant.js'),'Professional Mode workspace must exist.');
assert.match(proAssistant,/\/api\/modify/,'Professional Mode AI assistant must route natural-language changes through versioned AI modify.');
assert.match(proAssistant,/requestId/,'Professional Mode changes must carry a request id for safe retries.');
assert.match(editor,/Version History & Rollback/,'No-code editor must preserve undo/rollback access.');
assert.match(editor,/TARGET: whole App \+ Website|TARGET PAGE/,'No-code editor must support scoped natural-language changes.');

assert.match(metadata,/customerAnswers/,'Store metadata assistant must use customer truth inputs.');
assert.match(metadata,/privacyPolicyUrl/,'Publishing assistant must support privacy policy metadata.');
assert.match(metadata,/targetAudience/,'Publishing assistant must support target audience metadata.');
assert.match(publish,/AI Auto-Fill Store Forms/,'Publishing UI must expose AI auto-fill.');
assert.match(publish,/AI PUBLISHING AGENT/,'Publishing UI must expose the readiness agent.');
assert.match(publish,/publish-answers:/,'Key publishing answers must survive a same-device refresh without adding secret storage.');
assert.match(publish,/style jsx global/,'Child publishing controls must receive their intended styles instead of silently losing scoped CSS.');
assert.match(publish,/Apple Developer Program/,'Publishing UI must separate Apple external fees.');
assert.match(publish,/Google Play/,'Publishing UI must separate Google external fees.');
assert.match(publishingAgent,/readyForReview/,'Publishing Agent must compute review readiness.');
assert.match(publishingAgent,/readyForOfficialSubmission: false/,'Publishing Agent must not pretend store submission is complete.');
assert.match(publishingAgent,/needsCustomer/,'Publishing Agent must separate customer-only declarations from AI-filled fields.');
assert.match(metadataSave,/customer_approved_at: null/,'Any listing metadata change must reset stale customer approval.');
assert.match(metadataSave,/current project version/,'Store metadata must be limited to the current project version.');

assert.match(workflow,/idempotencyKey/,'Workflow execution must support idempotency.');
assert.match(workflow,/status:"failed"/,'Workflow execution must record catastrophic failures.');
assert.match(database,/No API keys, passwords or payment credentials/,'Database builder must prohibit credentials in generated business tables.');
assert.match(checkout,/idempotencyKey/,'Checkout creation must support idempotency.');
assert.match(checkout,/Offer amount is outside the supported range/,'Checkout must validate server-side offer amounts.');
assert.match(video,/serverRender:true/,'Video compile must keep heavy final rendering server-side.');
assert.match(video,/renderStarted:false/,'Video Studio must not claim final rendering has started before a worker claims the job.');

const dashboardHasPro=/\/pro\/\$\{id\}|\/pro\//.test(dashboard);
assert.equal(dashboardHasPro,true,'Project dashboard must expose Professional Mode without requiring a hidden URL.');
assert.match(pro,/Advanced control with AI assistance|Professional Workspace/,'Professional Mode must explain its AI-assisted control model.');

console.log('✓ Non-production 100-point contract is explicit and Production remains held');
console.log('✓ AI editing, Pro Mode and rollback paths are present');
console.log('✓ Publishing Agent separates AI-filled data, customer truth and external store actions');
console.log('✓ Changed store metadata invalidates stale customer approval');
console.log('✓ Workflow, database, payment and video reliability contracts are present');
console.log('✓ Professional Mode is reachable from the project dashboard');
