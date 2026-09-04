import assert from "node:assert/strict";
import fs from "node:fs";

const canonical = fs.readFileSync("app/api/laneriq/voice/route.js", "utf8");
const adapter = fs.readFileSync("lib/laneriq/voice-compatibility-adapter.js", "utf8");
const legacy = fs.readFileSync("app/api/soolenai/voice/route.js", "utf8");

assert.match(canonical, /handleLaneriqVoiceRequest/);
assert.match(canonical, /laneriqVoicePublicStatus/);
assert.match(canonical, /X-LANERIQ-Authority/);
assert.match(canonical, /export async function GET/);
assert.match(canonical, /export async function POST/);
assert.doesNotMatch(canonical, /lib\/soolen|lib\/supabase|SOOLENAI_|SoolenAI|ELEVENLABS|xi-api-key/);
assert.doesNotMatch(canonical, /SERVICE_ROLE|SECRET_KEY|API_KEY|ACCESS_TOKEN/);

assert.match(adapter, /createServerClient/);
assert.match(adapter, /getSoolenCostMode/);
assert.match(adapter, /getSoolenSubscription/);
assert.match(adapter, /requirePaidTier/);
assert.match(adapter, /SOOLENAI_VOICE/);
assert.match(adapter, /LANERIQ_VOICE_MAX_BYTES = 16 \* 1024 \* 1024/);
assert.match(adapter, /LANERIQ_VOICE_MAX_TEXT = 5000/);
assert.match(adapter, /target\.protocol !== "https:"/);
assert.match(adapter, /AbortController/);
assert.match(adapter, /Authentication required/);
assert.match(adapter, /Professional access is required/);
assert.match(adapter, /Unsupported LANERIQ voice language/);
assert.match(adapter, /providerNamesHidden: true/);
assert.match(adapter, /legacyRuntimeRequiredForConsumers: false/);
assert.match(adapter, /providerLiveVerified: false/);
assert.match(adapter, /realOutputQualityVerified: false/);
assert.doesNotMatch(adapter, /return.*apiKey|return.*token|providerNamesHidden:\s*false/);

assert.match(legacy, /export async function POST/);
assert.match(legacy, /SOOLENAI_VOICE_API_ERROR/);
assert.match(legacy, /Professional access is required for neural voice generation/);

console.log("✓ /api/laneriq/voice is the canonical LANERIQ Voice API surface");
console.log("✓ Canonical route has no direct SoolenAI, Supabase or provider-secret dependency");
console.log("✓ Legacy voice implementation is contained behind a LANERIQ compatibility adapter");
console.log("✓ Authentication, paid-tier, HTTPS provider, size and timeout safeguards are preserved");
console.log("✓ Provider LIVE and real-output quality remain truthfully unverified");
