import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";
import { productionE2ERequestId } from "../lib/production-e2e-isolation.js";

const page = fs.readFileSync("app/production-e2e/page.js", "utf8");
const client = fs.readFileSync("app/production-e2e/ProductionE2EClient.js", "utf8");
const css = fs.readFileSync("app/production-e2e/production-e2e.module.css", "utf8");
const buildInfo = fs.readFileSync("app/api/build-info/route.js", "utf8");
const quickTest = fs.readFileSync("app/quick-test/route.js", "utf8");
const zeroSpendRoute = fs.readFileSync("app/api/production-e2e/zero-spend/route.js", "utf8");
const generateRoute = fs.readFileSync("app/api/generate/route.js", "utf8");
const isolation = fs.readFileSync("lib/production-e2e-isolation.js", "utf8");

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
  /createHash\("sha256"\)/,
  /LANERIQ_AI_PRODUCTION_E2E_V4/,
  /production-e2e-v4-/,
  /PRODUCTION_E2E_PROJECT_NAME/,
  /LANERIQ Production E2E Validation/,
  /PRODUCTION_E2E_CANONICAL_IDEA/,
  /production_e2e_isolated_singleton/,
  /oneProjectPerAccount:\s*true/,
  /canonicalInputEnforced:\s*true/,
  /arbitraryPromptGenerationAllowed:\s*false/,
  /customerCreditsAllowed:\s*false/,
  /projectCreditsAllowed:\s*false/,
  /storeSubmissionAllowed:\s*false/,
  /smsExecutionAllowed:\s*false/,
]) assert.match(isolation, pattern);

const deterministicA = productionE2ERequestId("11111111-1111-4111-8111-111111111111");
const deterministicB = productionE2ERequestId("11111111-1111-4111-8111-111111111111");
const deterministicOther = productionE2ERequestId("22222222-2222-4222-8222-222222222222");
assert.equal(deterministicA, deterministicB, "The same account must replay the same isolated Production E2E identity.");
assert.notEqual(deterministicA, deterministicOther, "Different accounts must not share an isolated Production E2E identity.");
assert.match(deterministicA, /^production-e2e-v4-[0-9a-f]{32}$/);

for (const pattern of [
  /sameOrigin\(request\)/,
  /readBoundedJson\(request, MAX_BYTES\)/,
  /authenticatedUser\(\)/,
  /productionE2ERequestId\(user\.id\)/,
  /PRODUCTION_E2E_ENTITLEMENT_SOURCE/,
  /testOnly:\s*true/,
  /oneProjectPerAccount:\s*true/,
  /canonicalInputEnforced:\s*true/,
  /aiCreditsCharged:\s*0/,
  /projectCreditsCharged:\s*0/,
  /zeroSpendOnly:\s*true/,
  /noReservationMutationRequired:\s*true/,
]) assert.match(zeroSpendRoute, pattern);
assert.doesNotMatch(zeroSpendRoute, /consumeZeroSpendAppBuilderEntitlement|restoreFailedAppBuilderCreate|consumeAiCredits|standard_project_credits|server_consume_ai_credits/,
  "The isolated Production E2E identity endpoint must not reserve, consume, restore, or decrement any customer entitlement/credit mechanism.");

for (const pattern of [
  /productionE2E=body\?\.productionE2E===true/,
  /idea=productionE2E\?PRODUCTION_E2E_CANONICAL_IDEA/,
  /requestedName=productionE2E\?PRODUCTION_E2E_PROJECT_NAME/,
  /assetIds=productionE2E\?\[\]/,
  /referenceImages=productionE2E\?\[\]/,
  /productionE2E&&!isProductionE2ERequestId\(userId,chargeRequestId\)/,
  /!productionE2E&&chargeRequestId\.startsWith\("production-e2e-v4-"\)/,
  /if\(productionE2E\)\{\s*entitlement=\{allowed:true,source:PRODUCTION_E2E_ENTITLEMENT_SOURCE,replayed:false\}/,
  /entitlementSource=PRODUCTION_E2E_ENTITLEMENT_SOURCE/,
  /decorateProductionE2E\(payload,productionE2E\)/,
  /externalProviderSpendVerified:false/,
  /memoryScope=productionE2E\?"project_only"/,
]) assert.match(generateRoute, pattern);
assert.match(generateRoute, /else\{\s*entitlement=await consumeAppBuilderEntitlement/, "Normal customer generation must keep the existing entitlement path.");
assert.match(generateRoute, /if\(!entitlement\?\.allowed\)\{\s*creditCharge=await consumeAiCredits/, "Normal customer generation must keep the existing credit path.");
assert.doesNotMatch(generateRoute, /productionE2E\?[^;]*consumeAiCredits/, "Production E2E mode must never invoke customer credit charging.");

const buildIndex = quickTest.indexOf("/api/build-info");
const planIndex = quickTest.indexOf("/api/orchestrate");
const reserveIndex = quickTest.indexOf("/api/production-e2e/zero-spend");
const generateIndex = quickTest.indexOf("/api/generate");
assert(buildIndex > 0 && planIndex > buildIndex && reserveIndex > planIndex && generateIndex > reserveIndex,
  "Production journey must verify exact Production build, Plan, issue isolated E2E identity, then Generate in that order.");

for (const pattern of [
  /RUN ZERO-SPEND PRODUCTION JOURNEY/,
  /readonly/,
  /E2E_ID=\/\^production-e2e-v4-/,
  /verifyExactProductionBuild/,
  /data\.product==='LANERIQ AI'/,
  /environment==='production'/,
  /commitRef==='main'/,
  /COMMIT_SHA\.test\(commitSha\)/,
  /action:'reserve'/,
  /action:'release'/,
  /createRequestId=String\(reservation\.requestId\|\|''\)/,
  /reservationHeld=true/,
  /reservationHeld=false/,
  /productionE2E:true/,
  /requestId:createRequestId/,
  /generated\.credits\.charged/,
  /generated\.productionE2E\.testOnly/,
  /visibility\|\|'private'/,
  /publishStatus\|\|'draft'/,
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
  /reportVersion:4/,
  /exactProductionBuildVerified:true/,
  /isolatedE2EProject:true/,
  /oneProjectPerAccount:true/,
  /canonicalInputEnforced:true/,
  /physicalDeviceVerified:false/,
  /originalGenerationProviderVerified:false/,
  /externalProviderSpendVerified:false/,
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

assert.doesNotMatch(quickTest, /ZERO_SPEND_ENTITLEMENT_REQUIRED|\/api\/credits|consumeAiCredits|standard_project_credits|signInWithOtp|verifyOtp|phone-auth|sms-auth|send_sms|sendSms/i,
  "Isolated zero-credit E2E must not depend on customer entitlement errors, credit internals or SMS/OTP execution.");
assert.doesNotMatch(quickTest, /officialStoreSubmissionVerified:true|originalGenerationProviderVerified:true|physicalDeviceVerified:true|externalProviderSpendVerified:true/,
  "Browser journey evidence must not impersonate physical-device, provider-LIVE/provider-spend or official-store evidence.");
assert.doesNotMatch(quickTest, /\/api\/modify|\/api\/publish\/request|\/api\/store-metadata\/approve/,
  "Authenticated journey may create/bootstrap its isolated test project but must not modify it or submit/approve store publishing.");

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
console.log("✓ Batch 43 gives each signed-in account one deterministic isolated E2E identity with fixed diagnostic input");
console.log("✓ Batch 43 special identity cannot be used by normal generation mode and cannot reach customer credit charging");
console.log("✓ Batch 43 write runner verifies Production identity before Plan → isolated identity → Generate → atomic Save → bootstrap");
console.log("✓ Batch 43 re-reads the persisted current version and verifies App, Website plus nine owner-scoped journey surfaces");
console.log("✓ Browser journey evidence remains truthful: no physical-device, provider-LIVE/provider-spend, official-store or SMS execution claim is introduced");
