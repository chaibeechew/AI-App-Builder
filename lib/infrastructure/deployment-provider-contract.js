export const LANERIQ_DEPLOYMENT_PROVIDER_CONTRACT_VERSION = "2026-09-04.1";

export const DEPLOYMENT_STATUS = Object.freeze({
  QUEUED: "queued",
  BUILDING: "building",
  READY: "ready",
  ERROR: "error",
  CANCELED: "canceled",
  ROLLING_BACK: "rolling_back",
});

const DEPLOYMENT_STATUSES = new Set(Object.values(DEPLOYMENT_STATUS));
const REQUIRED_METHODS = Object.freeze([
  "prepareArtifact",
  "deploy",
  "getStatus",
  "getLogs",
  "rollback",
  "addDomain",
  "removeDomain",
  "setEnv",
  "healthCheck",
]);

function id(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_DEPLOYMENT_PROVIDER_${name}_REQUIRED`);
  return normalized;
}

function nonNegative(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, number);
}

export function normalizeDeploymentStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!DEPLOYMENT_STATUSES.has(normalized)) {
    throw new Error(`LANERIQ_DEPLOYMENT_STATUS_INVALID:${normalized || "missing"}`);
  }
  return normalized;
}

export function createDeploymentProviderDescriptor({
  id: providerId,
  supportedArtifactKinds = [],
  regions = [],
  healthy = true,
  commercialUseAllowed = true,
  fixedCostUsd = 0,
  estimatedDeploymentCostUsd = 0,
  freeQuotaRemainingRatio = 1,
  latencyMs = 0,
  buildTimeMs = 0,
  exitReadinessScore = 0,
} = {}) {
  return Object.freeze({
    id: id(providerId, "ID"),
    supportedArtifactKinds: Object.freeze([...new Set((Array.isArray(supportedArtifactKinds) ? supportedArtifactKinds : []).map((item) => String(item).trim().toLowerCase()).filter(Boolean))]),
    regions: Object.freeze([...new Set((Array.isArray(regions) ? regions : []).map((item) => String(item).trim().toLowerCase()).filter(Boolean))]),
    healthy: healthy !== false,
    commercialUseAllowed: commercialUseAllowed !== false,
    fixedCostUsd: nonNegative(fixedCostUsd),
    estimatedDeploymentCostUsd: nonNegative(estimatedDeploymentCostUsd),
    freeQuotaRemainingRatio: Math.min(1, nonNegative(freeQuotaRemainingRatio, 1)),
    latencyMs: nonNegative(latencyMs),
    buildTimeMs: nonNegative(buildTimeMs),
    exitReadinessScore: Math.min(100, nonNegative(exitReadinessScore)),
    providerOpaque: true,
  });
}

export function assertDeploymentProvider(provider) {
  if (!provider || typeof provider !== "object") throw new Error("LANERIQ_DEPLOYMENT_PROVIDER_REQUIRED");
  id(provider.id, "ID");
  for (const method of REQUIRED_METHODS) {
    if (typeof provider[method] !== "function") {
      throw new Error(`LANERIQ_DEPLOYMENT_PROVIDER_METHOD_REQUIRED:${method}`);
    }
  }
  return true;
}

export function publicDeploymentProviderContract() {
  return Object.freeze({
    version: LANERIQ_DEPLOYMENT_PROVIDER_CONTRACT_VERSION,
    requiredMethods: [...REQUIRED_METHODS],
    statuses: [...DEPLOYMENT_STATUSES],
    providerCredentialsOwnedByAdapter: true,
    coreDirectProviderApiAllowed: false,
    providerSdkAllowedInCore: false,
    providerOpaqueDescriptors: true,
    fixedInfrastructureCostRequired: false,
  });
}
