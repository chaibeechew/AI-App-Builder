import { generateWithFallback, getProviderRuntimeTruth } from "../../engine/ai-provider.js";
import { getSoolenCostMode, zeroCostPolicy } from "../soolen/cost-policy.js";
import { deriveProviderComputeTelemetry } from "./provider-compute-telemetry.js";

const EXACT_SHA = /^[a-f0-9]{40}$/i;

function releaseIdentity(env = process.env) {
  const sha = String(env.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  const environment = String(env.VERCEL_ENV || "").trim().toLowerCase() || "unknown";
  const projectId = String(env.VERCEL_PROJECT_ID || "").trim() || null;
  return Object.freeze({
    sha: EXACT_SHA.test(sha) ? sha : null,
    environment,
    projectId,
    production: environment === "production",
  });
}

export function providerRouterProductionTruth(env = process.env) {
  const runtime = getProviderRuntimeTruth();
  const policy = zeroCostPolicy(env);
  const release = releaseIdentity(env);
  const computeFabricTelemetry = deriveProviderComputeTelemetry(runtime, env);
  return Object.freeze({
    service: "laneriq-provider-router",
    contract: "prtr1",
    releaseSha: release.sha,
    releaseEnvironment: release.environment,
    releaseProjectId: release.projectId,
    exactReleaseIdentity: Boolean(release.production && release.sha),
    costMode: getSoolenCostMode(env),
    zeroCostLaunchMode: getSoolenCostMode(env) === "zero",
    externalSpendCap: policy.externalSpendCap,
    configuredProviderCount: runtime.configuredProviderCount,
    configuredLocalProviderCount: runtime.configuredLocalProviderCount,
    configuredRemoteProviderCount: runtime.configuredRemoteProviderCount,
    coolingDownProviderCount: runtime.coolingDownProviderCount,
    quotaGuardedProviderCount: runtime.quotaGuardedProviderCount,
    runtimeRequests: runtime.runtimeRequests,
    runtimeSuccesses: runtime.runtimeSuccesses,
    runtimeFailovers: runtime.runtimeFailovers,
    proactiveQuotaSwitches: runtime.proactiveQuotaSwitches,
    blockedByCost: runtime.blockedByCost,
    localSuccessesObservedInInstance: runtime.localSuccessesObservedInInstance,
    remoteSuccessesObservedInInstance: runtime.remoteSuccessesObservedInInstance,
    computeFabricTelemetry,
    codeCapabilities: Object.freeze({
      ...runtime.codeCapabilities,
      computeFabricRuntimeTelemetry: true,
      zeroCostResolutionRateFloor: true,
    }),
    providerIdentityInternalOnly: true,
    externalProviderRuntimeObservedInInstance: runtime.externalProviderRuntimeObservedInInstance,
    externalProvidersLiveVerified: false,
    externalProviderEvidenceLevel: "EVIDENCE_REQUIRED",
    codeReady: true,
    live: false,
    evidenceLevel: "CODE_READY",
  });
}

export async function runZeroCostProviderRouterCanary(env = process.env) {
  const release = releaseIdentity(env);
  const startedAt = Date.now();
  const result = await generateWithFallback(
    "LANERIQ Provider Router production canary. Validate the local zero-cost execution path and return a concise capability response.",
    { providers: ["soolen-local"] },
  );
  const success = result?.provider === "soolen-local" && result?.attempts === 1 && Array.isArray(result?.errors) && result.errors.length === 0;
  const productionEvidence = Boolean(success && release.production && release.sha);
  return Object.freeze({
    success,
    providerClass: "LOCAL_ZERO_COST",
    attempts: Number(result?.attempts || 0),
    fallbackErrors: Array.isArray(result?.errors) ? result.errors.length : 0,
    durationMs: Math.max(0, Date.now() - startedAt),
    costMode: getSoolenCostMode(env),
    meteredProviderAttempted: false,
    externalProviderInvoked: false,
    releaseSha: release.sha,
    releaseEnvironment: release.environment,
    exactReleaseIdentity: Boolean(release.production && release.sha),
    externalProvidersLiveVerified: false,
    evidenceLevel: productionEvidence ? "PRODUCTION_ZERO_COST_ROUTER_CANARY" : "RUNTIME_ZERO_COST_ROUTER_CANARY",
  });
}
