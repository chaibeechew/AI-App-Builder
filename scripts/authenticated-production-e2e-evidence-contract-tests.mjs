import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";
import "./app-builder-production-closure-e2e-contract-tests.mjs";

const page = fs.readFileSync("app/production-e2e/page.js", "utf8");
const client = fs.readFileSync("app/production-e2e/ProductionE2EClient.js", "utf8");
const css = fs.readFileSync("app/production-e2e/production-e2e.module.css", "utf8");
const buildInfo = fs.readFileSync("app/api/build-info/route.js", "utf8");
const quickTest = fs.readFileSync("app/quick-test/route.js", "utf8");
const zeroSpendRoute = fs.readFileSync("app/api/production-e2e/zero-spend/route.js", "utf8");
const finance = fs.readFileSync("lib/app-builder-finance.js", "utf8");
const zeroSpendMigration = fs.readFileSync("supabase/migrations/20260903080410_batch13_zero_spend_generation_entitlement.sql", "utf8");

assert.equal(isPublicAccountPath("/production-e2e"), false, "Authenticated Production E2E evidence must remain protected by account middleware.");
assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
assert.match(page, /ProductionE2EClient/);

for (const pattern of [
  /fetch\("\/api\/build-info"/,
  /body\?\.product !== "LANERIQ AI"/,
  /environment === "production"/,
  /commitRef === "main"/,
  /COMMIT_SHA\.test\(commitSha\)/,
  /Production evidence is locked to an exact main deployment/,
  /fetch\("\/api\/apps"/,
  /fetch\(`\/api\/apps\/\$\{selected\.id\}`/,
  /current_version_id/,
  /detail\.versions\.find/,
  /\/a\/\$\{id\}\?demo=1/,
  /\/website\/\$\{id\}/,
  /\/app-dashboard\/\$\{id\}\/versions/,
  /\/release\/\$\{id\}/,
  /FRESH_WINDOW_MS\s*=\s*20 \* 60 \* 1000/,
  /rawAgeMs >= 0 && rawAgeMs <= FRESH_WINDOW_MS/,
  /freshGenerationWithin20Minutes/,
  /reportVersion:\s*2/,
  /evidenceLevel:\s*"authenticated-production-browser"/,
  /exactProductionBuildVerified:\s*build\.exactProductionBuildVerified/,
  /physicalDeviceVerified:\s*false/,
  /originalGenerationProviderVerified:\s*false/,
  /evidenceRunnerReplayedProviderOutput:\s*false/,
  /writesExercised:\s*false/,
  /smsExercised:\s*false/,
  /commitSha:\s*build\.commitSha/,
  /commitRef:\s*build\.commitRef/,
  /environment:\s*build\.environment/,
  /redirect:\s*"manual"/,
  /credentials:\s*"same-origin"/,
  /Copy report/,
]) assert.match(client, pattern);

assert.match(buildInfo, /VERCEL_GIT_COMMIT_SHA/);
assert.match(buildInfo, /VERCEL_GIT_COMMIT_REF/);
assert.match(buildInfo, /VERCEL_ENV/);
assert.match(buildInfo, /Cache-Control": "private, no-store/);

assert.doesNotMatch(client, /Math\.max\(0,\s*Date\.now\(\) - createdAtMs\)/, "A future project timestamp must never be coerced to age 0 and accepted as fresh evidence.");
assert.doesNotMatch(client, /providerOutputReplayed:\s*false/, "Evidence-runner behavior must not be mislabeled as proof about the original generation provider output.");
assert.doesNotMatch(client, /createClient\s*\(/, "Evidence UI must use normal protected application APIs instead of constructing privileged Supabase access.");
assert.doesNotMatch(client, /signInWithOtp|verifyOtp|phone-auth|sms-auth/i, "SMS/OTP execution remains on hold and outside authenticated E2E evidence.");
assert.doesNotMatch(client, /\/api\/generate|\/api\/modify|\/api\/apps\/.*\/publish/, "Evidence collection must remain read-only; the separate Quick Test owns explicit write execution.");
assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE|admin\.createUser/i, "Evidence collection must never bypass normal Auth with privileged credentials.");

for (const pattern of [
  /sameOrigin\(request\)/,
  /readBoundedJson\(request, MAX_BYTES\)/,
  /authenticatedUser\(\)/,
  /consumeZeroSpendAppBuilderEntitlement/,
  /restoreFailedAppBuilderCreate/,
  /ZERO_SPEND_ENTITLEMENT_REQUIRED/,
  /free_first_project_create/,
  /pro_access/,
  /aiCreditsCharged:\s*0/,
  /projectCreditsCharged:\s*0/,
  /zeroSpendOnly:\s*true/,
]) assert.match(zeroSpendRoute, pattern);
assert.doesNotMatch(zeroSpendRoute, /consumeAiCredits|standard_project_credits|server_consume_ai_credits/,
  "Zero-spend reservation API must never consume AI or project credits.");

assert.match(finance, /consumeZeroSpendAppBuilderEntitlement/);
assert.match(finance, /server_consume_app_builder_zero_spend_entitlement/);

for (const pattern of [
  /server_consume_app_builder_zero_spend_entitlement/,
  /security definer/i,
  /set search_path = ''/,
  /free_first_project_create/,
  /pro_access/,
  /zero_spend/,
  /revoke all on function public\.server_consume_app_builder_zero_spend_entitlement\(uuid,text\) from public, anon, authenticated/,
  /grant execute on function public\.server_consume_app_builder_zero_spend_entitlement\(uuid,text\) to service_role/,
]) assert.match(zeroSpendMigration, pattern);
assert.doesNotMatch(zeroSpendMigration, /standard_project_credits|server_consume_ai_credits|credit_accounts|credit_transactions/,
  "Database zero-spend entitlement must not read, decrement or call any credit mechanism.");

const buildIndex = quickTest.indexOf("/api/build-info");
const planIndex = quickTest.indexOf("/api/orchestrate");
const reserveIndex = quickTest.indexOf("/api/production-e2e/zero-spend");
const generateIndex = quickTest.indexOf("/api/generate");
assert(buildIndex > 0 && planIndex > buildIndex && reserveIndex > planIndex && generateIndex > reserveIndex,
  "Fresh Production journey must verify exact Production build, Plan, reserve zero-spend entitlement, then Generate in that order.");

for (const pattern of [
  /RUN ZERO-SPEND PRODUCTION JOURNEY/,
  /verifyExactProductionBuild/,
  /data\.product==='LANERIQ AI'/,
  /environment==='production'/,
  /commitRef==='main'/,
  /COMMIT_SHA\.test\(commitSha\)/,
  /action:'reserve'/,
  /action:'release'/,
  /reservationHeld=true/,
  /reservationHeld=false/,
  /requestId:createRequestId/,
  /\/api\/apps\/'\+encodeURIComponent\(appId\)\+'\/bootstrap/,
  /getJson\('\/api\/apps\/'\+encodeURIComponent\(appId\)/,
  /persistedVersionVerified/,
  /current_version_id/,
  /\/app-dashboard\/'\+encodeURIComponent\(appId\)/,
  /\/preview\/'\+encodeURIComponent\(appId\)/,
  /\/editor\/'\+encodeURIComponent\(appId\)/,
  /\/database\/'\+encodeURIComponent\(appId\)/,
  /\/workflows\/'\+encodeURIComponent\(appId\)/,
  /\/operations\/'\+encodeURIComponent\(appId\)/,
  /\/analytics\/'\+encodeURIComponent\(appId\)/,
  /\/release\/'\+encodeURIComponent\(appId\)/,
  /\/publish\/'\+encodeURIComponent\(appId\)/,
  /\/a\/'\+encodeURIComponent\(appId\)\+'\?demo=1/,
  /\/website\/'\+encodeURIComponent\(appId\)/,
  /AUTHENTICATED_PRODUCTION_BROWSER_JOURNEY/,
  /reportVersion:3/,
  /exactProductionBuildVerified:true/,
  /physicalDeviceVerified:false/,
  /originalGenerationProviderVerified:false/,
  /officialStoreSubmissionVerified:false/,
  /storeSubmissionExercised:false/,
  /smsExercised:false/,
  /zeroSpendOnly:true/,
  /aiCreditsCharged:0/,
  /projectCreditsCharged:0/,
  /planningVerified:true/,
  /generationRequestCompleted:generated\.success===true/,
  /saveVerified:true/,
  /browserJourneySurfacesVerified:true/,
  /appPreviewVerified:appPreview\.ok/,
  /websitePreviewVerified:websitePreview\.ok/,
  /writesExercised:true/,
  /journeySurfaceCoverage:\{required:journeySurfaces\.length,passed:journeySurfaces\.filter\(x=>x\.ok\)\.length/,
]) assert.match(quickTest, pattern);

assert.doesNotMatch(quickTest, /\/api\/credits|consumeAiCredits|standard_project_credits|signInWithOtp|verifyOtp|phone-auth|sms-auth|send_sms|sendSms/i,
  "Fresh zero-spend E2E must not invoke credit or SMS/OTP execution internals; truthful explanatory copy may still mention those boundaries.");
assert.doesNotMatch(quickTest, /officialStoreSubmissionVerified:true|originalGenerationProviderVerified:true|physicalDeviceVerified:true/,
  "Browser journey evidence must not impersonate physical-device, provider-LIVE or official-store evidence.");
assert.doesNotMatch(quickTest, /\/api\/modify|\/api\/publish\/request|\/api\/store-metadata\/approve/,
  "Batch 42 authenticated journey may create/bootstrap a test project but must not modify it or submit/approve store publishing.");

for (const pattern of [
  /safe-area-inset-top/,
  /safe-area-inset-bottom/,
  /min-height:50px/,
  /font-size:16px/,
  /touch-action:manipulation/,
  /focus-visible/,
  /prefers-reduced-motion:reduce/,
]) assert.match(quickTest, pattern);

for (const pattern of [
  /100svh/,
  /safe-area-inset-top/,
  /min-height:48px/,
  /font-size:16px/,
  /touch-action:manipulation/,
  /focus-visible/,
  /@media\(max-width:760px\)/,
  /prefers-reduced-motion:reduce/,
]) assert.match(css, pattern);

console.log("✓ Authenticated Production E2E evidence route stays protected and noindex");
console.log("✓ Evidence can be issued only from an exact Production main deployment with a real 40-character commit SHA");
console.log("✓ Read-only evidence validates persisted App/Website/version/release surfaces without replaying provider output");
console.log("✓ Batch 42 write runner verifies exact Production identity before Plan → zero-spend reserve → Generate → atomic Save → bootstrap");
console.log("✓ Batch 42 re-reads the persisted current version and verifies App, Website plus nine owner-scoped journey surfaces in the authenticated browser session");
console.log("✓ Zero-spend reservation is service-role-only and can use only free-first-project or active Pro access; AI/project credits are impossible by contract");
console.log("✓ Failed E2E attempts release their reservation; successful Generate binds the same stable request ID to the persisted project");
console.log("✓ Browser journey evidence remains truthful: no physical-device, provider-LIVE, official-store or SMS execution claim is introduced");
