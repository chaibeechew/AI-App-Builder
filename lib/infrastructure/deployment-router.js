import { assertDeploymentProvider } from "./deployment-provider-contract.js";

export const LANERIQ_DEPLOYMENT_ROUTER_VERSION = "2026-09-04.1";

function validateManifest(manifest) {
  if (!manifest || manifest.schema !== "laneriq.project") throw new Error("LANERIQ_DEPLOYMENT_ROUTER_MANIFEST_REQUIRED");
  if (!Array.isArray(manifest.artifacts)) throw new Error("LANERIQ_DEPLOYMENT_ROUTER_ARTIFACTS_REQUIRED");
  return manifest;
}

function findArtifact(manifest, artifactId) {
  const id = String(artifactId || "").trim();
  if (!id) throw new Error("LANERIQ_DEPLOYMENT_ROUTER_ARTIFACT_ID_REQUIRED");
  const artifact = manifest.artifacts.find((item) => item.id === id);
  if (!artifact) throw new Error(`LANERIQ_DEPLOYMENT_ROUTER_ARTIFACT_NOT_FOUND:${id}`);
  return artifact;
}

function scoreProvider(provider) {
  const latencyPenalty = Math.min(18, Number(provider.latencyMs || 0) / 150);
  const buildPenalty = Math.min(18, Number(provider.buildTimeMs || 0) / 5000);
  const variableCostPenalty = Math.min(40, Number(provider.estimatedDeploymentCostUsd || 0) * 1000);
  const fixedCostPenalty = Math.min(40, Number(provider.fixedCostUsd || 0) * 100);
  const quotaBonus = Math.min(1, Math.max(0, Number(provider.freeQuotaRemainingRatio ?? 0))) * 20;
  const exitBonus = Math.min(100, Math.max(0, Number(provider.exitReadinessScore || 0))) * 0.2;
  return Number((100 + quotaBonus + exitBonus - latencyPenalty - buildPenalty - variableCostPenalty - fixedCostPenalty).toFixed(6));
}

export function planDeployment({
  manifest,
  artifactId,
  providers = [],
  requiredRegion = null,
  zeroFixedCostMode = true,
  paidRoutingAllowed = false,
  maximumEstimatedCostUsd = 0,
} = {}) {
  const portableManifest = validateManifest(manifest);
  const artifact = findArtifact(portableManifest, artifactId);
  const region = requiredRegion ? String(requiredRegion).trim().toLowerCase() : null;
  const maxCost = Math.max(0, Number(maximumEstimatedCostUsd || 0));
  const rejected = [];
  const eligible = [];

  for (const provider of Array.isArray(providers) ? providers : []) {
    const providerId = String(provider?.id || "").trim();
    if (!providerId) throw new Error("LANERIQ_DEPLOYMENT_ROUTER_PROVIDER_ID_REQUIRED");
    const supportedKinds = new Set(Array.isArray(provider.supportedArtifactKinds) ? provider.supportedArtifactKinds : []);
    const regions = new Set(Array.isArray(provider.regions) ? provider.regions : []);
    const fixedCost = Math.max(0, Number(provider.fixedCostUsd || 0));
    const estimatedCost = Math.max(0, Number(provider.estimatedDeploymentCostUsd || 0));
    let reason = null;

    if (provider.healthy === false) reason = "provider_unhealthy";
    else if (provider.commercialUseAllowed === false) reason = "commercial_use_not_allowed";
    else if (!supportedKinds.has(artifact.kind)) reason = "artifact_kind_not_supported";
    else if (region && regions.size > 0 && !regions.has(region)) reason = "required_region_not_supported";
    else if (zeroFixedCostMode && fixedCost > 0) reason = "fixed_cost_forbidden";
    else if (!paidRoutingAllowed && estimatedCost > 0) reason = "paid_deployment_not_authorized";
    else if (estimatedCost > maxCost) reason = "estimated_cost_above_cap";
    else if (Number(provider.freeQuotaRemainingRatio ?? 1) <= 0 && estimatedCost === 0) reason = "free_quota_exhausted";

    if (reason) rejected.push(Object.freeze({ providerId, reason }));
    else eligible.push(Object.freeze({ ...provider, score: scoreProvider(provider) }));
  }

  eligible.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  const selected = eligible[0] || null;
  return Object.freeze({
    version: LANERIQ_DEPLOYMENT_ROUTER_VERSION,
    decision: selected ? "deploy" : "defer",
    providerId: selected ? String(selected.id) : null,
    artifactId: artifact.id,
    artifactKind: artifact.kind,
    artifactDigest: artifact.digest || null,
    requiredRegion: region,
    score: selected?.score ?? null,
    reason: selected ? "best_policy_compliant_provider" : "no_policy_compliant_provider",
    rejected: Object.freeze(rejected),
    providerOpaque: true,
    coreDirectProviderApiCalls: false,
    zeroFixedCostMode: Boolean(zeroFixedCostMode),
  });
}

export async function executeDeploymentPlan({ plan, provider, manifest } = {}) {
  if (!plan || plan.decision !== "deploy" || !plan.providerId) throw new Error("LANERIQ_DEPLOYMENT_ROUTER_EXECUTABLE_PLAN_REQUIRED");
  validateManifest(manifest);
  assertDeploymentProvider(provider);
  if (String(provider.id) !== String(plan.providerId)) throw new Error("LANERIQ_DEPLOYMENT_ROUTER_PROVIDER_PLAN_MISMATCH");
  const artifact = await provider.prepareArtifact({
    manifest,
    artifactId: plan.artifactId,
    artifactKind: plan.artifactKind,
    artifactDigest: plan.artifactDigest,
  });
  return provider.deploy({ artifact, plan });
}

export function publicDeploymentRouterPolicy() {
  return Object.freeze({
    version: LANERIQ_DEPLOYMENT_ROUTER_VERSION,
    providerOpaque: true,
    artifactFirst: true,
    zeroFixedCostFirst: true,
    commercialUseEligibilityRequired: true,
    paidDeploymentRequiresExplicitPolicy: true,
    providerCredentialsInCoreAllowed: false,
    coreDirectProviderApiCallsAllowed: false,
    deterministicTieBreak: "provider_id_ascending",
    fixedInfrastructureCostRequired: false,
  });
}
