export const LANERIQ_CLOUD_SECURITY_POLICY_VERSION = "2026-09-03.1";

export const DATA_CLASS = Object.freeze({
  PUBLIC: "public",
  NORMAL: "normal",
  PRIVATE: "private",
  SECRET: "secret",
});

const SECURITY_REQUIREMENTS = Object.freeze({
  public: Object.freeze({
    clientSideEncryptionRequired: false,
    cloudAllowed: true,
    browserPlaintextAllowed: true,
    secretVaultRequired: false,
  }),
  normal: Object.freeze({
    clientSideEncryptionRequired: false,
    cloudAllowed: true,
    browserPlaintextAllowed: true,
    secretVaultRequired: false,
  }),
  private: Object.freeze({
    clientSideEncryptionRequired: true,
    cloudAllowed: true,
    browserPlaintextAllowed: true,
    secretVaultRequired: false,
  }),
  secret: Object.freeze({
    clientSideEncryptionRequired: false,
    cloudAllowed: true,
    browserPlaintextAllowed: false,
    secretVaultRequired: true,
  }),
});

export function normalizeDataClass(value) {
  const normalized = String(value || DATA_CLASS.NORMAL).trim().toLowerCase();
  if (!Object.values(DATA_CLASS).includes(normalized)) {
    throw new Error(`LANERIQ_CLOUD_UNKNOWN_DATA_CLASS:${normalized}`);
  }
  return normalized;
}

export function cloudSecurityRequirements(dataClass) {
  const normalized = normalizeDataClass(dataClass);
  return SECURITY_REQUIREMENTS[normalized];
}

export function assertCloudTransferAllowed({
  dataClass = DATA_CLASS.NORMAL,
  executionContext = "server",
  clientSideEncrypted = false,
  target = "shared_cloud",
} = {}) {
  const normalized = normalizeDataClass(dataClass);
  const requirements = cloudSecurityRequirements(normalized);
  const browser = String(executionContext).toLowerCase() === "browser";

  if (normalized === DATA_CLASS.SECRET && browser) {
    throw new Error("LANERIQ_CLOUD_SECRET_BROWSER_BLOCKED");
  }
  if (requirements.secretVaultRequired && target !== "secret_vault") {
    throw new Error("LANERIQ_CLOUD_SECRET_VAULT_REQUIRED");
  }
  if (requirements.clientSideEncryptionRequired && target !== "local_device" && clientSideEncrypted !== true) {
    throw new Error("LANERIQ_CLOUD_PRIVATE_DATA_MUST_BE_ENCRYPTED_BEFORE_SYNC");
  }
  return true;
}

export function publicCloudSecurityPolicy() {
  return Object.freeze({
    policyVersion: LANERIQ_CLOUD_SECURITY_POLICY_VERSION,
    defaultDeny: true,
    dataMinimizationRequired: true,
    providerOpaque: true,
    privateDataEncryptBeforeCloud: true,
    secretDataBrowserPlaintextAllowed: false,
    secretVaultRequired: true,
    serviceRoleClientExposureAllowed: false,
    shortLivedObjectGrantsPreferred: true,
    appendOnlyAuditPreferred: true,
    encryptedBackupsRequired: true,
    zeroKnowledgeMode: {
      designTarget: true,
      nativeKeyCustodyRequiredForLiveClaim: true,
      liveEvidenceVerified: false,
    },
  });
}
