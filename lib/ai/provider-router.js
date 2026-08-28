export const LOCAL_PROVIDER = "local-llama";

export const DEFAULT_PROVIDER_POOL = [
  LOCAL_PROVIDER,
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
  return names.filter((provider) => provider === LOCAL_PROVIDER || Boolean(PROVIDER_ENV[provider] && process.env[PROVIDER_ENV[provider]]));
}

export function selectProvider({ preferred, extraProviders = [], failedProviders = [], providerHealth = {} } = {}) {
  const pool = getProviderPool(extraProviders);
  const failed = new Set(failedProviders);
  const ordered = preferred ? [preferred, ...pool] : pool;
  return [...new Set(ordered)].find((provider) => {
    if (!pool.includes(provider) || failed.has(provider)) return false;
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
  // Provider identities stay internal. This status is for server-side routing only.
  return getProviderPool().map((provider) => ({
    provider,
    mode: provider === LOCAL_PROVIDER ? "local" : "cloud",
    configured: true,
  }));
}

export const AI_ROUTING_POLICY = Object.freeze({
  localFirst: true,
  cloudFallback: true,
  automaticFailover: true,
  proactiveQuotaSwitch: true,
  quotaSwitchThreshold: 0.8,
  providerIdentityInternalOnly: true,
  userVisibleProviderFailure: false,
  preserveCreditsOnFailedOperation: true,
});
