export const LANERIQ_CLOUD_CONTRACT_VERSION = "2026-09-03.1";

export const CLOUD_CAPABILITIES = Object.freeze([
  "identity",
  "database",
  "storage",
  "realtime",
  "functions",
  "deployment",
  "backup",
  "ai",
]);

export const CLOUD_EXECUTION_TARGETS = Object.freeze({
  LOCAL_DEVICE: "local_device",
  SHARED_CLOUD: "shared_cloud",
  DEDICATED_CLOUD: "dedicated_cloud",
  SECRET_VAULT: "secret_vault",
});

const REQUIRED_ADAPTER_METHODS = Object.freeze({
  identity: ["getSession", "getUser"],
  database: ["query", "mutate"],
  storage: ["createUploadGrant", "createDownloadGrant"],
  realtime: ["subscribe"],
  functions: ["invoke"],
  deployment: ["deploy"],
  backup: ["createBackup", "restoreBackup"],
  ai: ["generate"],
});

export function assertCloudCapability(capability) {
  const normalized = String(capability || "").trim();
  if (!CLOUD_CAPABILITIES.includes(normalized)) {
    throw new Error(`LANERIQ_CLOUD_UNKNOWN_CAPABILITY:${normalized || "missing"}`);
  }
  return normalized;
}

export function assertCloudAdapter(capability, adapter) {
  const normalized = assertCloudCapability(capability);
  if (!adapter || typeof adapter !== "object") {
    throw new Error(`LANERIQ_CLOUD_ADAPTER_REQUIRED:${normalized}`);
  }
  for (const method of REQUIRED_ADAPTER_METHODS[normalized]) {
    if (typeof adapter[method] !== "function") {
      throw new Error(`LANERIQ_CLOUD_ADAPTER_METHOD_REQUIRED:${normalized}:${method}`);
    }
  }
  return true;
}

export function publicCloudContract() {
  return Object.freeze({
    contractVersion: LANERIQ_CLOUD_CONTRACT_VERSION,
    product: "LANERIQ Cloud",
    architecture: "embedded-module-separable-service",
    capabilities: [...CLOUD_CAPABILITIES],
    providerOpaque: true,
    directProviderSdkImportsAllowedInCloudDomain: false,
    migrationModel: "adapter-by-adapter",
  });
}
