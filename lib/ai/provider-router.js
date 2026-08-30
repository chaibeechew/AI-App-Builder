import { filterProvidersByCost, getSoolenCostMode } from "../soolen/cost-policy.js";

export const LOCAL_PROVIDER = "ollama";

export const DEFAULT_PROVIDER_POOL = [
  LOCAL_PROVIDER,
  "soolen-local",
  "gemini",
  "deepseek",
  "openai",
];

const PROVIDER_ENV = {
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
};

export function getProviderPool(extraProviders = []) {
  const requested = Array.isArray(extraProviders) ? extraProviders : [];
  const names = [...new Set([...DEFAULT_PROVIDER_POOL, ...requested.map(String)])];
  const configured = names.filter(
    (provider) =>
      provider === "soolen-local" ||
      (provider === LOCAL_PROVIDER && Boolean(process.env.OLLAMA_BASE_URL)) ||
      Boolean(PROVIDER_ENV[provider] && process.env[PROVIDER_ENV[provider]])
  );
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
  localFirst: true,
  cloudFallback: getSoolenCostMode() !== "zero",
  automaticFailover: true,
  proactiveQuotaSwitch: true,
  quotaSwitchThreshold: 0.8,
  providerIdentityInternalOnly: true,
  userVisibleProviderFailure: false,
  preserveCreditsOnFailedOperation: true,
});
