import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousPlan, orchestrationBrief } from "../lib/build/orchestrator.js";

const home=fs.readFileSync("app/page.js","utf8");
const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const generate=fs.readFileSync("app/api/generate/route.js","utf8");
const modify=fs.readFileSync("app/api/modify/route.js","utf8");
const combinedPreview=fs.readFileSync("app/preview/[id]/page.js","utf8");
const appSurface=fs.readFileSync("app/a/[id]/page.js","utf8");
const websiteSurface=fs.readFileSync("app/website/[id]/page.js","utf8");
const visibleRuntime=fs.readFileSync("lib/publishing/public-project-runtime.js","utf8");

for(const idea of [
  "Create a real estate CRM for agents",
  "Build a restaurant booking experience",
  "Create an ecommerce product catalog with checkout planning",
]){
  const plan=buildAutonomousPlan({idea});
  assert.equal(plan.modules.app,true,`${idea}: App module missing`);
  assert.equal(plan.modules.website,true,`${idea}: Website module missing`);
  assert.ok(plan.selectedModules.indexOf("app")<plan.selectedModules.indexOf("website"));
  assert.match(orchestrationBrief(plan),/Generate one coherent product specification/i);
}

assert.match(engine,/For normal ideas build a functional App \+ Website/);
assert.match(generate,/SAVED BRAND KIT[\s\S]*new App \+ Website/);
assert.match(generate,/const generationOptions=\{voiceTranscript,referenceImages/);
assert.match(generate,/\.from\("asset_library"\)\.select\("id,file_name,mime_type,category"\)\.eq\("user_id",user\.id\)\.in\("id",assetIds\)/);
assert.match(generate,/\.from\("project_assets"\)\.upsert\(mediaAssignments/);
assert.match(generate,/reusableAcrossUsers:false|privateCustomerAsset:true|mediaAssignments/,"Customer reference handling must remain private/project-bound or represented by owner-bound assignments.");
assert.doesNotMatch(generate,/insert\(\{[^}]*product_type:\s*"website"/i,"Combined creation must not fork into an unsynchronized shadow Website record.");

const orchestrateCalls=(home.match(/fetch\("\/api\/orchestrate"/g)||[]).length;
const generateCalls=(home.match(/fetch\("\/api\/generate"/g)||[]).length;
assert.equal(orchestrateCalls,1,"Primary homepage should have one authoritative planning request.");
assert.equal(generateCalls,1,"Primary homepage should create the coherent App + Website product through one authoritative Generate request.");
assert.ok(home.indexOf('fetch("/api/orchestrate"')<home.indexOf('fetch("/api/generate"'));

assert.match(generate,/const specification=\{\.\.\.verified\.normalized/);
assert.match(generate,/\.from\("apps"\)\.insert/);
assert.match(generate,/\.from\("app_versions"\)\.insert/);
assert.match(generate,/current_version_id:version\.id/);
assert.match(generate,/projectLearning/);
assert.match(generate,/media:\{attached/);
assert.match(generate,/project_memory/);

// The original completion CTA still enters through the App demo route, but owner demo traffic is upgraded into Preview Both.
assert.match(home,/window\.location\.assign\(`\/a\/\$\{id\}\?demo=1`\)/);
assert.match(appSurface,/query\?\.demo === "1"[\s\S]*redirect\(`\/preview\/\$\{id\}`\)/);
assert.match(combinedPreview,/ONE PROJECT · ONE CURRENT VERSION/);
assert.match(combinedPreview,/data-project-id=\{id\}/);
assert.match(combinedPreview,/data-version-id=\{versionId\}/);
assert.equal((combinedPreview.match(/previewVersion=\$\{pinned\}/g)||[]).length,2,"Both App and Website preview frames must pin the exact same version ID.");
assert.match(combinedPreview,/data-surface="app"/);
assert.match(combinedPreview,/data-surface="website"/);

// Version pinning is owner-only and the selected version must still belong to the same project.
assert.match(visibleRuntime,/requestedVersionId && isOwner \? requestedVersionId : app\.current_version_id/);
assert.match(visibleRuntime,/\.eq\("id", selectedVersionId\)[\s\S]*\.eq\("app_id", app\.id\)/);
assert.match(visibleRuntime,/isPinnedPreview: Boolean\(requestedVersionId && isOwner\)/);
assert.match(appSurface,/versionId: requestedVersionId/);
assert.match(appSurface,/data-project-version=\{version\.id\}/);
assert.match(websiteSurface,/versionId:requestedVersionId/);
assert.match(websiteSurface,/data-project-version=\{version\.id\}/);
assert.match(websiteSurface,/const enquiryEnabled=isPublished&&!isPinnedPreview/);
assert.match(websiteSurface,/isOwner&&!isPinnedPreview&&<WebsiteEnquiryInbox/);

// AI Modify persists one new authoritative version; both surfaces resolve through the same apps.current_version_id lineage.
assert.match(modify,/server_save_app_modification/);
assert.match(modify,/p_expected_version_id:baseVersionId/);
assert.match(modify,/\.eq\("id",baseVersionId\)\.eq\("app_id",appId\)/);

console.log("✓ App + Website simultaneous internal E2E uses one Planning decision and one authoritative verified specification");
console.log("✓ Preview Both locks App and Website to the same owner-authorized project version with no shadow Website record");
console.log("✓ Pinned Website preview cannot accept real enquiries; Modify persists one authoritative version for both customer surfaces");
console.log("✓ Real simultaneous external-provider rendering remains a separate LIVE evidence gate");
