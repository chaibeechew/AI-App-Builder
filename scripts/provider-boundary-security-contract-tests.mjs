import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { filterProvidersByCost, getSoolenCostMode } from "../lib/soolen/cost-policy.js";

const read = (file) => fs.readFileSync(file, "utf8");
const community = read("app/api/community-chat/route.js");
const transcription = read("app/api/voice/transcribe/route.js");
const voice = read("app/api/soolenai/voice/route.js");
const clone = read("app/api/admin/soolenai-voice/clone/route.js");

// Community Chat must use the same cost-filtered Soolen router as the rest of the product.
assert.match(community, /generateWithFallback/);
assert.match(community, /MAX_MESSAGE_LENGTH\s*=\s*4000/);
assert.match(community, /MAX_HISTORY_MESSAGES\s*=\s*12/);
assert.doesNotMatch(community, /GEMINI_API_KEY|generativelanguage\.googleapis\.com|AI_MODEL\s*=|callGemini/);
assert.doesNotMatch(community, /provider:\s*generated|generated\?\.provider/);

// Cloud transcription is authenticated, Professional-only, bounded, and cannot reach OpenAI in zero/free mode.
for (const pattern of [
  /createServerClient/,
  /auth\.getUser\(\)/,
  /Authentication required/,
  /getSoolenSubscription/,
  /requirePaidTier/,
  /Professional access is required for cloud transcription/,
  /MAX_AUDIO_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/,
  /ALLOWED_AUDIO_TYPES/,
  /SOOLEN_STT_URL/,
  /SOOLEN_STT_TOKEN/,
  /getSoolenCostMode\(\)/,
  /mode !== "paid" && mode !== "balanced"/,
  /VOICE_METERED_PROVIDER_BLOCKED/,
  /api\.openai\.com\/v1\/audio\/transcriptions/,
  /Cache-Control.*private, no-store, max-age=0/,
]) assert.match(transcription, pattern);
assert.ok(transcription.indexOf("mode !== \"paid\"") < transcription.indexOf("https://api.openai.com/v1/audio/transcriptions"), "Paid-mode guard must execute before the metered OpenAI endpoint is reachable.");
assert.doesNotMatch(transcription, /detail:\s*detail|await response\.text\(\).*detail/);

// Neural TTS is a Professional capability; metered TTS is blocked unless operator cost mode explicitly allows spend.
for (const pattern of [
  /auth\.getUser\(\)/,
  /getSoolenSubscription/,
  /requirePaidTier/,
  /Professional access is required for neural voice generation/,
  /MAX_VOICE_BYTES\s*=\s*16\s*\*\s*1024\s*\*\s*1024/,
  /getSoolenCostMode\(\)/,
  /mode !== "paid" && mode !== "balanced"/,
  /Metered voice generation is disabled by the current cost policy/,
  /SOOLENAI_VOICE\.paidProvider/,
  /api\.elevenlabs\.io\/v1\/text-to-speech/,
]) assert.match(voice, pattern);
assert.ok(voice.indexOf("mode !== \"paid\"") < voice.indexOf("https://api.elevenlabs.io/v1/text-to-speech"), "TTS paid-mode guard must execute before the metered provider endpoint is reachable.");

// Admin voice cloning trusts only server-controlled app_metadata and needs two explicit operator gates.
for (const pattern of [
  /auth\.getUser\(\)/,
  /user\.app_metadata\?\.role/,
  /SOOLENAI_VOICE_CLONE_ENABLED/,
  /getSoolenCostMode\(\)/,
  /mode === "paid" \|\| mode === "balanced"/,
  /MAX_SAMPLE_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/,
  /ALLOWED_SAMPLE_TYPES/,
  /audio\.size/,
  /api\.elevenlabs\.io\/v1\/voices\/add/,
]) assert.match(clone, pattern);
assert.doesNotMatch(clone, /user\.user_metadata|user_metadata\?\.role/, "User-editable metadata must never grant admin provider access.");
assert.ok(clone.indexOf("paidCloneEnabled()") < clone.indexOf("https://api.elevenlabs.io/v1/voices/add"), "Explicit paid-clone policy must gate the provider call.");

// Guard against future API-route bypasses around the unified AI provider boundary.
function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}
const apiFiles = walk("app/api");
const googleDirect = apiFiles.filter((file) => /generativelanguage\.googleapis\.com/.test(read(file)));
assert.deepEqual(googleDirect, [], `App API routes must not bypass Soolen routing with direct Gemini calls: ${googleDirect.join(", ")}`);
const openAiDirect = apiFiles.filter((file) => /api\.openai\.com/.test(read(file)));
assert.deepEqual(openAiDirect, [path.join("app", "api", "voice", "transcribe", "route.js")], "Only the cost/entitlement-gated transcription adapter may contain the direct OpenAI STT endpoint.");
const elevenDirect = apiFiles.filter((file) => /api\.elevenlabs\.io/.test(read(file))).sort();
assert.deepEqual(elevenDirect, [
  path.join("app", "api", "admin", "soolenai-voice", "clone", "route.js"),
  path.join("app", "api", "soolenai", "voice", "route.js"),
].sort(), "Only the two explicitly cost-gated voice adapters may contain ElevenLabs endpoints.");

const hostile = { SOOLEN_COST_MODE: "zero", SOOLEN_ZERO_COST_PROVIDERS: "openai,gemini,ollama,soolen-local" };
assert.equal(getSoolenCostMode(hostile), "zero");
assert.deepEqual(filterProvidersByCost(["openai", "gemini", "ollama", "soolen-local"], hostile), ["ollama", "soolen-local"]);

console.log("✓ Community Chat cannot bypass the unified zero-cost Soolen AI router");
console.log("✓ Voice transcription requires auth + Professional access, bounds audio, and blocks metered STT in zero/free mode");
console.log("✓ Neural voice requires Professional access and blocks metered TTS unless paid/balanced mode is explicit");
console.log("✓ Admin voice cloning trusts app_metadata only and needs explicit operator enablement plus paid/balanced mode");
console.log("✓ App API provider scan prevents future direct Gemini/OpenAI/ElevenLabs bypasses outside approved guarded adapters");
