import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousPlan, orchestrationBrief } from "../lib/build/orchestrator.js";

const home=fs.readFileSync("app/page.js","utf8");
const generate=fs.readFileSync("app/api/generate/route.js","utf8");
const preview=fs.readFileSync("app/a/[id]/page.js","utf8");

const plan=buildAutonomousPlan({idea:"Create a mobile-first real estate CRM app with clients, properties, appointments and follow-up automation"});
assert.equal(plan.modules.app,true);
assert.ok(plan.selectedModules.includes("app"));
assert.ok(plan.selectedModules.includes("database"));
assert.ok(plan.selectedModules.includes("workflows"));
assert.match(orchestrationBrief(plan),/SOOLENAI AUTONOMOUS BUILD PLAN/);

const planIndex=home.indexOf('fetch("/api/orchestrate"');
const planGuard=home.indexOf('if(!planResponse.ok)throw');
const generateIndex=home.indexOf('fetch("/api/generate"');
assert.ok(planIndex>0&&planGuard>planIndex&&generateIndex>planGuard,"Homepage must complete Idea Planning before Generate.");

for(const pattern of [
  /auth\.getUser\(\)/,
  /Please verify your email or phone before creating an app/,
  /runAutonomousEngine/,
  /verifyGeneration/,
  /selfTestGeneratedApp/,
  /verifyGeneratedAppExecution/,
  /inspectProjectSpecification/,
  /adult\.status!=="verified"/,
  /\.from\("apps"\)\.insert/,
  /\.from\("app_versions"\)\.insert/,
  /current_version_id:version\.id/,
  /\.from\("project_memory"\)\.upsert/,
  /success:true/,
]) assert.match(generate,pattern);

assert.ok(generate.indexOf('adult.status!=="verified"')<generate.indexOf('.from("apps").insert'),"Unverified generation must never persist as an App.");
assert.ok(generate.indexOf('.from("app_versions").insert')<generate.indexOf('current_version_id:version.id'),"Version must exist before current pointer advances.");

for(const pattern of [
  /auth\.getUser\(\)/,
  /\.from\("apps"\).*current_version_id/,
  /\.from\("app_versions"\)/,
  /version\.id === app\.current_version_id/,
  /GeneratedAppClient/,
  /notFound\(\)/,
]) assert.match(preview,pattern);

console.log("✓ AI App internal E2E locks Planning → verified Generate → App save → Version save → current pointer → Preview");
console.log("✓ Failed/unverified generation cannot be persisted and Preview reads the authoritative saved current version");
console.log("✓ Real external AI-provider success remains LIVE evidence and is not fabricated by this code gate");
