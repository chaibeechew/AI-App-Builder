import { OPERATIONAL_MODE } from "./safety-controls.js";

export const LANERIQ_RECOVERY_RUNBOOK_COMPILER_VERSION = "2026-09-04.1";

export const INCIDENT_TYPE = Object.freeze({
  PROVIDER_OUTAGE: "provider_outage",
  PROVIDER_QUOTA: "provider_quota_exhaustion",
  QUEUE_OVERLOAD: "queue_overload",
  TENANT_NOISY_NEIGHBOR: "tenant_noisy_neighbor",
  EXIT_READINESS: "provider_exit_readiness",
});

const TEMPLATES = Object.freeze({
  [INCIDENT_TYPE.PROVIDER_OUTAGE]: [
    ["capture_evidence", "Capture provider health, error, quota, and request evidence"],
    ["protect_essential", "Apply Survival/Degraded policy to protect auth and existing projects"],
    ["evaluate_existing_failover", "Evaluate already-configured healthy providers without enabling paid routing"],
    ["verify_core_reads_writes", "Verify project read/save/export boundaries before restoring nonessential work"],
    ["record_recovery_evidence", "Record recovery evidence and require explicit readiness before normal mode"],
  ],
  [INCIDENT_TYPE.PROVIDER_QUOTA]: [
    ["capture_quota_evidence", "Capture remaining quota, rate-limit, and Cost Governor evidence"],
    ["apply_backpressure", "Defer background and maintenance work before critical/interactive work"],
    ["evaluate_zero_cost_routes", "Evaluate existing zero-cost routes only; do not silently enable paid providers"],
    ["verify_budget_guard", "Verify paid routing and hardware purchase remain disabled"],
    ["record_recovery_evidence", "Record evidence before leaving degraded mode"],
  ],
  [INCIDENT_TYPE.QUEUE_OVERLOAD]: [
    ["capture_queue_evidence", "Capture depth, oldest age, throughput, and tenant distribution"],
    ["apply_admission_control", "Apply admission control and backpressure"],
    ["apply_fair_share", "Apply tenant fair-share scheduling with critical reservation and tenant caps"],
    ["isolate_noisy_tenants", "Isolate only tenants exceeding resource-firewall thresholds"],
    ["verify_queue_recovery", "Verify queue age and depth recover before restoring background work"],
  ],
  [INCIDENT_TYPE.TENANT_NOISY_NEIGHBOR]: [
    ["capture_tenant_evidence", "Capture tenant-local concurrency, queue, error, and cost evidence"],
    ["isolate_tenant_only", "Throttle or isolate only the offending tenant"],
    ["verify_other_tenants", "Verify unrelated tenants remain healthy and unthrottled"],
    ["progressive_restore", "Restore isolated tenant capacity progressively after evidence is healthy"],
  ],
  [INCIDENT_TYPE.EXIT_READINESS]: [
    ["compile_exit_plan", "Compile isolated provider exit dry-run plan"],
    ["export_portable_state", "Export provider-independent portable state"],
    ["restore_isolated", "Restore only to an isolated target"],
    ["verify_checksums", "Verify checksums and restored state"],
    ["record_exit_evidence", "Record exit evidence without Production cutover"],
  ],
});

function normalizeIncident(value) {
  const incident = String(value || "").trim();
  if (!TEMPLATES[incident]) throw new Error(`LANERIQ_RECOVERY_INCIDENT_INVALID:${incident}`);
  return incident;
}

export function compileRecoveryRunbook({
  incident,
  mode = OPERATIONAL_MODE.DEGRADED,
  providerId = null,
  tenantId = null,
  dryRun = true,
  productionMutationAllowed = false,
  paidExternalResourcesAllowed = false,
} = {}) {
  const normalized = normalizeIncident(incident);
  if (dryRun !== true || productionMutationAllowed === true || paidExternalResourcesAllowed === true) {
    throw new Error("LANERIQ_RECOVERY_RUNBOOK_UNSAFE_LEVEL0_PLAN_REJECTED");
  }
  if (!Object.values(OPERATIONAL_MODE).includes(mode)) {
    throw new Error(`LANERIQ_RECOVERY_MODE_INVALID:${mode}`);
  }

  const steps = TEMPLATES[normalized].map(([id, instruction], index) => Object.freeze({
    order: index + 1,
    id,
    instruction,
    automaticMutationAllowed: false,
    requiresEvidence: true,
    checkpointRequired: index > 0,
  }));

  return Object.freeze({
    version: LANERIQ_RECOVERY_RUNBOOK_COMPILER_VERSION,
    incident: normalized,
    mode,
    providerId: providerId ? String(providerId) : null,
    tenantId: tenantId ? String(tenantId) : null,
    dryRun: true,
    productionMutationAllowed: false,
    paidExternalResourcesAllowed: false,
    liveProviderCutoverAllowed: false,
    autoHardwareProvisionAllowed: false,
    steps: Object.freeze(steps),
    completionRule: "all_steps_evidenced_then_explicit_recovery_decision",
  });
}

export function publicRecoveryRunbookPolicy() {
  return Object.freeze({
    version: LANERIQ_RECOVERY_RUNBOOK_COMPILER_VERSION,
    incidentTypes: Object.values(INCIDENT_TYPE),
    defaultMode: "dry_run_level0",
    productionMutationAllowed: false,
    paidExternalResourcesAllowed: false,
    liveProviderCutoverAllowed: false,
    evidenceRequiredPerStep: true,
    explicitRecoveryDecisionRequired: true,
    fixedInfrastructureCostRequired: false,
  });
}
