import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";
import { LANERIQ_18_PAGES } from "../lib/product/laneriq-18-page-master.js";

const route = fs.readFileSync("app/production-closure-e2e/route.js", "utf8");

assert.equal(isPublicAccountPath("/production-closure-e2e"), false,
  "Full App Builder Production closure must remain behind the normal authenticated account boundary.");
assert.equal(LANERIQ_18_PAGES.length, 18, "Production closure must probe the canonical 18-page product definition.");

for (const pattern of [
  /import \{ LANERIQ_18_PAGES \}/,
  /export const dynamic = "force-dynamic"/,
  /VERCEL_GIT_COMMIT_SHA/,
  /VERCEL_GIT_COMMIT_REF/,
  /VERCEL_ENV/,
  /environment === "production"/,
  /commitRef === "main"/,
  /COMMIT_SHA\.test\(commitSha\)/,
  /Production closure evidence is locked/,
  /cannot execute Generate, Modify, Database, Workflow, Publish or Unpublish evidence/,
  /X-Robots-Tag": "noindex, nofollow, noarchive"/,
  /SERVER_BUILD=Object\.freeze\(__EXPECTED_BUILD__\)/,
  /SURFACE_PAGES=Object\.freeze\(__SURFACE_PAGES__\)/,
  /LANERIQ_18_PAGES\.map/,
  /data\.product==='LANERIQ AI'/,
  /commitSha===SERVER_BUILD\.commitSha/,
]) assert.match(route, pattern);

const stageMarkers = [
  "1/18 Verifying exact Production main SHA",
  "2/18 Planning the App + Website",
  "3/18 Reserving zero-spend creation entitlement",
  "4/18 Generating and atomically saving App + Website",
  "5/18 Verifying persisted initial version",
  "6/18 Verifying owner App + Website previews",
  "7/18 Applying a no-user-credit AI modification and saving version 2",
  "8/18 Verifying append-only Version History and Undo rollback",
  "9/18 Building the safe no-code Database model",
  "10/18 Evolving and rolling back the Database model safely",
  "11/18 Creating an owned Safe Test workflow",
  "12/18 Running workflow Safe Test, replaying idempotently, then pausing it",
  "13/18 Verifying all 18 authenticated LANERIQ product routes",
  "14/18 Rechecking exact-current-version 100/100 release gate",
  "15/18 Proving anonymous private baseline",
  "16/18 Publishing the exact reviewed current version",
  "17/18 Verifying anonymous public App + Website",
  "18/18 Unpublishing and proving private state again",
];
const orderedStages = stageMarkers.map(marker => route.indexOf(marker));
assert.ok(orderedStages.every(index => index > 0), "Every 18-stage Production closure marker must exist exactly in source order.");
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
  /persisted\.app\.current_version_id!==initialVersionId/,
  /ownerHtml\(appPreviewPath\)/,
  /ownerHtml\(websitePreviewPath\)/,
  /post\('\/api\/modify'/,
  /expectedVersionId:initialVersionId/,
  /modified\.credits&&modified\.credits\.charged/,
  /\/rollback'/,
  /expectedCurrentVersionId:modifiedVersionId/,
  /rollbackVersions\.length<3/,
  /\/database'/,
  /providerHidden!==true/,
  /closure_notes/,
  /\/database\/rollback'/,
  /\/workflows'/,
  /type:'save_crm'/,
  /dryRun:true/,
  /workflowReplay\.replayed!==true/,
  /enabled:false/,
  /SURFACE_PAGES\.length!==18/,
  /resolveSurfacePath/,
  /\/api\/templates\?limit=1/,
  /surfaceEvidence\.count!==18/,
  /quality\.releaseReady!==true/,
  /quality\.version\.id!==versionId/,
  /credentials:'omit'/,
  /before\.app\.notFound/,
  /before\.website\.notFound/,
  /expectedVersionId:versionId/,
  /publish\.app\.published_version_id!==versionId/,
  /during\.app/,
  /during\.website/,
  /'unpublish'/,
  /publicState\(finalDetail\.app\)/,
  /after\.app\.notFound/,
  /after\.website\.notFound/,
  /if\(workflowId&&!workflowDisabled&&appId\)/,
  /if\(publishAttempted&&appId&&versionId&&!cleanupResult\?\.ok\)/,
  /closure-finally-unpublish/,
]) assert.match(route, pattern);

for (const pattern of [
  /AUTHENTICATED_PRODUCTION_APP_BUILDER_FULL_CLOSURE_V2/,
  /reportVersion:2/,
  /generationVerified:generated\.success===true/,
  /saveVerified:true/,
  /initialVersionVerified:true/,
  /appPreviewVerified:previews\[0\]\.ok/,
  /websitePreviewVerified:previews\[1\]\.ok/,
  /modifyVerified:true/,
  /modifyCreatedNewVersion:true/,
  /modifyUserCreditsCharged:0/,
  /versionHistoryVerified:true/,
  /appendOnlyUndoRollbackVerified:true/,
  /databaseModelVerified:true/,
  /databaseVersioningVerified:true/,
  /databaseRollbackVerified:true/,
  /workflowCreatedVerified:true/,
  /workflowSafeTestVerified:true/,
  /workflowIdempotencyReplayVerified:true/,
  /workflowDisabledAfterTest:workflowDisabled/,
  /authenticated18PageRoutesVerified:surfaceEvidence\.allHealthy/,
  /authenticated18PageRouteCount:surfaceEvidence\.count/,
  /releaseReadyVerified:true/,
  /publishExactVersionPinned:true/,
  /anonymousAppPublicVerified:true/,
  /anonymousWebsitePublicVerified:true/,
  /unpublishCleanupVerified:true/,
  /anonymousPrivateAfterCleanupVerified:true/,
  /remainsPrivateAfterTest:true/,
  /userCreditsCharged:0/,
  /projectCreditsCharged:0/,
  /writesExercised:true/,
  /workflowDryRunOnly:true/,
  /workflowExternalActionsTriggered:false/,
  /databasePhysicalMigrationClaimed:false/,
  /physicalDeviceVerified:false/,
  /originalGenerationProviderVerified:false/,
  /officialStoreSubmissionVerified:false/,
  /emailExercised:false/,
  /whatsappExercised:false/,
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
  /workflowExternalActionsTriggered:true/,
  /databasePhysicalMigrationClaimed:true/,
  /\/api\/credits/,
  /consumeAiCredits/,
  /standard_project_credits/,
  /type:'send_email'/,
  /type:'send_whatsapp'/,
  /type:'calendar'/,
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
console.log("✓ Deterministic 1/18 → 18/18 stages cover Plan → Generate/Save → Preview → AI Modify → append-only Undo → Database version/rollback → Workflow Safe Test/idempotency/pause");
console.log("✓ Canonical LANERIQ 18-page routes are probed from one owned test project before the exact current version can pass release readiness and publish");
console.log("✓ Publish cleanup and workflow pause are both armed through finally recovery; failed zero-spend creation reservations are released");
console.log("✓ Evidence remains truthful: no SMS/Email/WhatsApp, physical-device, provider-LIVE, physical DB migration or official-store claim is fabricated");
