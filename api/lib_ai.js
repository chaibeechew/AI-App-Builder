// Compatibility adapter for the legacy /api handlers.
// All requests pass through the same cost-policy-enforced Soolen router used by
// the App Router endpoints. This prevents old handlers from bypassing zero-cost
// mode when cloud API keys happen to exist in the environment.

import { generateWithFallback } from "../engine/ai-provider.js";
import { getAvailableProviders } from "../engine/model-router.js";
import { filterProvidersByCost, zeroCostPolicy } from "../lib/soolen/cost-policy.js";

const MAX_PROMPT_LENGTH = Number(process.env.AI_MAX_PROMPT_LENGTH || 20000);

function validatePrompt(prompt) {
  if (typeof prompt !== "string") {
    const error = new Error("Invalid AI prompt.");
    error.status = 400;
    throw error;
  }
  const value = prompt.trim();
  if (!value) {
    const error = new Error("AI prompt is empty.");
    error.status = 400;
    throw error;
  }
  if (value.length > MAX_PROMPT_LENGTH) {
    const error = new Error(`AI prompt is too long. Maximum ${MAX_PROMPT_LENGTH} characters.`);
    error.status = 413;
    throw error;
  }
  return value;
}

export async function generateWithAI(prompt) {
  const response = await generateWithFallback(validatePrompt(prompt));
  return {
    text: response.result,
    provider: response.provider,
    attempts: response.attempts,
    quotaRatio: null,
  };
}

export function getProviderStatus() {
  const policy = zeroCostPolicy();
  const available = getAvailableProviders();
  const allowed = new Set(filterProvidersByCost(available.map((item) => item.provider)));

  return available
    .filter((item) => allowed.has(item.provider))
    .map((item) => ({
      name: item.provider,
      type: item.local ? "local" : "cloud",
      priority: item.priority,
      configured: true,
      available: true,
      failures: 0,
      success: 0,
      cooldownUntil: 0,
      lastQuotaRatio: null,
      costMode: policy.mode,
    }));
}
