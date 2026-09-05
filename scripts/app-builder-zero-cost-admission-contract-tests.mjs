import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const helper=read("lib/ai/app-builder-admission.js");
const engine=read("engine/autonomous-engine.js");
const modify=read("app/api/modify/route.js");
const admission=read("lib/ai/zero-cost-admitted-generation.js");

assert.match(helper,/generateWithZeroCostAdmission/);
assert.match(helper,/`user:\$\{resolvedUserId\}:app-builder`/);
assert.match(helper,/`user:\$\{resolvedUserId\}:project:\$\{String\(projectId\)\}`/);
assert.match(helper,/reuseClass:"private_result"/);
assert.match(helper,/allowApproximateReuse:false/);
assert.match(helper,/paidFallbackAllowed:false/);
assert.match(helper,/reuseAllowed:Boolean\(scope&&reuseAllowed\)/);
assert.match(helper,/reuseVariant:variant/);
assert.match(helper,/baseVersionBoundModifyReuse:true/);
assert.match(helper,/crossUserPrivateReuseAllowed:false/);
assert.match(helper,/unauthenticatedReuseAllowed:false/);

assert.match(engine,/generateAppBuilderWithAdmission/);
assert.doesNotMatch(engine,/generateWithFallback/);
assert.match(engine,/stage:options\.admissionStage\|\|"generation"/);
assert.match(engine,/attachmentCount:referenceImages\.length/);
assert.match(engine,/computeAdmission:/);

assert.match(modify,/generateAppBuilderWithAdmission/);
assert.doesNotMatch(modify,/generateWithFallback/);
assert.match(modify,/projectId:appId/);
assert.match(modify,/baseVersionId/);
assert.match(modify,/stage:"modify"/);
assert.match(modify,/stage:"quality-repair"/);
assert.match(modify,/stage:"self-heal"/);
assert.match(modify,/runBuilderAi\(prompt,\{userId,appId,stage:"modify",baseVersionId\}\)/);
assert.match(modify,/runBuilderAi\(repairPrompt,\{userId,appId,stage:"quality-repair",baseVersionId\}\)/);
assert.match(modify,/runBuilderAi\(selfHealPrompt,\{userId,appId,stage:"self-heal",baseVersionId\}\)/);

assert.match(admission,/if \(providers\.local\.length\) executed = await executeProviders\(raw, providers\.local\)/);
assert.match(admission,/costMode === "free" && providers\.verifiedFree\.length/);
assert.match(admission,/paidFallbackAllowed && providers\.remote\.length/);

console.log("✓ App Builder generation is routed through LANERIQ Zero-Cost Admission instead of direct Provider Router execution");
console.log("✓ Modify, quality repair and self-heal use user/project-scoped exact private reuse bound to the base version");
console.log("✓ App Builder zero/free execution keeps paid fallback disabled and local capacity ahead of verified free remote capacity");
console.log("✓ Unauthenticated and cross-user private-result reuse remain disabled");
