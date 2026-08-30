import { filterProvidersByCost, getSoolenCostMode } from "../soolen/cost-policy.js";

export const LOCAL_PROVIDER = "ollama";

export const DEFAULT_PROVIDER_POOL = [
  "openrouter",
  "groq",
  "gemini",
  "cloudflare",
  "huggingface",
  LOCAL_PROVIDER,
  "soolen-local",
  "deepseek",
  "openai",
];

const PROVIDER_ENV = {
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  gemini: "GEMINI_API_KEY",
  huggingface: "HF_TOKEN",
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
};

function providerConfigured(provider) {
  if (provider === "soolen-local") return true;
  if (provider === LOCAL_PROVIDER) return Boolean(process.env.OLLAMA_BASE_URL);
  if (provider === "cloudflare") return Boolean(process.env.CLOUDFLARE_AI_ACCOUNT_ID && process.env.CLOUDFLARE_AI_API_TOKEN);
  if (provider === "huggingface") return Boolean(process.env.HF_TOKEN && process.env.HF_MODEL);
  return Boolean(PROVIDER_ENV[provider] && process.env[PROVIDER_ENV[provider]]);
}

export function getProviderPool(extraProviders = []) {
  const requested = Array.isArray(extraProviders) ? extraProviders : [];
  const names = [...new Set([...DEFAULT_PROVIDER_POOL, ...requested.map(String)])];
  const configured = names.filter(providerConfigured);
  return filterProvidersByCost(configured);
}

export function selectProvider({
  providers = [],
  preferred,
  extraProviders = [],
  failedProviders = [],
  providerHealth = {},
} = {}) {
  const explicitPool = Array.isArray(providers) && providers.length > 0
    ? providers.map(String)
    : Array.isArray(extraProviders) && extraProviders.length > 0
      ? extraProviders.map(String)
      : getProviderPool();
  const failed = new Set(failedProviders.map(String));
  const ordered = preferred ? [String(preferred), ...explicitPool] : explicitPool;
  return [...new Set(ordered)].find((provider) => {
    if (!explicitPool.includes(provider) || failed.has(provider)) return false;
    const health = providerHealth[provider] || {};
    return health.available !== false && health.quotaExceeded !== true;
  }) || null;
}

export function selectProviderBeforeLimit({ providers = DEFAULT_PROVIDER_POOL, usage = {}, threshold = 0.8 } = {}) {
  const list = Array.isArray(providers) ? providers : DEFAULT_PROVIDER_POOL;
  return list.find((provider) => {
    const item = usage[provider] || {};
    if (item.available === false || item.quotaExceeded === true) return false;
    if (typeof item.remainingRatio === "number" && item.remainingRatio <= 1 - threshold) return false;
    return true;
  }) || null;
}

export function providerStatus() {
  return getProviderPool().map((provider) => ({
    provider,
    mode: provider === LOCAL_PROVIDER || provider === "soolen-local" ? "local" : "cloud",
    configured: true,
    costMode: getSoolenCostMode(),
  }));
}

export const AI_ROUTING_POLICY = Object.freeze({
  localFirst: getSoolenCostMode() === "zero",
  localFallbackAlways: true,
  cloudFallback: getSoolenCostMode() !== "zero",
  automaticFailover: true,
  proactiveQuotaSwitch: true,
  quotaSwitchThreshold: 0.8,
  providerIdentityInternalOnly: true,
  userVisibleProviderFailure: false,
  preserveCreditsOnFailedOperation: true,
});
