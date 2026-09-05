import { getSoolenCostMode } from "../soolen/cost-policy.js";

const MEDIA_KINDS = new Set(["image", "video"]);
const COST_CLASSES = new Set(["zero", "free", "metered"]);

function normalizeKind(value) {
  const kind = String(value || "").trim().toLowerCase();
  return MEDIA_KINDS.has(kind) ? kind : "image";
}

function normalizeCostClass(value) {
  const costClass = String(value || "metered").trim().toLowerCase();
  return COST_CLASSES.has(costClass) ? costClass : "metered";
}

function list(value) {
  return [...new Set(String(value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function hardStopEnvKey(kind) {
  return normalizeKind(kind) === "video"
    ? "VIDEO_RENDER_FREE_TIER_HARD_STOP_PROVIDERS"
    : "IMAGE_GENERATION_FREE_TIER_HARD_STOP_PROVIDERS";
}

export function mediaFreeTierHardStopProviders(kind, env = process.env) {
  return list(env[hardStopEnvKey(kind)]);
}

export function isMediaFreeTierHardStopVerified({ kind, provider, env = process.env } = {}) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  if (!normalizedProvider) return false;
  return new Set(mediaFreeTierHardStopProviders(kind, env)).has(normalizedProvider);
}

export function resolveMediaCostAdmission({
  kind,
  provider,
  costClass,
  connected,
  env = process.env,
} = {}) {
  const mediaKind = normalizeKind(kind);
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const declaredCostClass = normalizeCostClass(costClass);
  const costMode = getSoolenCostMode(env);
  const noPaidUsage = costMode === "zero" || costMode === "free";
  const freeTierHardStopVerified = declaredCostClass === "free"
    ? isMediaFreeTierHardStopVerified({ kind: mediaKind, provider: normalizedProvider, env })
    : false;

  if (!connected) {
    return Object.freeze({
      mediaKind,
      provider: normalizedProvider || null,
      costMode,
      declaredCostClass,
      effectiveCostClass: declaredCostClass,
      freeTierHardStopVerified,
      externalAllowed: false,
      blockedByCostPolicy: false,
      chargeRequired: false,
      zeroCostExecution: false,
      route: "NOT_CONNECTED",
      reason: "media_runtime_not_connected",
    });
  }

  // Video remains device/draft-first in zero/free launch modes. This preserves the
  // existing zero-cost product contract and prevents a remote renderer from becoming
  // an accidental spend path merely because it labels itself zero/free.
  if (mediaKind === "video" && noPaidUsage) {
    return Object.freeze({
      mediaKind,
      provider: normalizedProvider || null,
      costMode,
      declaredCostClass,
      effectiveCostClass: declaredCostClass,
      freeTierHardStopVerified,
      externalAllowed: false,
      blockedByCostPolicy: true,
      chargeRequired: false,
      zeroCostExecution: false,
      route: "DEVICE_OR_DRAFT",
      reason: "cloud_video_blocked_in_zero_or_free_mode",
    });
  }

  if (declaredCostClass === "zero") {
    return Object.freeze({
      mediaKind,
      provider: normalizedProvider || null,
      costMode,
      declaredCostClass,
      effectiveCostClass: "zero",
      freeTierHardStopVerified: true,
      externalAllowed: true,
      blockedByCostPolicy: false,
      chargeRequired: false,
      zeroCostExecution: true,
      route: "EXTERNAL_ZERO",
      reason: "declared_zero_cost_runtime",
    });
  }

  if (declaredCostClass === "free" && freeTierHardStopVerified && costMode !== "zero") {
    return Object.freeze({
      mediaKind,
      provider: normalizedProvider || null,
      costMode,
      declaredCostClass,
      effectiveCostClass: "free",
      freeTierHardStopVerified: true,
      externalAllowed: true,
      blockedByCostPolicy: false,
      chargeRequired: false,
      zeroCostExecution: true,
      route: "EXTERNAL_VERIFIED_FREE",
      reason: "provider_free_tier_hard_stop_verified",
    });
  }

  if (costMode === "balanced" || costMode === "paid") {
    return Object.freeze({
      mediaKind,
      provider: normalizedProvider || null,
      costMode,
      declaredCostClass,
      effectiveCostClass: "metered",
      freeTierHardStopVerified,
      externalAllowed: true,
      blockedByCostPolicy: false,
      chargeRequired: true,
      zeroCostExecution: false,
      route: "EXTERNAL_METERED",
      reason: declaredCostClass === "free"
        ? "unverified_free_runtime_treated_as_metered"
        : "metered_runtime_allowed_by_cost_mode",
    });
  }

  return Object.freeze({
    mediaKind,
    provider: normalizedProvider || null,
    costMode,
    declaredCostClass,
    effectiveCostClass: declaredCostClass === "free" ? "unverified_free" : declaredCostClass,
    freeTierHardStopVerified,
    externalAllowed: false,
    blockedByCostPolicy: true,
    chargeRequired: false,
    zeroCostExecution: false,
    route: "BLOCK",
    reason: declaredCostClass === "free"
      ? costMode === "zero"
        ? "zero_mode_allows_only_declared_zero_media_runtime"
        : "free_media_runtime_missing_verified_hard_stop"
      : "metered_media_runtime_blocked_by_cost_mode",
  });
}

export const MEDIA_ZERO_COST_POLICY = Object.freeze({
  version: "2026-09-05.2",
  supportedKinds: Object.freeze(["image", "video"]),
  zeroModeAllowsOnlyDeclaredZeroCostImageRuntime: true,
  freeModeImageRequiresProviderHardStop: true,
  zeroAndFreeModeCloudVideoBlocked: true,
  videoDeviceOrDraftFirstInNoSpendModes: true,
  unverifiedFreeTreatedAsMeteredWhenPaidAllowed: true,
  zeroAndVerifiedFreeDoNotRequireCredits: true,
  meteredRequiresPaidOrBalancedMode: true,
  providerIdentityServerSide: true,
  deterministicOrDraftFallbackRequired: true,
});
