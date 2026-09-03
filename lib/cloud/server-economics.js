export const LANERIQ_SERVER_ECONOMICS_VERSION = "2026-09-03.1";

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function evaluateDedicatedServerGate({
  providerMonthlyCost = 0,
  dedicatedComputeCost = 0,
  bandwidthCost = 0,
  backupCost = 0,
  observabilityCost = 0,
  operationsCost = 0,
  redundancyReady = false,
  backupReady = false,
  restoreTested = false,
  securityReady = false,
  observabilityReady = false,
} = {}) {
  const providerTco = money(providerMonthlyCost);
  const dedicatedTco = [
    dedicatedComputeCost,
    bandwidthCost,
    backupCost,
    observabilityCost,
    operationsCost,
  ].reduce((sum, item) => sum + money(item), 0);

  const operationallyReady = Boolean(
    redundancyReady && backupReady && restoreTested && securityReady && observabilityReady,
  );
  const economicallyBetter = dedicatedTco > 0 && providerTco > dedicatedTco;

  return Object.freeze({
    economicsVersion: LANERIQ_SERVER_ECONOMICS_VERSION,
    providerTco,
    dedicatedTco,
    operationallyReady,
    economicallyBetter,
    migrate: operationallyReady && economicallyBetter,
    trigger: "tco_and_operational_readiness",
    userCountThresholdRequired: false,
  });
}

export function publicServerEconomicsPolicy() {
  return Object.freeze({
    economicsVersion: LANERIQ_SERVER_ECONOMICS_VERSION,
    dedicatedServerDefault: false,
    userCountThresholdRequired: false,
    requiresLowerTco: true,
    requiresRedundancy: true,
    requiresEncryptedBackupAndRestoreEvidence: true,
    requiresSecurityReadiness: true,
    requiresObservability: true,
    migrationStrategy: "workload-by-workload",
  });
}
