const METERED_PROVIDERS = new Set(["gateway","openai","xai","deepseek","mistral","together","openrouter","gemini","groq","cerebras"]);

function list(value, fallback = []) {
  return String(value || fallback.join(",")).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function getSoolenCostMode(env = process.env) {
  const mode = String(env.SOOLEN_COST_MODE || "zero").trim().toLowerCase();
  return mode === "paid" || mode === "balanced" ? mode : "zero";
}

export function zeroCostProviders(env = process.env) {
  return list(env.SOOLEN_ZERO_COST_PROVIDERS, ["ollama","soolen-local"]);
}

export function filterProvidersByCost(providers = [], env = process.env) {
  const requested = [...new Set((Array.isArray(providers) ? providers : []).map((item) => String(item).toLowerCase()))];
  if (getSoolenCostMode(env) !== "zero") return requested;
  const allowed = new Set(zeroCostProviders(env));
  return requested.filter((provider) => allowed.has(provider) && !METERED_PROVIDERS.has(provider));
}

export function providerMayCharge(provider) {
  return METERED_PROVIDERS.has(String(provider || "").toLowerCase());
}

export function assertZeroCostProvider(provider, env = process.env) {
  if (getSoolenCostMode(env) === "zero" && providerMayCharge(provider)) {
    throw new Error("SOOLEN_ZERO_COST_POLICY_BLOCKED_METERED_PROVIDER");
  }
  return true;
}

export function zeroCostPolicy(env = process.env) {
  const mode = getSoolenCostMode(env);
  return Object.freeze({
    mode,
    meteredProvidersAllowed: mode !== "zero",
    allowedProviders: mode === "zero" ? zeroCostProviders(env) : null,
    deviceFirst: true,
    browserVoiceFirst: true,
    programmaticImagesFirst: true,
    cloudVideoAllowed: mode !== "zero",
    externalSpendCap: mode === "zero" ? 0 : null,
  });
}
