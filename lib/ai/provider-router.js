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
  return names.filter((provider) => provider === LOCAL_PROVIDER || Boolean(process.env[PROVIDER_ENV[provider]]));
}

export function selectProvider({ preferred, extraProviders = [], failedProviders = [] } = {}) {
  const pool = getProviderPool(extraProviders);
  const failed = new Set(failedProviders);
  const ordered = preferred ? [preferred, ...pool] : pool;
  return [...new Set(ordered)].find((provider) => pool.includes(provider) && !failed.has(provider)) || null;
}

export function providerStatus() {
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
  neverPromiseUnlimitedCloudUsage: true,
  userVisibleProviderFailure: true,
  preserveCreditsOnFailedOperation: true,
});
