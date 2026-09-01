import assert from "node:assert/strict";

import {
  assertZeroCostProvider,
  filterProvidersByCost,
  getSoolenCostMode,
  zeroCostPolicy,
  zeroCostProviders,
} from "../lib/soolen/cost-policy.js";
import { resolveSoolenCapabilities } from "../lib/soolen/capability-registry.js";

const hostileZeroEnv = {
  SOOLEN_COST_MODE: "zero",
  SOOLEN_ZERO_COST_PROVIDERS: "mystery-cloud,openai,gemini,ollama,soolen-local,ollama",
  OPENAI_API_KEY: "configured-but-must-not-run",
  GEMINI_API_KEY: "configured-but-must-not-run",
  SOOLEN_IMAGE_PROVIDER_URL: "https://paid.example.test/image",
  SOOLEN_VIDEO_PROVIDER_URL: "https://paid.example.test/video",
  SOOLEN_WEB_SEARCH_URL: "https://paid.example.test/search",
};

assert.equal(getSoolenCostMode(hostileZeroEnv), "zero");
assert.deepEqual(
  zeroCostProviders(hostileZeroEnv),
  ["ollama", "soolen-local"],
  "Zero-cost provider configuration must be an explicit allowlist, not an unknown-provider pass-through.",
);
assert.deepEqual(
  filterProvidersByCost(["mystery-cloud", "openai", "gemini", "ollama", "soolen-local"], hostileZeroEnv),
  ["ollama", "soolen-local"],
  "Unknown and metered cloud providers must be removed in zero-cost mode.",
);
assert.throws(
  () => assertZeroCostProvider("mystery-cloud", hostileZeroEnv),
  /SOOLEN_ZERO_COST_POLICY_BLOCKED_METERED_PROVIDER/,
  "An unknown provider must fail closed in zero-cost mode.",
);
assert.throws(
  () => assertZeroCostProvider("openai", hostileZeroEnv),
  /SOOLEN_ZERO_COST_POLICY_BLOCKED_METERED_PROVIDER/,
  "A known metered provider must fail closed in zero-cost mode.",
);
assert.doesNotThrow(() => assertZeroCostProvider("ollama", hostileZeroEnv));
assert.doesNotThrow(() => assertZeroCostProvider("soolen-local", hostileZeroEnv));

const zeroPolicy = zeroCostPolicy(hostileZeroEnv);
assert.equal(zeroPolicy.mode, "zero");
assert.equal(zeroPolicy.meteredProvidersAllowed, false);
assert.equal(zeroPolicy.freeTierCloudAllowed, false);
assert.equal(zeroPolicy.cloudVideoAllowed, false);
assert.equal(zeroPolicy.externalSpendCap, 0);
assert.equal(zeroPolicy.deviceFirst, true);
assert.equal(zeroPolicy.browserVoiceFirst, true);
assert.equal(zeroPolicy.programmaticImagesFirst, true);
assert.deepEqual(zeroPolicy.allowedProviders, ["ollama", "soolen-local"]);

const freeCapabilities = resolveSoolenCapabilities({ tier: "free", env: hostileZeroEnv });
assert.equal(freeCapabilities.providers.costMode, "zero");
assert.deepEqual(freeCapabilities.providers.text, ["ollama", "soolen-local"]);
assert.equal(freeCapabilities.providers.premiumRouting, false);
assert.equal(freeCapabilities.policy.failClosed, true);
assert.equal(freeCapabilities.policy.externalSpendCap, 0);

for (const id of [
  "multilingual-chat",
  "app-website-builder",
  "coding-agent",
  "visual-understanding",
  "local-image-creation",
  "browser-voice",
  "video-storyboard",
  "project-memory",
]) {
  const capability = freeCapabilities.capabilities.find((item) => item.id === id);
  assert.ok(capability, `Missing free capability ${id}`);
  assert.equal(capability.entitled, true, `${id} must remain available to the free tier`);
  assert.equal(capability.status, "ready", `${id} must have a zero-cost ready path`);
}

for (const id of [
  "advanced-reasoning",
  "premium-image-studio",
  "cloud-transcription",
  "premium-neural-voice",
  "premium-video-studio",
  "live-web-research",
]) {
  const capability = freeCapabilities.capabilities.find((item) => item.id === id);
  assert.ok(capability, `Missing professional capability ${id}`);
  assert.equal(capability.entitled, false, `${id} must not masquerade as a free capability`);
  assert.equal(capability.status, "professional_access_required", `${id} must fail closed before Professional access`);
}

const proCapabilities = resolveSoolenCapabilities({ tier: "pro", env: hostileZeroEnv });
for (const id of ["premium-image-studio", "premium-video-studio", "live-web-research"]) {
  const capability = proCapabilities.capabilities.find((item) => item.id === id);
  assert.ok(capability, `Missing pro capability ${id}`);
  assert.equal(capability.entitled, true);
  assert.notEqual(capability.status, "ready", `${id} must not claim live paid-cloud readiness while zero-cost mode blocks it`);
}

console.log("✓ Zero-cost mode now uses an explicit provider allowlist and rejects unknown/metered providers");
console.log("✓ Free LANERIQ AI App/Website, local image, browser voice, storyboard and memory paths remain ready at zero external spend");
console.log("✓ Paid cloud image/video/web capabilities remain fail-closed and cannot be promoted to ready by stray provider URLs in zero-cost mode");
