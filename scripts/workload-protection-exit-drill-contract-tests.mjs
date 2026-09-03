import assert from "node:assert/strict";

import {
  ADMISSION_DECISION,
  WORKLOAD_PRIORITY,
  classifyQueuePressure,
  decideAdmission,
  publicAdmissionBackpressurePolicy,
} from "../lib/infrastructure/admission-backpressure.js";
import {
  TENANT_RESOURCE_STATE,
  assessTenantResourceUsage,
  createTenantResourceDecision,
  publicTenantResourceFirewallPolicy,
} from "../lib/infrastructure/tenant-resource-firewall.js";
import {
  SURVIVAL_TIER,
  buildSurvivalPlan,
  canRunWorkloadInMode,
  publicSurvivalOrchestratorPolicy,
} from "../lib/infrastructure/survival-mode-orchestrator.js";
import {
  createExitDrillPlan,
  publicExitDrillPolicy,
  runExitDrill,
} from "../lib/infrastructure/provider-exit-drill.js";

const normalPressure = classifyQueuePressure({ depth: 10, capacity: 100, oldestAgeMs: 1000, targetAgeMs: 30000 });
assert.equal(normalPressure.level, "normal");
const criticalPressure = classifyQueuePressure({ depth: 90, capacity: 100 });
assert.equal(criticalPressure.level, "critical");
assert.equal(decideAdmission({ priority: WORKLOAD_PRIORITY.CRITICAL, queue: { depth: 99, capacity: 100 } }).decision, ADMISSION_DECISION.ADMIT);
assert.equal(decideAdmission({ priority: WORKLOAD_PRIORITY.BACKGROUND, queue: { depth: 99, capacity: 100 } }).decision, ADMISSION_DECISION.SHED);
assert.equal(decideAdmission({ priority: WORKLOAD_PRIORITY.NORMAL, operationalMode: "survival" }).decision, ADMISSION_DECISION.SHED);
assert.equal(decideAdmission({ priority: WORKLOAD_PRIORITY.INTERACTIVE, operationalMode: "survival" }).decision, ADMISSION_DECISION.ADMIT);
assert.equal(publicAdmissionBackpressurePolicy().externalQueueRequired, false);

const healthyTenant = assessTenantResourceUsage({ requests: 100, requestLimit: 1000 });
assert.equal(healthyTenant.state, TENANT_RESOURCE_STATE.HEALTHY);
const noisyTenant = createTenantResourceDecision({
  tenantId: "tenant-a",
  usage: { concurrency: 35, concurrencyLimit: 20 },
});
assert.equal(noisyTenant.state, TENANT_RESOURCE_STATE.ISOLATE);
assert.equal(noisyTenant.action, "isolate_tenant_workload");
assert.equal(noisyTenant.affectsOtherTenants, false);
assert.equal(publicTenantResourceFirewallPolicy().globalThrottleForSingleTenantSpike, false);

const survivalPlan = buildSurvivalPlan({ mode: "survival", queuePressure: "emergency", paidRoutingAllowed: true });
assert.equal(canRunWorkloadInMode({ tier: SURVIVAL_TIER.ESSENTIAL, plan: survivalPlan }).allowed, true);
assert.equal(canRunWorkloadInMode({ tier: SURVIVAL_TIER.NONESSENTIAL, plan: survivalPlan }).allowed, false);
assert.equal(survivalPlan.allowPaidExternalRouting, false);
assert.equal(survivalPlan.allowHighRiskChanges, false);
assert.equal(publicSurvivalOrchestratorPolicy().recoveryRequiresEvidence, true);

assert.throws(
  () => createExitDrillPlan({ providerId: "provider-a", dryRun: false }),
  /LIVE_MODE_FORBIDDEN/,
);
const plan = createExitDrillPlan({ providerId: "provider-a" });
const adapter = {
  async exportState() {
    return { format: "laneriq.portable", checksum: "sha256:abc" };
  },
  async importState({ exported, isolated }) {
    assert.equal(isolated, true);
    return { checksum: exported.checksum };
  },
  async verifyState({ exported, imported }) {
    return {
      checksumsVerified: exported.checksum === imported.checksum,
      providerIndependentFormat: exported.format === "laneriq.portable",
      restoreTested: true,
      lastRestoreTestAgeDays: 0,
    };
  },
};
const exitDrill = await runExitDrill({ adapter, plan });
assert.equal(exitDrill.passed, true);
assert.equal(exitDrill.productionMutated, false);
assert.equal(exitDrill.paidExternalResourcesUsed, false);
assert.equal(publicExitDrillPolicy().liveProviderCutoverAllowed, false);

console.log("✓ Admission control protects critical/interactive workloads and sheds lower priority work under pressure");
console.log("✓ Tenant Resource Firewall isolates noisy neighbors without globally throttling other tenants");
console.log("✓ Survival Mode Orchestrator keeps essential work alive while pausing nonessential/paid/high-risk work");
console.log("✓ Provider Exit Drill proves portable restore paths in isolated dry-run mode with zero paid infrastructure");
