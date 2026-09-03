export const LANERIQ_EXIT_READINESS_VERSION = "2026-09-03.1";

const REQUIRED_EXIT_METHODS = Object.freeze([
  "exportState",
  "importState",
  "verifyState",
]);

export function assertExitAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new Error("LANERIQ_EXIT_ADAPTER_REQUIRED");
  for (const method of REQUIRED_EXIT_METHODS) {
    if (typeof adapter[method] !== "function") throw new Error(`LANERIQ_EXIT_ADAPTER_METHOD_REQUIRED:${method}`);
  }
  return true;
}

export function assessExitReadiness({
  exportSupported = false,
  importSupported = false,
  checksumsVerified = false,
  restoreTested = false,
  providerIndependentFormat = false,
  lastRestoreTestAgeDays = null,
  maximumRestoreTestAgeDays = 30,
} = {}) {
  const ageKnown = Number.isFinite(Number(lastRestoreTestAgeDays));
  const restoreFresh = restoreTested && ageKnown && Number(lastRestoreTestAgeDays) <= Number(maximumRestoreTestAgeDays);
  const checks = Object.freeze({
    exportSupported: Boolean(exportSupported),
    importSupported: Boolean(importSupported),
    checksumsVerified: Boolean(checksumsVerified),
    restoreTested: Boolean(restoreTested),
    restoreFresh,
    providerIndependentFormat: Boolean(providerIndependentFormat),
  });
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const score = Math.round((passed / total) * 100);
  return Object.freeze({
    version: LANERIQ_EXIT_READINESS_VERSION,
    score,
    ready: score === 100,
    checks,
    evidenceLevel: "code_and_restore-test-required",
  });
}

export function publicExitPolicy() {
  return Object.freeze({
    version: LANERIQ_EXIT_READINESS_VERSION,
    requiredAdapterMethods: [...REQUIRED_EXIT_METHODS],
    exportWithoutRestoreTestCountsAsReady: false,
    checksumVerificationRequired: true,
    providerIndependentFormatRequired: true,
    userCountTriggersExit: false,
  });
}
