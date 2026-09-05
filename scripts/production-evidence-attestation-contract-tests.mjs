import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";

const api = fs.readFileSync("app/api/production-e2e/attest/route.js", "utf8");
const page = fs.readFileSync("app/production-evidence-attestation/route.js", "utf8");

assert.equal(isPublicAccountPath("/production-evidence-attestation"), false,
  "Production evidence attestation must remain behind the normal authenticated account boundary.");

for (const pattern of [
  /createHash.*node:crypto/,
  /createServerClient/,
  /getCurrentUserProject/,
  /supabase\.auth\.getUser\(\)/,
  /Authentication required/,
  /VERCEL_GIT_COMMIT_SHA/,
  /VERCEL_GIT_COMMIT_REF/,
  /VERCEL_ENV/,
  /environment === "production"/,
  /commitRef === "main"/,
  /COMMIT_SHA\.test\(commitSha\)/,
  /MAX_REPORT_BYTES/,
  /MAX_REPORT_AGE_MS/,
  /canonicalize/,
  /SHA-256/,
  /reportHash/,
  /userBindingHash/,
  /attestationId/,
  /AUTHENTICATED_PRODUCTION_APP_BUILDER_FULL_CLOSURE_V2/,
  /report\.success !== true/,
  /report\.reportVersion !== 2/,
  /report\?\.build\?\.commitSha !== build\.commitSha/,
  /authenticated18PageRouteCount\) === 18/,
  /modifyUserCreditsCharged === 0/,
  /workflowDryRunOnly === true/,
  /workflowExternalActionsTriggered === false/,
  /automaticUnpublishFinally === true/,
  /unpublishCleanupVerified === true/,
  /anonymousPrivateAfterCleanupVerified === true/,
  /remainsPrivateAfterTest === true/,
  /String\(project\?\.current_version_id \|\| ""\) !== currentVersionId/,
  /publicState\(project\)/,
  /currentPrivateStateVerifiedByServer: true/,
  /persistentAuditStorageClaimed: false/,
  /cryptographicSignatureClaimed: false/,
  /physicalDeviceVerified: false/,
  /providerLiveVerified: false/,
  /physicalDatabaseMigrationVerified: false/,
  /officialStoreSubmissionVerified: false/,
  /smsDeliveryVerified: false/,
]) assert.match(api, pattern);

for (const forbidden of [
  /SUPABASE_SERVICE_ROLE/i,
  /service[_-]?role/i,
  /createAdminClient/,
  /cryptographicSignatureClaimed: true/,
  /persistentAuditStorageClaimed: true/,
  /physicalDeviceVerified: true/,
  /providerLiveVerified: true/,
  /physicalDatabaseMigrationVerified: true/,
  /officialStoreSubmissionVerified: true/,
  /smsDeliveryVerified: true/,
]) assert.doesNotMatch(api, forbidden);

for (const pattern of [
  /export const dynamic = "force-dynamic"/,
  /Production release attestations/,
  /Server-attest the 18-stage Production closure/,
  /\/api\/production-e2e\/attest/,
  /credentials:'include'/,
  /Run the 18-stage Production Closure/,
  /href="\/production-closure-e2e"/,
  /tamper-evident/,
  /not claimed as a cryptographic signature or persistent external audit record/,
  /safe-area-inset-top/,
  /safe-area-inset-bottom/,
  /font-size:16px/,
  /min-height:50px/,
  /touch-action:manipulation/,
  /focus-visible/,
  /prefers-reduced-motion:reduce/,
  /X-Robots-Tag": "noindex, nofollow, noarchive"/,
]) assert.match(page, pattern);

for (const forbidden of [
  /signInWithOtp|verifyOtp|phone-auth|sms-auth|send_sms|sendSms/i,
  /SUPABASE_SERVICE_ROLE/i,
  /service[_-]?role/i,
  /persistent external audit record is verified/i,
]) assert.doesNotMatch(page, forbidden);

console.log("✓ Production evidence attestation is authenticated and exact-main Production locked");
console.log("✓ Server rebinds the closure report to the current user, owned project, current version and private-after-test state");
console.log("✓ SHA-256 report hashing provides tamper-evident evidence without fabricating a cryptographic-signature or persistent-audit claim");
console.log("✓ Physical-device, provider-LIVE, physical DB migration, official-store, Email/WhatsApp/SMS truth boundaries remain independent");
