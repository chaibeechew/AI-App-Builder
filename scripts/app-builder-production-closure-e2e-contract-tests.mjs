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

const verifyIndex = route.indexOf("verifyExactProduction()");
const planIndex = route.indexOf("/api/orchestrate");
const reserveIndex = route.indexOf("/api/production-e2e/zero-spend");
const generateIndex = route.indexOf("/api/generate");
const persistedIndex = route.indexOf("'/api/apps/'+encodeURIComponent(appId)");
const previewIndex = route.indexOf("appPreviewPath='/a/'");
const qualityIndex = route.indexOf("'/quality'");
const baselineIndex = route.indexOf("before={app:await anonymousProbe");
const publishIndex = route.indexOf("'publish',rid('closure-publish')");
const publicIndex = route.indexOf("nonce+'-live-app'");
const unpublishIndex = route.indexOf("cleanup(appId,versionId,rid('closure-unpublish')");
const privateIndex = route.indexOf("nonce+'-after-app'");

assert.ok(verifyIndex > 0 && planIndex > verifyIndex && reserveIndex > planIndex && generateIndex > reserveIndex,
  "Closure must verify exact Production before Plan → zero-spend reserve → Generate.");
assert.ok(persistedIndex > generateIndex && previewIndex > persistedIndex && qualityIndex > previewIndex,
  "Closure must prove persisted exact version and owner previews before release readiness.");
assert.ok(baselineIndex > qualityIndex && publishIndex > baselineIndex && publicIndex > publishIndex && unpublishIndex > publicIndex && privateIndex > unpublishIndex,
  "Closure must prove private baseline → exact publish → anonymous public → unpublish → private again in order.");

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
console.log("✓ One run proves Plan → zero-spend Generate/Save → exact-version App+Website Preview → 100/100 release readiness");
console.log("✓ The same exact version must pass private baseline → Publish pin → anonymous App+Website → Unpublish → private 404");
console.log("✓ Publish cleanup is armed through finally recovery and failed zero-spend reservations are released");
console.log("✓ Evidence remains truthful: no SMS, Email, physical-device, provider-LIVE or official-store claim is fabricated");
