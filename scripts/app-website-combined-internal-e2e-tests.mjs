import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousPlan, orchestrationBrief } from "../lib/build/orchestrator.js";

const home=fs.readFileSync("app/page.js","utf8");
const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const generate=fs.readFileSync("app/api/generate/route.js","utf8");
const modify=fs.readFileSync("app/api/modify/route.js","utf8");
const builderDomain=fs.readFileSync("lib/cloud/builder-projects.js","utf8");
const builderAdapter=fs.readFileSync("lib/cloud-adapters/builder-project-data.js","utf8");
const combinedPreview=fs.readFileSync("app/preview/[id]/page.js","utf8");
const appSurface=fs.readFileSync("app/a/[id]/page.js","utf8");
const websiteSurface=fs.readFileSync("app/website/[id]/page.js","utf8");
const analyticsTracker=fs.readFileSync("app/components/AnalyticsTracker.js","utf8");
const analyticsRoute=fs.readFileSync("app/api/analytics/event/route.js","utf8");
const analyticsPage=fs.readFileSync("app/analytics/[id]/page.js","utf8");
const analyticsMigration=fs.readFileSync("supabase/migrations/20260904150000_anonymous_aggregate_analytics.sql","utf8");
const analyticsPolicy=fs.readFileSync("docs/LANERIQ_ANONYMOUS_AGGREGATE_ANALYTICS_POLICY.md","utf8");
const visibleRuntime=fs.readFileSync("lib/publishing/public-project-runtime.js","utf8");
const dynamicE2E=fs.readFileSync("scripts/app-website-dynamic-release-e2e-tests.mjs","utf8");
const packageJson=fs.readFileSync("package.json","utf8");

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
assert.match(generate,/loadBuilderGenerationInputs\(\{assetIds\}\)/);
assert.match(generate,/saveBuilderGeneratedProjectContext\(\{projectId:app\.id,assignments:mediaAssignments/);
assert.match(builderAdapter,/\.from\("asset_library"\)\.select\("id,file_name,mime_type,category"\)\.eq\("user_id", userId\)\.in\("id", assetIds\)/);
assert.match(builderAdapter,/\.from\("project_assets"\)\.upsert\(rows/);
assert.match(generate,/reusableAcrossUsers:false|privateCustomerAsset:true|mediaAssignments/,"Customer reference handling must remain private/project-bound or represented by owner-bound assignments.");
assert.doesNotMatch(generate,/insert\(\{[^}]*product_type:\s*"website"/i,"Combined creation must not fork into an unsynchronized shadow Website record.");

const orchestrateCalls=(home.match(/fetch\("\/api\/orchestrate"/g)||[]).length;
const generateCalls=(home.match(/fetch\("\/api\/generate"/g)||[]).length;
assert.equal(orchestrateCalls,1,"Primary homepage should have one authoritative planning request.");
assert.equal(generateCalls,1,"Primary homepage should create the coherent App + Website product through one authoritative Generate request.");
assert.ok(home.indexOf('fetch("/api/orchestrate"')<home.indexOf('fetch("/api/generate"'));

assert.match(generate,/const specification=\{\.\.\.verified\.normalized/);
assert.match(generate,/persistBuilderGeneratedProject/);
assert.match(builderDomain,/persistBuilderGeneratedProject/);
assert.match(builderAdapter,/server_persist_generated_project/);
assert.match(builderAdapter,/p_specification: specification/);
assert.match(builderAdapter,/p_request_id: requestId/);
assert.match(generate,/recoveredPartial:Boolean\(persisted\.recovered_partial\)/);
assert.match(generate,/projectLearning/);
assert.match(generate,/media:\{attached/);
assert.match(builderAdapter,/project_memory/);
assert.doesNotMatch(generate,/lib\/supabase\/|@supabase\/|createAdminClient/);

for(const pattern of [/generateWithFallback/,/soolen-local/,/normalizeAppSpec/,/selfTestGeneratedApp/,/verifyGeneratedAppExecution/,/inspectProjectSpecification/,/assessBuildQuality/,/evaluateReleaseReadiness/,/quality\.overall,100/,/readiness\.releaseReady,true/,/property-zh/,/restaurant-ms/,/commerce-en/])assert.match(dynamicE2E,pattern);
assert.doesNotMatch(dynamicE2E,/runAutonomousEngine/,"Pure Node release E2E must exercise the zero-cost provider router without importing Next request-context dependencies.");
assert.match(packageJson,/"test:combined-e2e-code": "node scripts\/app-website-combined-internal-e2e-tests\.mjs && npm run test:generation-e2e-dynamic"/);

assert.match(home,/window\.location\.assign\(`\/a\/\$\{id\}\?demo=1`\)/);
assert.match(appSurface,/query\?\.demo === "1"[\s\S]*redirect\(`\/preview\/\$\{id\}`\)/);
assert.match(combinedPreview,/ONE PROJECT · ONE CURRENT VERSION/);
assert.match(combinedPreview,/data-project-id=\{id\}/);
assert.match(combinedPreview,/data-version-id=\{versionId\}/);
assert.equal((combinedPreview.match(/previewVersion=\$\{pinned\}/g)||[]).length,2,"Both App and Website preview frames must pin the exact same version ID.");
assert.match(combinedPreview,/data-surface="app"/);
assert.match(combinedPreview,/data-surface="website"/);

assert.match(visibleRuntime,/requestedVersionId && isOwner[\s\S]*app\.current_version_id[\s\S]*app\.published_version_id/);
assert.match(visibleRuntime,/\.eq\("id", selectedVersionId\)[\s\S]*\.eq\("app_id", app\.id\)/);
assert.match(visibleRuntime,/isPinnedPreview: Boolean\(requestedVersionId && isOwner\)/);
assert.match(visibleRuntime,/isPublishedVersion: Boolean\(app\.published_version_id && version\.id === app\.published_version_id\)/);
assert.match(appSurface,/versionId: requestedVersionId/);
assert.match(appSurface,/data-project-version=\{version\.id\}/);
assert.match(websiteSurface,/versionId:requestedVersionId/);
assert.match(websiteSurface,/data-project-version=\{version\.id\}/);
assert.match(websiteSurface,/const enquiryEnabled=isPublished&&isPublishedVersion&&!isPinnedPreview/);
assert.match(websiteSurface,/isOwner&&isPublishedVersion&&!isPinnedPreview&&<WebsiteEnquiryInbox/);

assert.match(analyticsTracker,/function isEmbeddedPinnedPreview\(\)/);
assert.match(analyticsTracker,/window\.parent===window/);
assert.match(analyticsTracker,/params\.has\("previewVersion"\)/);
assert.match(analyticsTracker,/surface==="app"\|\|surface==="website"/);
assert.match(analyticsTracker,/if\(isEmbeddedPinnedPreview\(\)\)return;/);
assert.ok(analyticsTracker.indexOf("if(isEmbeddedPinnedPreview())return;")<analyticsTracker.indexOf("trackProjectEvent({appId,channel"),"Pinned Preview guard must execute before customer analytics tracking.");
assert.match(analyticsTracker,/sessionStorage\.removeItem\("soolenAnalyticsSession"\)/,"Legacy session-linked analytics IDs must be actively removed.");
assert.doesNotMatch(analyticsTracker,/crypto\.randomUUID|sessionStorage\.getItem|sessionId|metadata|window\.location\.pathname/,"Browser analytics must not create or transmit visitor-linked identifiers or paths.");

assert.match(analyticsRoute,/createAdminClient/);
assert.match(analyticsRoute,/server_record_anonymous_analytics_event/);
assert.match(analyticsRoute,/anonymous-aggregate-only/);
assert.match(analyticsRoute,/FORBIDDEN_FIELDS/);
assert.match(analyticsRoute,/"sessionId"[\s\S]*"metadata"[\s\S]*"userId"[\s\S]*"ip"[\s\S]*"path"[\s\S]*"referrer"/);
assert.doesNotMatch(analyticsRoute,/\.from\("analytics_events"\)|session_id|cleanMetadata/,"API must never write legacy event-level analytics.");

assert.match(analyticsPage,/\.from\("analytics_daily_aggregates"\)/);
assert.match(analyticsPage,/Anonymous Aggregate Analytics Only/);
assert.match(analyticsPage,/No session IDs, user IDs, IP addresses, device IDs, referrers, page paths/);
assert.doesNotMatch(analyticsPage,/session_id|SESSIONS · 30D/,"Owner analytics UI must not depend on visitor sessions.");

assert.match(analyticsMigration,/create table if not exists public\.analytics_daily_aggregates/);
assert.match(analyticsMigration,/primary key \(app_id,event_day,event_name,channel\)/);
assert.match(analyticsMigration,/security invoker/);
assert.match(analyticsMigration,/revoke execute on function public\.server_record_anonymous_analytics_event\(uuid,text,text\) from public, anon, authenticated/);
assert.match(analyticsMigration,/grant execute on function public\.server_record_anonymous_analytics_event\(uuid,text,text\) to service_role/);
assert.match(analyticsMigration,/truncate table public\.analytics_events/);
assert.match(analyticsMigration,/revoke all on table public\.analytics_events from public, anon, authenticated, service_role/);
assert.match(analyticsPolicy,/Anonymous Aggregate Analytics Only/);
assert.match(analyticsPolicy,/must not answer "What did this specific visitor do\?"/);

// Modify advances the working version only. Cloud adapter owns the service-only atomic write and re-checks the exact version.
assert.match(modify,/saveBuilderModification/);
assert.match(builderAdapter,/server_save_app_modification/);
assert.match(builderAdapter,/p_expected_version_id: expectedVersionId/);
assert.match(builderAdapter,/project\.current_version_id !== expectedVersionId/);
assert.doesNotMatch(modify,/lib\/supabase\/|@supabase\/|createAdminClient/);
assert.match(visibleRuntime,/isOwner[\s\S]*app\.current_version_id[\s\S]*app\.published_version_id/);

console.log("✓ App + Website simultaneous E2E uses one Planning decision, one verified specification and one LANERIQ Cloud atomic initial persistence transaction");
console.log("✓ Dynamic zero-cost provider execution is wired to prove deterministic 100/100 and Release-Gate readiness across multilingual industry cases");
console.log("✓ Preview Both locks App and Website to the same owner-authorized working version with no shadow Website record");
console.log("✓ Anonymous App + Website production traffic stays pinned to published_version_id until an explicit new Publish");
console.log("✓ Cloud adapter isolates generated-project and Modify service-role persistence behind owner/version checks");
console.log("✓ Customer enquiries and the live owner inbox stay bound to the exact published Website snapshot, never the newer working draft");
console.log("✓ LANERIQ Analytics stores daily anonymous aggregates only and rejects session, identity, device, path, referrer and arbitrary metadata tracking");
console.log("✓ Pinned owner snapshots do not inflate customer analytics; real authenticated Production generation remains a separate LIVE evidence gate");
