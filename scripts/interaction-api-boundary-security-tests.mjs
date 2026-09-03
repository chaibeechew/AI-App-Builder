import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HIGH_RISK_API_LIMITS,
  isUuid,
  isVerifiedUser,
} from "../lib/security/high-risk-api-boundary.js";

const voiceRoute = fs.readFileSync("app/api/voice/understand/route.js", "utf8");
const securityRoute = fs.readFileSync("app/api/security/route.js", "utf8");
const shareRoute = fs.readFileSync("app/api/share/route.js", "utf8");
const demoRoute = fs.readFileSync("app/api/demo/route.js", "utf8");
const creatorDomain = fs.readFileSync("lib/cloud/creator-operations.js", "utf8");
const creatorAdapter = fs.readFileSync("lib/cloud-adapters/creator-operations-data.js", "utf8");
const conversationEngine = fs.readFileSync("engine/soolen-conversation-engine.js", "utf8");
const demoMigration = fs.readFileSync("supabase/migrations/20260827090500_app_builder_entitlements.sql", "utf8");
const workflow = fs.readFileSync(".github/workflows/production-mobile-browser-qa.yml", "utf8");

assert.equal(HIGH_RISK_API_LIMITS.voiceUnderstandBytes, 32 * 1024);
assert.equal(HIGH_RISK_API_LIMITS.voiceTranscriptChars, 12_000);
assert.equal(HIGH_RISK_API_LIMITS.voiceHistoryItems, 24);
assert.equal(HIGH_RISK_API_LIMITS.securityScanBytes, 24 * 1024);
assert.equal(HIGH_RISK_API_LIMITS.securityScanTextChars, 20_000);
assert.equal(HIGH_RISK_API_LIMITS.shareBytes, 4 * 1024);
assert.equal(HIGH_RISK_API_LIMITS.demoBytes, 4 * 1024);
assert.equal(isUuid("00000000-0000-4000-8000-000000000000"), true);
assert.equal(isVerifiedUser({ phone_confirmed_at: "2026-09-03T00:00:00Z" }), true);

// Voice remains on its existing authenticated boundary; creator lifecycle routes now authenticate behind LANERIQ Cloud.
assert.match(voiceRoute, /auth\.getUser\(\)/, "Voice Understand must authenticate before protected work");
assert.match(voiceRoute, /isVerifiedUser\(user\)/, "Voice Understand must require a verified account");
for (const [label, source] of [
  ["Security Scan", securityRoute],
  ["Share Link", shareRoute],
  ["Demo", demoRoute],
]) {
  assert.match(source, /lib\/cloud\/creator-operations\.js/, `${label} must use the provider-opaque LANERIQ Cloud creator domain`);
  assert.match(source, /getCurrentCreatorPrincipal\(\{ requireVerified: true \}\)/, `${label} must authenticate and require verification before protected work`);
  assert.doesNotMatch(source, /lib\/supabase\/|@supabase\//, `${label} route must not directly import the current provider`);
}
assert.match(creatorDomain, /cloud-adapters\/creator-operations-data\.js/);
assert.doesNotMatch(creatorDomain, /lib\/supabase\/|@supabase\//, "LANERIQ Cloud creator domain must remain provider opaque");
assert.match(creatorAdapter, /auth\.getUser\(\)/, "Compatibility adapter must revalidate the current user server-side");
assert.match(creatorAdapter, /confirmed_at \|\| user\.email_confirmed_at \|\| user\.phone_confirmed_at/, "Compatibility adapter must derive verified-account state from trusted auth fields");
assert.match(creatorAdapter, /ACCOUNT_VERIFICATION_REQUIRED/);
assert.doesNotMatch(creatorAdapter, /createAdminClient|SERVICE_ROLE|SECRET_KEY/, "Creator lifecycle adapter must stay user-scoped/RLS-backed");

for (const [label, source] of [
  ["Voice Understand", voiceRoute],
  ["Security Scan", securityRoute],
  ["Share Link", shareRoute],
  ["Demo", demoRoute],
]) {
  assert.match(source, /readBoundedJson\(request,/, `${label} must use the streaming bounded JSON parser`);
  assert.match(source, /privateJson\(/, `${label} must return private no-store JSON`);
  assert.doesNotMatch(source, /await request\.json\(/, `${label} must not bypass bounded parsing`);
  assert.doesNotMatch(source, /console\.error\([^\n]*,\s*error\s*\)/, `${label} must not log full caught error objects`);
}

for (const pattern of [
  /HIGH_RISK_API_LIMITS\.voiceUnderstandBytes/,
  /HIGH_RISK_API_LIMITS\.voiceTranscriptChars/,
  /HIGH_RISK_API_LIMITS\.voiceHistoryItems/,
  /slice\(-HIGH_RISK_API_LIMITS\.voiceHistoryItems\)/,
  /content:\s*cleanText\(item\?\.content, 2_500\)/,
  /sanitizeCurrentUnderstanding/,
  /normalizedIdea:\s*cleanText\(value\.normalizedIdea, 3_000\)/,
  /converse\(\{/,
]) assert.match(voiceRoute, pattern);
assert.match(conversationEngine, /generateWithFallback\(prompt\)/, "Voice understanding must remain behind the Soolen provider router");
assert.doesNotMatch(voiceRoute, /GEMINI_API_KEY|OPENAI_API_KEY|ELEVENLABS_API_KEY/, "Voice Understand route must not read provider keys directly");

for (const pattern of [
  /HIGH_RISK_API_LIMITS\.securityScanBytes/,
  /HIGH_RISK_API_LIMITS\.securityScanTextChars/,
  /securityScan\(text\)/,
  /getCurrentCreatorPrincipal\(\{ requireVerified: true \}\)/,
]) assert.match(securityRoute, pattern);

for (const pattern of [
  /HIGH_RISK_API_LIMITS\.shareBytes/,
  /isUuid\(appId\)/,
  /crypto\.randomBytes\(24\)\.toString\("base64url"\)/,
  /createCreatorShare\(\{ projectId: appId, token \}\)/,
]) assert.match(shareRoute, pattern);
for (const pattern of [
  /\.eq\("owner_id", principal\.principal\.principalId\)/,
  /project\?\.current_version_id/,
  /\.from\("app_shares"\)/,
  /version_id:\s*project\.current_version_id/,
]) assert.match(creatorAdapter, pattern, "Share ownership/current-version checks must remain inside the compatibility adapter");
assert.doesNotMatch(shareRoute, /error:\s*error\.message/, "Share API must not expose raw provider errors");

for (const pattern of [
  /HIGH_RISK_API_LIMITS\.demoBytes/,
  /isUuid\(appId\)/,
  /isUuid\(versionId\)/,
  /createCreatorDemo\(\{ projectId: appId, versionId, hours: 72 \}\)/,
]) assert.match(demoRoute, pattern);
for (const pattern of [
  /create_app_demo/,
  /p_hours:\s*hours/,
]) assert.match(creatorAdapter, pattern, "Demo provider/RPC coupling must remain behind the LANERIQ Cloud adapter");
assert.doesNotMatch(demoRoute, /error:\s*error\.message/, "Demo API must not expose raw RPC errors");
for (const pattern of [
  /if not exists\(select 1 from public\.apps where id=p_app_id and owner_id=uid\)/,
  /if not exists\(select 1 from public\.app_versions where id=p_version_id and app_id=p_app_id\)/,
]) assert.match(demoMigration, pattern, "Demo RPC must preserve DB-level owner/version authorization");

assert.match(workflow, /Verify signed-out Production interaction API boundaries/);
assert.match(workflow, /production-interaction-api-boundary-qa\.mjs/);
assert.ok(
  workflow.indexOf("production-high-risk-api-boundary-qa.mjs") < workflow.indexOf("production-interaction-api-boundary-qa.mjs"),
  "Interaction API proof must run after the existing high-risk boundary gate"
);
assert.ok(
  workflow.indexOf("production-interaction-api-boundary-qa.mjs") < workflow.indexOf("production-mobile-browser-qa.mjs"),
  "Interaction API proof must run before browser QA"
);

console.log("✓ Voice Understand remains auth-first, verified, bounded and behind the Soolen provider router");
console.log("✓ Security Scan auth/verification moved behind LANERIQ Cloud without weakening bounded local execution");
console.log("✓ Share Link keeps owner/current-version authorization and cryptographic token generation behind the Cloud adapter");
console.log("✓ Demo creation keeps UUID validation plus DB-level owner/version authorization while hiding provider RPC coupling");
console.log("✓ Production workflow includes exact-SHA signed-out interaction-boundary proof before browser emulation");
console.log("✓ Authenticated conversation/scan/share/demo success, LIVE_PROVIDER, PHYSICAL_DEVICE and OFFICIAL_STORE remain separate evidence gates");
