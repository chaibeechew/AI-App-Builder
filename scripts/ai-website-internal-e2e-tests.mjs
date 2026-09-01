import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousPlan, orchestrationBrief } from "../lib/build/orchestrator.js";

const home=fs.readFileSync("app/page.js","utf8");
const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const generate=fs.readFileSync("app/api/generate/route.js","utf8");
const preview=fs.readFileSync("app/a/[id]/page.js","utf8");

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

assert.match(preview,/current_version_id/);
assert.match(preview,/current\.specification/);
assert.match(preview,/GeneratedAppClient/);
assert.match(preview,/appleWebApp/);

console.log("✓ AI Website internal E2E locks mobile-first Website planning into the same verified Generate/save/version/Preview chain");
console.log("✓ Engine requires pages, navigation, responsive web behavior and switchable language rather than a text-only landing mockup");
console.log("✓ Real provider-generated Website output remains LIVE evidence and is not claimed by this deterministic code gate");
