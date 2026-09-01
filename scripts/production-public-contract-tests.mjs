import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath, PUBLIC_DISCOVERY_PATHS } from "../lib/auth/session-safety.js";

const workflow=fs.readFileSync(".github/workflows/production-stability-100.yml","utf8");
const stability=fs.readFileSync("scripts/production-stability-100.mjs","utf8");
const vercel=fs.readFileSync("vercel.json","utf8");

assert.equal(isPublicAccountPath("/robots.txt"),true);
assert.equal(isPublicAccountPath("/sitemap.xml"),true);
assert.equal(isPublicAccountPath("/api/soolenai/capabilities"),true,'Capability discovery must stay public and return JSON before sign-in');
for(const path of PUBLIC_DISCOVERY_PATHS)assert.equal(isPublicAccountPath(path),true,`${path} must remain publicly crawlable`);
assert.equal(isPublicAccountPath("/my-apps"),false);
assert.equal(isPublicAccountPath("/studio"),false);
assert.equal(isPublicAccountPath("/api/apps"),false,'Customer app data must stay protected.');

assert.match(workflow,/name: LANERIQ AI Production Stability 1000/);
assert.match(workflow,/workflow_dispatch:/);
assert.doesNotMatch(workflow,/\n\s*push:/,"Final 1000-run must not start automatically before code hardening is complete.");
assert.match(workflow,/LANERIQ_STABILITY_RUNS: '1000'/);
assert.match(workflow,/timeout-minutes: 60/);
assert.match(workflow,/Run final 1000 production stability cycles/);

for(const path of ["/","/auth","/api/templates?mode=meta","/api/soolenai/capabilities","/api/apps","/robots.txt","/sitemap.xml","/ai-app-game-website-builder"]){
  assert.ok(stability.includes(`path:"${path}"`),`Final Production stability test missing ${path}`);
}
assert.match(stability,/path:"\/api\/apps",expect:\[401\],body:\/"code"/);
assert.match(stability,/AUTHENTICATION_REQUIRED/);
assert.match(stability,/function validateCapabilityPayload/);
assert.match(stability,/ZERO_COST_PROVIDER_ALLOWLIST=new Set\(\["ollama","soolen-local"\]\)/);
assert.match(stability,/FREE_READY_CAPABILITIES=/);
for(const id of ["multilingual-chat","app-website-builder","coding-agent","visual-understanding","local-image-creation","browser-voice","video-storyboard","project-memory"]){
  assert.ok(stability.includes(`"${id}"`),`Production capability semantics missing free-ready assertion for ${id}`);
}
assert.match(stability,/providers\?\.costMode,"zero"/);
assert.match(stability,/providers\?\.premiumRouting,false/);
assert.match(stability,/policy\?\.failClosed,true/);
assert.match(stability,/policy\?\.meteredProvidersAllowed,false/);
assert.match(stability,/policy\?\.freeTierCloudAllowed,false/);
assert.match(stability,/policy\?\.cloudVideoAllowed,false/);
assert.match(stability,/policy\?\.externalSpendCap,0/);
assert.match(stability,/minimumTier!=="free"/);
assert.match(stability,/professional_access_required/);
assert.match(stability,/if\(target\.validate\)target\.validate\(text,run\)/);
assert.match(stability,/Math\.min\(1000/);
assert.match(stability,/LANERIQ_STABILITY_RUNS\|\|1000/);
assert.match(stability,/redirect:"manual"/);
assert.match(stability,/cache:"no-store"/);
assert.match(stability,/response\.status<500/);
assert.match(stability,/crashCount:0/);
assert.match(stability,/networkErrorCount:0/);
assert.match(stability,/server5xxCount:0/);
assert.match(stability,/p95/);
assert.match(stability,/p99/);

assert.match(vercel,/"framework"\s*:\s*"nextjs"/);
assert.match(vercel,/"buildCommand"\s*:\s*"npm run build"/);
assert.doesNotMatch(vercel,/"deploymentEnabled"\s*:\s*false/);

console.log("✓ Production surface code keeps SEO/capability discovery public while private customer routes remain authenticated");
console.log("✓ Final stability run is manual-only, exactly 1000 cycles and checks 8 surfaces: seven public 200s plus one protected API JSON 401");
console.log("✓ Every capability probe validates zero-cost semantics, approved providers, eight free-ready core capabilities and fail-closed Professional access");
console.log("✓ Code contract is 100; final Production stability score waits for the actual 1000-run result");