const METERED_PROVIDERS = new Set(["gateway","openai","xai","deepseek","mistral","together","openrouter","gemini","groq","cerebras","cloudflare","huggingface"]);
const FREE_TIER_PROVIDERS = new Set(["openrouter","groq","gemini","cloudflare","huggingface","ollama","soolen-local"]);
const ZERO_COST_PROVIDERS = new Set(["ollama","soolen-local"]);

function list(value, fallback = []) {
  return String(value || fallback.join(",")).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function getSoolenCostMode(env = process.env) {
  const mode = String(env.SOOLEN_COST_MODE || "zero").trim().toLowerCase();
  return ["free","paid","balanced"].includes(mode) ? mode : "zero";
}

export function zeroCostProviders(env = process.env) {
  const requested = list(env.SOOLEN_ZERO_COST_PROVIDERS, ["ollama","soolen-local"]);
  return [...new Set(requested)].filter((provider) => ZERO_COST_PROVIDERS.has(provider));
}

export function freeTierProviders(env = process.env) {
  const requested = list(env.SOOLEN_FREE_TIER_PROVIDERS, ["openrouter","groq","gemini","cloudflare","huggingface","ollama","soolen-local"]);
  return requested.filter((provider) => FREE_TIER_PROVIDERS.has(provider));
}

export function filterProvidersByCost(providers = [], env = process.env) {
  const requested = [...new Set((Array.isArray(providers) ? providers : []).map((item) => String(item).toLowerCase()))];
  const mode = getSoolenCostMode(env);
  if (mode === "paid" || mode === "balanced") return requested;
  const allowed = new Set(mode === "free" ? freeTierProviders(env) : zeroCostProviders(env));
  return requested.filter((provider) => allowed.has(provider) && (mode === "free" || !METERED_PROVIDERS.has(provider)));
}

export function providerMayCharge(provider) {
  return METERED_PROVIDERS.has(String(provider || "").toLowerCase());
}

export function assertZeroCostProvider(provider, env = process.env) {
  if (getSoolenCostMode(env) === "zero") {
    const normalizedProvider = String(provider || "").trim().toLowerCase();
    const allowed = new Set(zeroCostProviders(env));
    if (!allowed.has(normalizedProvider) || providerMayCharge(normalizedProvider)) {
      throw new Error("SOOLEN_ZERO_COST_POLICY_BLOCKED_METERED_PROVIDER");
    }
  }
  return true;
}

export function zeroCostPolicy(env = process.env) {
  const mode = getSoolenCostMode(env);
  const noPaidUsage = mode === "zero" || mode === "free";
  return Object.freeze({
    mode,
    meteredProvidersAllowed: mode === "paid" || mode === "balanced",
    freeTierCloudAllowed: mode === "free",
    allowedProviders: mode === "zero" ? zeroCostProviders(env) : mode === "free" ? freeTierProviders(env) : null,
    deviceFirst: true,
    browserVoiceFirst: true,
    programmaticImagesFirst: true,
    cloudVideoAllowed: !noPaidUsage,
    externalSpendCap: noPaidUsage ? 0 : null,
    providerAccountHardStopRequired: mode === "free",
  });
}
