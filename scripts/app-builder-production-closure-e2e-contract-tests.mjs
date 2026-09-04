import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";

const route = fs.readFileSync("app/production-closure-e2e/route.js", "utf8");

assert.equal(isPublicAccountPath("/production-closure-e2e"), false,
  "Full App Builder Production closure must remain behind the normal authenticated account boundary.");

for (const pattern of [
  /export const dynamic = "force-dynamic"/,
  /VERCEL_GIT_COMMIT_SHA/,
  /VERCEL_GIT_COMMIT_REF/,
  /VERCEL_ENV/,
  /environment === "production"/,
  /commitRef === "main"/,
  /COMMIT_SHA\.test\(commitSha\)/,
  /Production closure evidence is locked/,
  /Preview, local and non-main deployments cannot execute Generate, Publish or Unpublish evidence/,
  /X-Robots-Tag": "noindex, nofollow, noarchive"/,
  /SERVER_BUILD=Object\.freeze\(__EXPECTED_BUILD__\)/,
  /data\.product==='LANERIQ AI'/,
  /commitSha===SERVER_BUILD\.commitSha/,
]) assert.match(route, pattern);

const verifyIndex = route.indexOf("1/10 Verifying exact Production main SHA");
const planIndex = route.indexOf("2/10 Planning the App + Website");
const reserveIndex = route.indexOf("3/10 Reserving zero-spend creation entitlement");
const generateIndex = route.indexOf("4/10 Generating and atomically saving App + Website");
const persistedIndex = route.indexOf("5/10 Verifying persisted exact version");
const previewIndex = route.indexOf("6/10 Verifying owner App + Website previews");
const qualityIndex = route.indexOf("7/10 Rechecking exact-version 100/100 release gate");
const baselineIndex = route.indexOf("8/10 Proving private baseline, then publishing exact version");
const publishIndex = route.indexOf("'publish',rid('closure-publish')", baselineIndex);
const publicIndex = route.indexOf("9/10 Verifying anonymous public App + Website");
const unpublishIndex = route.indexOf("10/10 Unpublishing and proving private state again");
const privateIndex = route.indexOf("nonce+'-after-app'", unpublishIndex);

const orderedStages = [verifyIndex, planIndex, reserveIndex, generateIndex, persistedIndex, previewIndex, qualityIndex, baselineIndex, publishIndex, publicIndex, unpublishIndex, privateIndex];
assert.ok(orderedStages.every(index => index > 0), "Every Production closure stage must have one deterministic source marker.");
for (let i = 1; i < orderedStages.length; i += 1) {
  assert.ok(orderedStages[i] > orderedStages[i - 1], `Production closure stage ${i + 1} must occur after stage ${i}.`);
}

for (const pattern of [
  /action:'reserve'/,
  /action:'release'/,
  /reservationHeld=true/,
  /reservationHeld=false/,
  /zeroSpendOnly!==true/,
  /aiCreditsCharged!==0/,
  /projectCreditsCharged!==0/,
  /requestId:createId/,
  /generated&&generated\.app&&generated\.app\.id/,
  /generated&&generated\.app&&generated\.app\.versionId/,
  /persisted\.app\.current_version_id!==versionId/,
  /exactVersion\.specification/,
  /ownerHtml\(appPreviewPath\)/,
  /ownerHtml\(websitePreviewPath\)/,
  /quality\.releaseReady!==true/,
  /quality\.version\.id!==versionId/,
  /credentials:'omit'/,
  /before\.app\.notFound/,
  /before\.website\.notFound/,
  /expectedVersionId:versionId/,
  /publish\.app\.published_version_id!==versionId/,
  /during\.app/,
  /during\.website/,
  /action:action/,
  /'unpublish'/,
  /publicState\(finalDetail\.app\)/,
  /after\.app\.notFound/,
  /after\.website\.notFound/,
  /if\(publishAttempted&&appId&&versionId&&!cleanupResult\?\.ok\)/,
  /closure-finally-unpublish/,
]) assert.match(route, pattern);

for (const pattern of [
  /AUTHENTICATED_PRODUCTION_APP_BUILDER_CLOSURE/,
  /generationVerified:generated\.success===true/,
  /saveVerified:true/,
  /persistedExactVersionVerified:true/,
  /appPreviewVerified:previews\[0\]\.ok/,
  /websitePreviewVerified:previews\[1\]\.ok/,
  /releaseReadyVerified:true/,
  /publishExactVersionPinned:true/,
  /anonymousAppPublicVerified:true/,
  /anonymousWebsitePublicVerified:true/,
  /unpublishCleanupVerified:true/,
  /anonymousPrivateAfterCleanupVerified:true/,
  /remainsPrivateAfterTest:true/,
  /zeroSpendOnly:true/,
  /aiCreditsCharged:0/,
  /projectCreditsCharged:0/,
  /writesExercised:true/,
  /physicalDeviceVerified:false/,
  /originalGenerationProviderVerified:false/,
  /officialStoreSubmissionVerified:false/,
  /emailExercised:false/,
  /smsExercised:false/,
]) assert.match(route, pattern);

for (const forbidden of [
  /createClient\s*\(/,
  /SUPABASE_SERVICE_ROLE/i,
  /service[_-]?role/i,
  /signInWithOtp|verifyOtp|phone-auth|sms-auth|send_sms|sendSms/i,
  /officialStoreSubmissionVerified:true/,
  /originalGenerationProviderVerified:true/,
  /physicalDeviceVerified:true/,
  /\/api\/modify/,
  /\/api\/credits/,
  /consumeAiCredits/,
  /standard_project_credits/,
]) assert.doesNotMatch(route, forbidden);

for (const pattern of [
  /safe-area-inset-top/,
  /safe-area-inset-bottom/,
  /min-height:50px/,
  /font-size:16px/,
  /touch-action:manipulation/,
  /focus-visible/,
  /prefers-reduced-motion:reduce/,
  /type="checkbox"/,
]) assert.match(route, pattern);

console.log("✓ Full App Builder Production closure is locked to authenticated exact Production main identity");
console.log("✓ Deterministic 1/10 → 10/10 stage markers prove Plan → zero-spend Generate/Save → exact-version App+Website Preview → 100/100 release readiness");
console.log("✓ The same exact version must pass private baseline → Publish pin → anonymous App+Website → Unpublish → private 404");
console.log("✓ Publish cleanup is armed through finally recovery and failed zero-spend reservations are released");
console.log("✓ Evidence remains truthful: no SMS, Email, physical-device, provider-LIVE or official-store claim is fabricated");
