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

assert.match(workflow,/name: LANERIQ AI Production Stability 1000/);
assert.match(workflow,/workflow_dispatch:/);
assert.doesNotMatch(workflow,/\n\s*push:/,"Final 1000-run must not start automatically before code hardening is complete.");
assert.match(workflow,/LANERIQ_STABILITY_RUNS: '1000'/);
assert.match(workflow,/timeout-minutes: 60/);
assert.match(workflow,/Run final 1000 production stability cycles/);

for(const path of ["/","/auth","/api/templates?mode=meta","/api/soolenai/capabilities","/robots.txt","/sitemap.xml","/ai-app-game-website-builder"]){
  assert.ok(stability.includes(`path:"${path}"`),`Final Production stability test missing ${path}`);
}
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

console.log("✓ Production public-surface code keeps SEO and capability discovery public while private customer routes remain authenticated");
console.log("✓ Final stability run is manual-only, exactly 1000 cycles and checks 7 public surfaces for redirect/body/network/5xx failures");
console.log("✓ Code contract is 100; final Production stability score waits for the actual 1000-run result");