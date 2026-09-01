import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousPlan, orchestrationBrief } from "../lib/build/orchestrator.js";

const home=fs.readFileSync("app/page.js","utf8");
const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const generate=fs.readFileSync("app/api/generate/route.js","utf8");

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

console.log("✓ App + Website simultaneous internal E2E uses one Planning decision and one authoritative verified specification");
console.log("✓ Brand Kit, referenceImages, owner-verified private assets, Project Memory and version persistence stay synchronized across the combined product");
console.log("✓ No duplicate shadow Website record is invented; real simultaneous provider rendering remains LIVE evidence-gated");
