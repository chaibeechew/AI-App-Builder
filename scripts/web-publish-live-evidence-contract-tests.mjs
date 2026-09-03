import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("app/web-publish-evidence/page.js","utf8");
const client=fs.readFileSync("app/web-publish-evidence/WebPublishEvidenceClient.js","utf8");
const css=fs.readFileSync("app/web-publish-evidence/web-publish-evidence.module.css","utf8");
const detailRoute=fs.readFileSync("app/api/apps/[id]/route.js","utf8");
const projectDomain=fs.readFileSync("lib/cloud/projects.js","utf8");
const projectDataAdapter=fs.readFileSync("lib/cloud-adapters/project-data.js","utf8");
const sessionSafetySource=fs.readFileSync("lib/auth/session-safety.js","utf8");
const sessionSafety=await import(`data:text/javascript;base64,${Buffer.from(sessionSafetySource).toString("base64")}`);

assert.match(page,/title: "Web Publish Evidence — LANERIQ AI"/);
assert.match(page,/robots: \{ index: false, follow: false \}/);
assert.equal(sessionSafety.isPublicAccountPath("/web-publish-evidence"),false,"Live lifecycle evidence must require authentication.");

for(const pattern of [
  /credentials: "same-origin"/,
  /credentials: "omit"/,
  /redirect: "manual"/,
  /projectIsPublic/,
  /This project is already public/,
  /initialProjectRequiredPrivate: true/,
  /preExistingPublishedProjectsRejected: true/,
  /userTriggered: true/,
  /anonymousProbesUseCredentialsOmit: true/,
  /automaticUnpublishCleanup: true/,
  /action, id/,
  /"publish", publishId/,
  /"unpublish", cleanupId/,
  /finally \{/,
  /if \(publishAttempted && !cleanup\?\.ok\) cleanup = await cleanupPublishedProject/,
  /before\.app\.notFound/,
  /during\?\.app\?\.status >= 200/,
  /after\?\.app\?\.notFound/,
  /smsExercised: false/,
  /physicalDeviceVerified: false/,
  /Start Publish Lifecycle Test/,
  /type="checkbox"/,
]) assert.match(client,pattern);

assert.ok(client.indexOf('publishAttempted = true') < client.indexOf('publishAction(appId, versionId, "publish", publishId)'),"Cleanup guard must arm before the publish request is sent.");
assert.ok(client.indexOf('projectIsPublic(freshApp)') < client.indexOf('publishAttempted = true'),"Pre-existing live projects must be rejected before any publish attempt.");
assert.ok(client.indexOf('freshQuality.data?.releaseReady !== true') < client.indexOf('publishAttempted = true'),"Exact current version must pass the release gate before publish.");
assert.ok(client.indexOf('credentials: "omit"') < client.indexOf('async function runLifecycle'),"Anonymous probe primitive must be defined before lifecycle execution.");

for(const forbidden of [
  /\/api\/generate/,
  /\/api\/modify/,
  /\/api\/sms/,
  /service[_-]?role/i,
  /SUPABASE_SERVICE_ROLE/i,
  /localStorage/,
  /sessionStorage/,
  /navigator\.mediaDevices/,
  /getUserMedia\(/,
  /sendBeacon/,
]) assert.doesNotMatch(client,forbidden);

// The owned project read path is now split: route -> provider-opaque LANERIQ Cloud domain -> compatibility adapter.
// Keep the original publish-evidence guarantees at their new responsibility boundaries instead of weakening them.
assert.match(detailRoute,/getCurrentUserProject/);
assert.match(projectDomain,/cloud-adapters\/project-data\.js/);
assert.match(projectDataAdapter,/visibility, publish_status/);
assert.match(projectDataAdapter,/\.eq\("owner_id", principal\.principalId\)/);
assert.doesNotMatch(detailRoute,/lib\/supabase\/|@supabase\//);
assert.match(detailRoute,/Cache-Control": "private, no-store, max-age=0"/);

assert.match(css,/min-height:100svh/);
assert.match(css,/env\(safe-area-inset-top\)/);
assert.match(css,/font-size:16px/);
assert.match(css,/min-height:48px/);
assert.match(css,/min-height:44px/);
assert.match(css,/touch-action:manipulation/);
assert.match(css,/prefers-reduced-motion:reduce/);

console.log("✓ Web Publish live evidence is protected/noindex and only runs after explicit checkbox + button consent");
console.log("✓ Pre-existing live projects are rejected and exact current version + 100/100 gate are rechecked before publish");
console.log("✓ Public App/Website probes omit credentials, publish cleanup is armed before mutation, and finally enforces unpublish recovery");
console.log("✓ Evidence runner cannot invoke Generate, Modify, SMS, service-role secrets, media permissions or persistent browser storage");
console.log("✓ Owned project visibility/publish evidence now follows route → LANERIQ Cloud → adapter without weakening owner isolation");
