export const LANERIQ_RESOURCE_LEDGER_VERSION = "2026-09-03.1";

export const COST_GUARD_STATE = Object.freeze({
  NORMAL: "normal",
  OPTIMIZE: "optimize",
  SURVIVAL: "survival",
  BLOCK_NONESSENTIAL_PAID: "block_nonessential_paid",
});

function nonNegativeNumber(value, name) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`LANERIQ_RESOURCE_LEDGER_INVALID_${name}`);
  return number;
}

export function createResourceUsageEntry({
  taskId,
  projectId = null,
  tenantId = null,
  capability,
  executionTarget,
  providerClass = "provider_opaque",
  aiUsd = 0,
  computeUsd = 0,
  databaseUsd = 0,
  storageUsd = 0,
  bandwidthUsd = 0,
  observabilityUsd = 0,
  buildUsd = 0,
  latencyMs = 0,
  retries = 0,
} = {}) {
  if (!String(taskId || "").trim()) throw new Error("LANERIQ_RESOURCE_LEDGER_TASK_ID_REQUIRED");
  if (!String(capability || "").trim()) throw new Error("LANERIQ_RESOURCE_LEDGER_CAPABILITY_REQUIRED");
  if (!String(executionTarget || "").trim()) throw new Error("LANERIQ_RESOURCE_LEDGER_TARGET_REQUIRED");

  const costs = Object.freeze({
    aiUsd: nonNegativeNumber(aiUsd, "AI_COST"),
    computeUsd: nonNegativeNumber(computeUsd, "COMPUTE_COST"),
    databaseUsd: nonNegativeNumber(databaseUsd, "DATABASE_COST"),
    storageUsd: nonNegativeNumber(storageUsd, "STORAGE_COST"),
    bandwidthUsd: nonNegativeNumber(bandwidthUsd, "BANDWIDTH_COST"),
    observabilityUsd: nonNegativeNumber(observabilityUsd, "OBSERVABILITY_COST"),
    buildUsd: nonNegativeNumber(buildUsd, "BUILD_COST"),
  });

  const totalUsd = Object.values(costs).reduce((sum, value) => sum + value, 0);
  return Object.freeze({
    ledgerVersion: LANERIQ_RESOURCE_LEDGER_VERSION,
    taskId: String(taskId),
    projectId: projectId ? String(projectId) : null,
    tenantId: tenantId ? String(tenantId) : null,
    capability: String(capability),
    executionTarget: String(executionTarget),
    providerClass: String(providerClass || "provider_opaque"),
    costs,
    totalUsd,
    latencyMs: nonNegativeNumber(latencyMs, "LATENCY"),
    retries: Math.floor(nonNegativeNumber(retries, "RETRIES")),
  });
}

export function summarizeResourceUsage(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  return Object.freeze(list.reduce((summary, entry) => {
    summary.tasks += 1;
    summary.totalUsd += nonNegativeNumber(entry?.totalUsd, "TOTAL_COST");
    summary.latencyMs += nonNegativeNumber(entry?.latencyMs, "LATENCY");
    summary.retries += nonNegativeNumber(entry?.retries, "RETRIES");
    return summary;
  }, { tasks: 0, totalUsd: 0, latencyMs: 0, retries: 0 }));
}

export function evaluateExternalSpendBudget({ spentUsd = 0, softLimitUsd = 0, hardLimitUsd = 0 } = {}) {
  const spent = nonNegativeNumber(spentUsd, "SPENT");
  const soft = nonNegativeNumber(softLimitUsd, "SOFT_LIMIT");
  const hard = nonNegativeNumber(hardLimitUsd, "HARD_LIMIT");
  if (hard < soft) throw new Error("LANERIQ_RESOURCE_LEDGER_HARD_LIMIT_BELOW_SOFT_LIMIT");

  if (hard === 0) {
    return Object.freeze({ state: COST_GUARD_STATE.BLOCK_NONESSENTIAL_PAID, spentUsd: spent, remainingUsd: 0, paidRoutingAllowed: false });
  }
  if (spent >= hard) {
    return Object.freeze({ state: COST_GUARD_STATE.BLOCK_NONESSENTIAL_PAID, spentUsd: spent, remainingUsd: 0, paidRoutingAllowed: false });
  }
  if (spent >= hard * 0.9) {
    return Object.freeze({ state: COST_GUARD_STATE.SURVIVAL, spentUsd: spent, remainingUsd: hard - spent, paidRoutingAllowed: false });
  }
  if (soft > 0 && spent >= soft) {
    return Object.freeze({ state: COST_GUARD_STATE.OPTIMIZE, spentUsd: spent, remainingUsd: hard - spent, paidRoutingAllowed: true });
  }
  return Object.freeze({ state: COST_GUARD_STATE.NORMAL, spentUsd: spent, remainingUsd: hard - spent, paidRoutingAllowed: true });
}
