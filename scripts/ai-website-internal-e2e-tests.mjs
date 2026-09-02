import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousPlan, orchestrationBrief } from "../lib/build/orchestrator.js";

const home=fs.readFileSync("app/page.js","utf8");
const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const generate=fs.readFileSync("app/api/generate/route.js","utf8");
const appPreview=fs.readFileSync("app/a/[id]/page.js","utf8");
const websitePreview=fs.readFileSync("app/website/[id]/page.js","utf8");
const publicRuntime=fs.readFileSync("lib/publishing/public-project-runtime.js","utf8");

const plan=buildAutonomousPlan({idea:"Create a premium multilingual property website with listings, enquiry forms and mobile-first navigation"});
assert.equal(plan.modules.website,true);
assert.ok(plan.selectedModules.includes("website"));
assert.ok(plan.selectedModules.includes("app"),"LANERIQ AI normal creation keeps App + Website as one coherent product foundation.");
assert.match(orchestrationBrief(plan),/website/i);

assert.match(engine,/For normal ideas build a functional App \+ Website/);
assert.match(engine,/real mobile-first product/);
assert.match(engine,/responsive companion Website\/store\/marketing experience/);
assert.match(engine,/platforms\":\[\"ios\",\"android\",\"web\"\]/);
assert.match(engine,/pages\":\[\{/);
assert.match(engine,/navigation\":\[\{/);
assert.match(engine,/requested app language must be the initial UI language/);

const planIndex=home.indexOf('fetch("/api/orchestrate"');
const generateIndex=home.indexOf('fetch("/api/generate"');
assert.ok(planIndex>0&&generateIndex>planIndex,"Website generation must pass Idea Planning before Generate.");

assert.match(generate,/buildInput/);
assert.match(generate,/runAutonomousEngine/);
assert.match(generate,/verifyGeneration/);
assert.match(generate,/\.from\("apps"\)\.insert/);
assert.match(generate,/\.from\("app_versions"\)\.insert/);
assert.match(generate,/current_version_id:version\.id/);
assert.match(generate,/App \+ Website/);

for(const source of [appPreview,websitePreview]){
  assert.match(source,/auth\.getUser\(\)/,"App and Website previews must resolve trusted owner identity.");
  assert.match(source,/loadVisibleProject\(\{id|loadVisibleProject\(\{ id/,"App and Website previews must use the shared visibility/current-version loader.");
  assert.match(source,/loadVisibleProjectMedia/);
  assert.match(source,/notFound\(\)/,"Hidden/missing projects must fail closed.");
}
assert.match(appPreview,/GeneratedAppClient/);
assert.match(appPreview,/appleWebApp/);
assert.match(websitePreview,/version\.specification/);
assert.match(websitePreview,/Customer Website/);
assert.match(websitePreview,/Created with LANERIQ AI/);

for(const pattern of [
  /current_version_id/,
  /if \(!isOwner && !isPublished\) return null/,
  /\.eq\("id", app\.current_version_id\)/,
  /\.eq\("app_id", app\.id\)/,
  /\.select\("id,version_no,specification"\)/,
]) assert.match(publicRuntime,pattern);
assert.doesNotMatch(appPreview,/\.from\("apps"\)|\.from\("app_versions"\)/);
assert.doesNotMatch(websitePreview,/\.from\("apps"\)|\.from\("app_versions"\)/);

console.log("✓ AI Website internal E2E locks mobile-first Website planning into the same verified Generate/save/version/App + Website Preview chain");
console.log("✓ Both previews resolve the authoritative current specification through the shared server-only owner/published visibility gate");
console.log("✓ Engine requires pages, navigation, responsive web behavior and switchable language rather than a text-only landing mockup");
console.log("✓ Real provider-generated Website output remains LIVE evidence and is not claimed by this deterministic code gate");
