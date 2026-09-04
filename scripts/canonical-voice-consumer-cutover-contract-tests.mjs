import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const productionQa = read("scripts/production-provider-boundary-qa.mjs");
const providerBoundary = read("scripts/provider-boundary-security-contract-tests.mjs");
const canonicalRoute = read("app/api/laneriq/voice/route.js");
const adapter = read("lib/laneriq/voice-compatibility-adapter.js");
const legacyRoute = read("app/api/soolenai/voice/route.js");

assert.match(productionQa, /pathname:\s*"\/api\/laneriq\/voice"/);
assert.doesNotMatch(productionQa, /pathname:\s*"\/api\/soolenai\/voice"/);
assert.match(providerBoundary, /\/api\\\/laneriq\\\/voice/);
assert.match(providerBoundary, /Production provider-boundary QA must exercise the LANERIQ canonical Voice API/);

assert.match(canonicalRoute, /handleLaneriqVoiceRequest/);
assert.match(canonicalRoute, /laneriqVoicePublicStatus/);
assert.doesNotMatch(canonicalRoute, /soolen|supabase|elevenlabs|OPENAI|GEMINI/i);

for (const marker of [
  'canonicalPath: "/api/laneriq/voice"',
  'legacyRuntimeRequiredForConsumers: false',
  'providerLiveVerified: false',
  'realOutputQualityVerified: false',
  'LANERIQ_VOICE_MAX_TEXT = 5000',
  'LANERIQ_VOICE_MAX_BYTES = 16 * 1024 * 1024',
]) assert.match(adapter, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

// Compatibility stays present until Production telemetry and rollback evidence prove retirement is safe.
assert.match(legacyRoute, /export async function POST/);
assert.match(legacyRoute, /Authentication required/);
assert.match(legacyRoute, /requirePaidTier/);

console.log("✓ Production Voice QA now consumes /api/laneriq/voice");
console.log("✓ The canonical route stays LANERIQ-owned and provider-opaque");
console.log("✓ Legacy /api/soolenai/voice remains compatibility-only instead of being deleted early");
console.log("✓ Provider LIVE and real-output-quality claims remain false until real evidence exists");
