import { assertCloudCapability, CLOUD_EXECUTION_TARGETS } from "./contracts.js";
import { assertCloudTransferAllowed, DATA_CLASS, normalizeDataClass } from "./security-policy.js";

export const LANERIQ_RESOURCE_ROUTER_VERSION = "2026-09-03.1";

function firstAvailable(candidates, availableAdapters) {
  const available = new Set(Array.isArray(availableAdapters) ? availableAdapters : []);
  return candidates.find((candidate) => available.has(candidate)) || null;
}

export function resolveCloudResourceRoute({
  capability,
  dataClass = DATA_CLASS.NORMAL,
  requiresCloud = false,
  clientSideEncrypted = false,
  zeroCostMode = true,
  availableAdapters = [],
} = {}) {
  const normalizedCapability = assertCloudCapability(capability);
  const normalizedDataClass = normalizeDataClass(dataClass);

  if (normalizedDataClass === DATA_CLASS.SECRET) {
    assertCloudTransferAllowed({ dataClass: normalizedDataClass, executionContext: "server", target: CLOUD_EXECUTION_TARGETS.SECRET_VAULT });
    return Object.freeze({
      routerVersion: LANERIQ_RESOURCE_ROUTER_VERSION,
      capability: normalizedCapability,
      target: CLOUD_EXECUTION_TARGETS.SECRET_VAULT,
      adapter: firstAvailable(["vault"], availableAdapters),
      reason: "secret_vault_only",
      failClosed: true,
    });
  }

  if (!requiresCloud) {
    return Object.freeze({
      routerVersion: LANERIQ_RESOURCE_ROUTER_VERSION,
      capability: normalizedCapability,
      target: CLOUD_EXECUTION_TARGETS.LOCAL_DEVICE,
      adapter: null,
      reason: "local_first",
      failClosed: true,
    });
  }

  if (normalizedDataClass === DATA_CLASS.PRIVATE) {
    assertCloudTransferAllowed({
      dataClass: normalizedDataClass,
      executionContext: "browser",
      clientSideEncrypted,
      target: CLOUD_EXECUTION_TARGETS.SHARED_CLOUD,
    });
  }

  const adapterPreference = zeroCostMode
    ? ["shared-free", "shared-default"]
    : ["shared-default", "shared-free", "dedicated"];
  const adapter = firstAvailable(adapterPreference, availableAdapters);

  if (!adapter) {
    return Object.freeze({
      routerVersion: LANERIQ_RESOURCE_ROUTER_VERSION,
      capability: normalizedCapability,
      target: CLOUD_EXECUTION_TARGETS.LOCAL_DEVICE,
      adapter: null,
      reason: "no_eligible_cloud_adapter_fail_closed",
      failClosed: true,
    });
  }

  return Object.freeze({
    routerVersion: LANERIQ_RESOURCE_ROUTER_VERSION,
    capability: normalizedCapability,
    target: adapter === "dedicated" ? CLOUD_EXECUTION_TARGETS.DEDICATED_CLOUD : CLOUD_EXECUTION_TARGETS.SHARED_CLOUD,
    adapter,
    reason: zeroCostMode ? "zero_cost_cloud_required" : "cloud_required",
    failClosed: true,
  });
}

export function publicResourceRouterPolicy() {
  return Object.freeze({
    routerVersion: LANERIQ_RESOURCE_ROUTER_VERSION,
    localFirst: true,
    failClosed: true,
    providerOpaque: true,
    zeroCostPrefersSharedFreeAdapter: true,
    privateCloudTransferRequiresClientSideEncryption: true,
    secretTarget: CLOUD_EXECUTION_TARGETS.SECRET_VAULT,
    dedicatedServerTriggeredByUserCount: false,
  });
}
