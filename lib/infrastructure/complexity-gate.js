export const LANERIQ_COMPLEXITY_GATE_VERSION = "2026-09-03.1";

export const COMPLEXITY_LEVEL = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
});

function nonNegative(value, name) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`LANERIQ_COMPLEXITY_INVALID_${name}`);
  return number;
}

function capped(value, max) {
  return Math.min(max, Math.max(0, value));
}

export function evaluateOperationalComplexity({
  filesChanged = 0,
  linesChanged = 0,
  domainsTouched = 0,
  databaseMigrations = 0,
  newRuntimeDependencies = 0,
  crossCellWrites = 0,
  globalDependenciesChanged = 0,
  fixedMonthlyCostUsd = 0,
  approvedFixedMonthlyCostUsd = 0,
  newPersistentServices = 0,
  dedicatedServerCount = 0,
  currentMau = 0,
  minimumDedicatedServerMau = 20000,
  rollbackTested = false,
  crossCellWriteReviewed = false,
} = {}) {
  const files = nonNegative(filesChanged, "FILES_CHANGED");
  const lines = nonNegative(linesChanged, "LINES_CHANGED");
  const domains = nonNegative(domainsTouched, "DOMAINS_TOUCHED");
  const migrations = nonNegative(databaseMigrations, "DATABASE_MIGRATIONS");
  const dependencies = nonNegative(newRuntimeDependencies, "NEW_RUNTIME_DEPENDENCIES");
  const crossCell = nonNegative(crossCellWrites, "CROSS_CELL_WRITES");
  const globalChanges = nonNegative(globalDependenciesChanged, "GLOBAL_DEPENDENCIES_CHANGED");
  const fixedCost = nonNegative(fixedMonthlyCostUsd, "FIXED_MONTHLY_COST");
  const approvedCost = nonNegative(approvedFixedMonthlyCostUsd, "APPROVED_FIXED_MONTHLY_COST");
  const services = nonNegative(newPersistentServices, "NEW_PERSISTENT_SERVICES");
  const servers = nonNegative(dedicatedServerCount, "DEDICATED_SERVER_COUNT");
  const mau = nonNegative(currentMau, "CURRENT_MAU");
  const serverMauFloor = nonNegative(minimumDedicatedServerMau, "MINIMUM_DEDICATED_SERVER_MAU");

  const score = Math.round(capped(
    capped(files / 4, 8) +
    capped(lines / 250, 12) +
    capped(domains * 3, 15) +
    capped(migrations * 6, 18) +
    capped(dependencies * 4, 12) +
    capped(crossCell * 10, 20) +
    capped(globalChanges * 12, 24) +
    capped(services * 8, 16) +
    capped(servers * 10, 20) +
    (fixedCost > 0 ? 10 : 0),
    100,
  ));

  let level = COMPLEXITY_LEVEL.LOW;
  if (score >= 76) level = COMPLEXITY_LEVEL.CRITICAL;
  else if (score >= 51) level = COMPLEXITY_LEVEL.HIGH;
  else if (score >= 26) level = COMPLEXITY_LEVEL.MEDIUM;

  const blockers = [];
  if (fixedCost > approvedCost) blockers.push("fixed_monthly_cost_exceeds_approved_budget");
  if (servers > 0 && mau < serverMauFloor) blockers.push("dedicated_server_before_scale_trigger");
  if (crossCell > 0 && !crossCellWriteReviewed) blockers.push("cross_cell_write_requires_review");
  if (globalChanges > 0 && !rollbackTested) blockers.push("global_change_requires_tested_rollback");
  if (level === COMPLEXITY_LEVEL.CRITICAL && !rollbackTested) blockers.push("critical_change_requires_tested_rollback");

  return Object.freeze({
    version: LANERIQ_COMPLEXITY_GATE_VERSION,
    score,
    level,
    allowed: blockers.length === 0,
    blockers: Object.freeze(blockers),
    architectureReviewRequired: level === COMPLEXITY_LEVEL.HIGH || level === COMPLEXITY_LEVEL.CRITICAL || globalChanges > 0 || crossCell > 0,
    zeroFixedCostPreserved: fixedCost <= approvedCost,
    dedicatedServerScaleTriggerSatisfied: servers === 0 || mau >= serverMauFloor,
  });
}

export function publicComplexityGatePolicy() {
  return Object.freeze({
    version: LANERIQ_COMPLEXITY_GATE_VERSION,
    defaultApprovedFixedMonthlyCostUsd: 0,
    defaultMinimumDedicatedServerMau: 20000,
    crossCellWritesNeedReview: true,
    globalChangesNeedTestedRollback: true,
    criticalChangesNeedTestedRollback: true,
    purpose: "prevent-premature-complexity-and-fixed-cost",
  });
}
