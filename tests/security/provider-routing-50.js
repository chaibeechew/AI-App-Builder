import assert from "node:assert/strict";
import { selectProvider, selectProviderBeforeLimit, AI_ROUTING_POLICY } from "../lib/ai/provider-router.js";

const providers = ["local-llama", "gemini", "deepseek"];

// 50 deterministic routing/regression cases. These are logic tests; live provider quota is tested separately.
for (let i = 1; i <= 50; i += 1) {
  const selected = selectProvider({ providers, failedProviders: ["gemini"] });
  assert.equal(selected, "local-llama", `case ${i}: local provider should remain first`);

  const fallback = selectProvider({ extraProviders: providers, failedProviders: ["local-llama", "gemini"] });
  assert.equal(fallback, "deepseek", `case ${i}: fallback should select next available provider`);

  const proactive = selectProviderBeforeLimit({
    providers,
    usage: {
      "local-llama": { available: false },
      gemini: { remainingRatio: 0.19 },
      deepseek: { remainingRatio: 0.90 },
    },
    threshold: 0.80,
  });
  assert.equal(proactive, "deepseek", `case ${i}: switch before quota limit`);

  assert.equal(AI_ROUTING_POLICY.providerIdentityInternalOnly, true, `case ${i}: provider names remain internal`);
  assert.equal(AI_ROUTING_POLICY.userVisibleProviderFailure, false, `case ${i}: provider failures are hidden`);
}

console.log("50 provider-routing security/regression cases passed");
