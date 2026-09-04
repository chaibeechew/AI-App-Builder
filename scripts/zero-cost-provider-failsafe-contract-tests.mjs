import assert from "node:assert/strict";

import {
  filterProvidersByCost,
  freeTierProviders,
  zeroCostPolicy,
  zeroCostProviders,
} from "../lib/soolen/cost-policy.js";
import { resolveSoolenCapabilities } from "../lib/soolen/capability-registry.js";

const blankZeroEnv = {
  SOOLEN_COST_MODE: "zero",
  SOOLEN_ZERO_COST_PROVIDERS: "   , ,   ",
};
assert.deepEqual(
  zeroCostProviders(blankZeroEnv),
  ["soolen-local"],
  "Blank zero-cost provider config must fail safe to the non-metered local runtime.",
);
assert.deepEqual(
  filterProvidersByCost(["openai", "gemini", "ollama", "soolen-local"], blankZeroEnv),
  ["soolen-local"],
  "Blank zero-cost config must never reopen metered providers.",
);

const invalidZeroEnv = {
  SOOLEN_COST_MODE: "zero",
  SOOLEN_ZERO_COST_PROVIDERS: "openai,gemini,mystery-cloud",
  OPENAI_API_KEY: "present-but-blocked",
  GEMINI_API_KEY: "present-but-blocked",
};
assert.deepEqual(
  zeroCostProviders(invalidZeroEnv),
  ["soolen-local"],
  "All-invalid or metered-only zero-cost config must retain only the local fallback.",
);
const invalidZeroPolicy = zeroCostPolicy(invalidZeroEnv);
assert.equal(invalidZeroPolicy.mode, "zero");
assert.equal(invalidZeroPolicy.meteredProvidersAllowed, false);
assert.equal(invalidZeroPolicy.externalSpendCap, 0);
assert.deepEqual(invalidZeroPolicy.allowedProviders, ["soolen-local"]);

const ollamaOnlyButUnconfiguredEnv = {
  SOOLEN_COST_MODE: "zero",
  SOOLEN_ZERO_COST_PROVIDERS: "ollama",
};
assert.deepEqual(
  zeroCostProviders(ollamaOnlyButUnconfiguredEnv),
  ["ollama", "soolen-local"],
  "A preferred local Ollama path must retain the built-in local fallback.",
);
const unconfiguredOllamaCapabilities = resolveSoolenCapabilities({ tier: "free", env: ollamaOnlyButUnconfiguredEnv });
assert.deepEqual(
  unconfiguredOllamaCapabilities.providers.text,
  ["soolen-local"],
  "Unconfigured Ollama must not make free text capability unavailable when the built-in local path exists.",
);

const configuredOllamaEnv = {
  SOOLEN_COST_MODE: "zero",
  SOOLEN_ZERO_COST_PROVIDERS: "ollama,ollama",
  OLLAMA_BASE_URL: "http://127.0.0.1:11434",
};
assert.deepEqual(
  zeroCostProviders(configuredOllamaEnv),
  ["ollama", "soolen-local"],
  "Duplicate provider config must deduplicate while preserving the local fallback.",
);
const configuredOllamaCapabilities = resolveSoolenCapabilities({ tier: "free", env: configuredOllamaEnv });
assert.deepEqual(configuredOllamaCapabilities.providers.text, ["ollama", "soolen-local"]);

const invalidFreeTierEnv = {
  SOOLEN_COST_MODE: "free",
  SOOLEN_FREE_TIER_PROVIDERS: "mystery-cloud,not-a-provider",
};
assert.deepEqual(
  freeTierProviders(invalidFreeTierEnv),
  ["soolen-local"],
  "Free-tier provider config must also retain the non-metered local fallback.",
);

for (const env of [blankZeroEnv, invalidZeroEnv, ollamaOnlyButUnconfiguredEnv, configuredOllamaEnv]) {
  const capabilities = resolveSoolenCapabilities({ tier: "free", env });
  assert.equal(capabilities.providers.costMode, "zero");
  assert.ok(capabilities.providers.text.includes("soolen-local"), "Zero-cost free text routing must always retain the local runtime.");
  assert.equal(capabilities.providers.premiumRouting, false);
  assert.equal(capabilities.policy.meteredProvidersAllowed, false);
  assert.equal(capabilities.policy.externalSpendCap, 0);

  for (const id of ["multilingual-chat", "app-website-builder", "coding-agent"]) {
    const capability = capabilities.capabilities.find((item) => item.id === id);
    assert.ok(capability, `Missing core capability ${id}`);
    assert.equal(capability.entitled, true);
    assert.equal(capability.configured, true, `${id} must remain configured despite malformed provider env.`);
    assert.equal(capability.status, "ready", `${id} must remain ready despite malformed provider env.`);
  }
}

console.log("✓ Malformed/blank zero-cost provider env cannot remove the built-in non-metered local fallback");
console.log("✓ Metered provider keys remain blocked even when the zero-cost allowlist is invalid");
console.log("✓ Ollama preference is preserved when configured, but unconfigured Ollama cannot zero out free text readiness");
console.log("✓ Free-tier provider configuration also retains the local fallback instead of becoming empty");
console.log("✓ Core free chat/app-builder/coding capabilities remain ready at externalSpendCap=0");
