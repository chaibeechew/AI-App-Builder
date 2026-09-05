export const BILLION_SCALE_FREE_AI_VERSION = "2026-09-05.1";

export const CONNECTIVITY_STATES = Object.freeze([
  "online_fast",
  "online_limited",
  "online_expensive",
  "local_network_only",
  "offline",
]);

export const PRIVACY_CLASSES = Object.freeze({
  P0: "system",
  P1: "aggregate_operational",
  P2: "pseudonymous_minimal",
  P3: "user_private",
  P4: "highly_sensitive",
});

const ZERO_MODES = new Set(["zero", "free"]);
const INTERNET_STATES = new Set(["online_fast", "online_limited", "online_expensive"]);
const LOCAL_NETWORK_STATES = new Set(["online_fast", "online_limited", "online_expensive", "local_network_only"]);

function normalizeCostMode(value) {
  const mode = String(value || "zero").trim().toLowerCase();
  return ["zero", "free", "balanced", "paid"].includes(mode) ? mode : "zero";
}

export function normalizeConnectivityState(value) {
  const state = String(value || "online_fast").trim().toLowerCase();
  return CONNECTIVITY_STATES.includes(state) ? state : "online_fast";
}

export function connectivityCapabilities(value) {
  const state = normalizeConnectivityState(value);
  return Object.freeze({
    state,
    internetAvailable: INTERNET_STATES.has(state),
    localNetworkAvailable: LOCAL_NETWORK_STATES.has(state),
    cloudAllowedByConnectivity: INTERNET_STATES.has(state),
    offline: state === "offline",
    localNetworkOnly: state === "local_network_only",
    meteredOrConstrained: state === "online_limited" || state === "online_expensive",
  });
}

export function planFreeAiExecution({
  costMode = "zero",
  connectivityState = "online_fast",
  deterministicHit = false,
  reuseHit = false,
  cacheHit = false,
  localEngineAvailable = false,
  ownDeviceMeshAvailable = false,
  verifiedFreeProviderAvailable = false,
  sponsoredComputeAvailable = false,
  sponsoredHardStopVerified = false,
  byoComputeAvailable = false,
  byoUserApproved = false,
  queueAllowed = true,
  paidManagedAvailable = false,
  paidManagedAllowed = false,
} = {}) {
  const mode = normalizeCostMode(costMode);
  const network = connectivityCapabilities(connectivityState);
  const freeMode = ZERO_MODES.has(mode);

  const result = (route, reason, extra = {}) => Object.freeze({
    admitted: route !== "BLOCK",
    route,
    reason,
    costMode: mode,
    connectivityState: network.state,
    laneriqPaidInference: route === "PAID_MANAGED",
    laneriqSpendRisk: route === "PAID_MANAGED" ? 1 : 0,
    userProviderCostMayApply: route === "BYO_COMPUTE",
    networkRequired: ["VERIFIED_FREE_PROVIDER", "SPONSORED_COMPUTE", "BYO_COMPUTE", "PAID_MANAGED"].includes(route),
    paidManagedBlocked: freeMode,
    crossUserComputeAllowed: false,
    ...extra,
  });

  if (deterministicHit) return result("DETERMINISTIC", "deterministic_hit");
  if (reuseHit) return result("REUSE", "scoped_reuse_hit");
  if (cacheHit) return result("LOCAL_CACHE", "local_cache_hit");
  if (localEngineAvailable) return result("LOCAL_ENGINE", "local_engine_available");
  if (ownDeviceMeshAvailable && network.localNetworkAvailable) return result("OWN_DEVICE_MESH", "same_user_device_available");

  if (network.internetAvailable && mode === "free" && verifiedFreeProviderAvailable) {
    return result("VERIFIED_FREE_PROVIDER", "verified_free_provider_hard_stop");
  }
  if (network.internetAvailable && mode === "free" && sponsoredComputeAvailable && sponsoredHardStopVerified) {
    return result("SPONSORED_COMPUTE", "verified_sponsored_capacity");
  }
  if (network.internetAvailable && mode !== "zero" && byoComputeAvailable && byoUserApproved) {
    return result("BYO_COMPUTE", "user_approved_byo_compute");
  }
  if (queueAllowed && freeMode) {
    return result("QUEUE", network.internetAvailable ? "defer_until_zero_cost_capacity" : "offline_store_and_forward");
  }
  if (network.internetAvailable && (mode === "balanced" || mode === "paid") && paidManagedAvailable && paidManagedAllowed) {
    return result("PAID_MANAGED", "explicit_managed_paid_policy", { paidManagedBlocked: false });
  }
  return result("BLOCK", network.internetAvailable ? "no_authorized_capacity" : "offline_no_local_capacity");
}

export function assertFreeAiExecutionSafe(decision) {
  if (!decision || typeof decision !== "object") throw new Error("LANERIQ_FREE_AI_DECISION_REQUIRED");
  if ((decision.costMode === "zero" || decision.costMode === "free") && decision.route === "PAID_MANAGED") {
    throw new Error("LANERIQ_FREE_AI_MANAGED_PAID_FORBIDDEN");
  }
  if (decision.crossUserComputeAllowed !== false) throw new Error("LANERIQ_FREE_AI_CROSS_USER_COMPUTE_FORBIDDEN");
  if (decision.networkRequired && ["offline", "local_network_only"].includes(decision.connectivityState)) {
    throw new Error("LANERIQ_FREE_AI_REMOTE_ROUTE_WITHOUT_INTERNET");
  }
  return true;
}

export function planReconnectSync({
  privacyClass = "P1",
  connectivityState = "offline",
  privateSyncOptIn = false,
  encrypted = false,
  deltaAvailable = false,
} = {}) {
  const network = connectivityCapabilities(connectivityState);
  const level = Object.prototype.hasOwnProperty.call(PRIVACY_CLASSES, privacyClass) ? privacyClass : "P4";
  if (!network.internetAvailable) {
    return Object.freeze({ allowed: false, route: "LOCAL_ONLY", reason: "internet_unavailable", privacyClass: level, plaintextAllowed: false });
  }
  if (level === "P4") {
    return Object.freeze({ allowed: false, route: "BLOCK", reason: "highly_sensitive_never_auto_sync", privacyClass: level, plaintextAllowed: false });
  }
  if (level === "P3") {
    const allowed = privateSyncOptIn && encrypted && deltaAvailable;
    return Object.freeze({
      allowed,
      route: allowed ? "ENCRYPTED_DELTA" : "LOCAL_ONLY",
      reason: allowed ? "private_sync_opt_in_encrypted_delta" : "private_content_local_by_default",
      privacyClass: level,
      plaintextAllowed: false,
    });
  }
  return Object.freeze({
    allowed: true,
    route: level === "P2" ? "MINIMAL_PSEUDONYMOUS_METADATA" : "AGGREGATE_METADATA",
    reason: level === "P2" ? "minimal_pseudonymous_metadata_only" : "non_private_operational_metadata",
    privacyClass: level,
    plaintextAllowed: false,
  });
}

export function publicBillionScaleFreeAiPolicy() {
  return Object.freeze({
    version: BILLION_SCALE_FREE_AI_VERSION,
    localFirst: true,
    offlineCapableByDesign: true,
    cloudOptionalWherePossible: true,
    computeOnceReuseSafely: true,
    syncOnlyWhatIsNecessary: true,
    privacyByDefault: true,
    ownDeviceMeshBeforeRemote: true,
    crossUserComputeAllowed: false,
    freeModeManagedPaidFallbackAllowed: false,
    zeroModeManagedPaidFallbackAllowed: false,
    storeAndForwardWhenOffline: true,
    encryptedDeltaRequiredForPrivateSync: true,
    privateContentTelemetryDefaultAllowed: false,
    highlySensitiveAutoSyncAllowed: false,
    nativeOfflineModelRuntimeLive: false,
    sameUserLanMeshLive: false,
    encryptedCrossDeviceKeyExchangeLive: false,
    evidenceLevel: "CODE_READY",
    evidenceBoundary: "This policy proves routing/privacy invariants in code. It does not prove native offline model inference, same-user LAN mesh transport, secure cross-device key exchange, or billion-user capacity in live production.",
  });
}
