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
import {
  buildFairShareSchedule,
  publicFairShareSchedulerPolicy,
} from "../lib/infrastructure/fair-share-capacity-scheduler.js";
import {
  CAPACITY_ACTION,
  forecastCapacity,
  publicCapacityForecastPolicy,
} from "../lib/infrastructure/capacity-forecast-server-trigger.js";
import {
  INCIDENT_TYPE,
  compileRecoveryRunbook,
  publicRecoveryRunbookPolicy,
} from "../lib/infrastructure/recovery-runbook-compiler.js";
import {
  assertQueuePersistenceAdapter,
  createInMemoryQueuePersistence,
  publicQueuePersistencePolicy,
} from "../lib/infrastructure/queue-persistence.js";

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

const fairShare = buildFairShareSchedule({
  capacity: 100,
  reservedCriticalRatio: 0.2,
  maxTenantShareRatio: 0.5,
  starvationAgeMs: 60000,
  tenants: [
    { tenantId: "tenant-a", demand: 100, workloadClass: WORKLOAD_PRIORITY.CRITICAL },
    { tenantId: "tenant-b", demand: 100, workloadClass: WORKLOAD_PRIORITY.INTERACTIVE },
    { tenantId: "tenant-c", demand: 100, workloadClass: WORKLOAD_PRIORITY.BACKGROUND, oldestAgeMs: 120000 },
    { tenantId: "tenant-isolated", demand: 100, workloadClass: WORKLOAD_PRIORITY.CRITICAL, isolated: true },
  ],
});
const byTenant = Object.fromEntries(fairShare.allocations.map((row) => [row.tenantId, row]));
assert.equal(fairShare.allocatedCapacity, 100);
assert.equal(byTenant["tenant-a"].allocated <= 50, true);
assert.equal(byTenant["tenant-b"].allocated <= 50, true);
assert.equal(byTenant["tenant-c"].allocated > 0, true);
assert.equal(byTenant["tenant-c"].starvationProtected, true);
assert.equal(byTenant["tenant-isolated"].allocated, 0);
assert.equal(publicFairShareSchedulerPolicy().paidInfrastructureRequired, false);

const earlyCapacity = forecastCapacity({ currentMau: 1000, projectedMau30d: 2000, utilization: 0.3 });
assert.equal(earlyCapacity.action, CAPACITY_ACTION.STAY_SERVER_INDEPENDENT);
const prepareServer = forecastCapacity({ currentMau: 15000, projectedMau30d: 25000, utilization: 0.6 });
assert.equal(prepareServer.action, CAPACITY_ACTION.PREPARE_FIRST_SERVER);
assert.equal(prepareServer.autoProvisionAllowed, false);
const clusterReview = forecastCapacity({ currentMau: 55000, projectedMau30d: 60000 });
assert.equal(clusterReview.action, CAPACITY_ACTION.PREPARE_SMALL_CLUSTER);
assert.equal(publicCapacityForecastPolicy().paidInfrastructureRequired, false);

assert.throws(
  () => compileRecoveryRunbook({ incident: INCIDENT_TYPE.PROVIDER_OUTAGE, dryRun: false }),
  /UNSAFE_LEVEL0_PLAN_REJECTED/,
);
const queueRunbook = compileRecoveryRunbook({ incident: INCIDENT_TYPE.QUEUE_OVERLOAD, mode: "survival" });
assert.equal(queueRunbook.dryRun, true);
assert.equal(queueRunbook.productionMutationAllowed, false);
assert.equal(queueRunbook.paidExternalResourcesAllowed, false);
assert.equal(queueRunbook.steps.some((step) => step.id === "apply_fair_share"), true);
assert.equal(queueRunbook.steps.every((step) => step.requiresEvidence), true);
assert.equal(publicRecoveryRunbookPolicy().liveProviderCutoverAllowed, false);

let clock = 1000;
const queue = createInMemoryQueuePersistence({ maxItems: 8, maxAttempts: 2, now: () => clock });
assert.equal(assertQueuePersistenceAdapter(queue), true);
const tenantAFirst = await queue.enqueue({ tenantId: "tenant-a", idempotencyKey: "job-1", payload: { job: "A" } });
const tenantADuplicate = await queue.enqueue({ tenantId: "tenant-a", idempotencyKey: "job-1", payload: { job: "A-duplicate" } });
const tenantBSameKey = await queue.enqueue({ tenantId: "tenant-b", idempotencyKey: "job-1", payload: { job: "B" } });
assert.equal(tenantAFirst.duplicate, false);
assert.equal(tenantADuplicate.duplicate, true);
assert.equal(tenantBSameKey.duplicate, false);
const tenantBClaim = await queue.claim({ tenantId: "tenant-b", consumerId: "worker-b", leaseMs: 5000 });
const tenantAClaim = await queue.claim({ tenantId: "tenant-a", consumerId: "worker-a", leaseMs: 5000 });
assert.equal(tenantBClaim.tenantId, "tenant-b");
assert.equal(tenantAClaim.tenantId, "tenant-a");
const crossTenantAck = await queue.ack({ tenantId: "tenant-b", messageId: tenantAClaim.messageId, leaseToken: tenantAClaim.leaseToken });
assert.equal(crossTenantAck.acknowledged, false);
const retry = await queue.nack({ tenantId: "tenant-a", messageId: tenantAClaim.messageId, leaseToken: tenantAClaim.leaseToken, retry: true });
assert.equal(retry.state, "queued");
clock += 1;
const tenantARetry = await queue.claim({ tenantId: "tenant-a", consumerId: "worker-a-2" });
assert.equal(tenantARetry.attempts, 2);
assert.equal((await queue.ack({ tenantId: "tenant-a", messageId: tenantARetry.messageId, leaseToken: tenantARetry.leaseToken })).acknowledged, true);
assert.equal((await queue.ack({ tenantId: "tenant-b", messageId: tenantBClaim.messageId, leaseToken: tenantBClaim.leaseToken })).acknowledged, true);
const tenantASnapshot = await queue.exportSnapshot({ tenantId: "tenant-a" });
assert.equal(tenantASnapshot.durable, false);
assert.equal(tenantASnapshot.items.every((item) => item.tenantId === "tenant-a"), true);
assert.equal(publicQueuePersistencePolicy().productionDurabilityClaimedForInMemoryAdapter, false);
assert.equal(publicQueuePersistencePolicy().paidInfrastructureRequired, false);

console.log("✓ Admission control protects critical/interactive workloads and sheds lower priority work under pressure");
console.log("✓ Tenant Resource Firewall isolates noisy neighbors without globally throttling other tenants");
console.log("✓ Survival Mode Orchestrator keeps essential work alive while pausing nonessential/paid/high-risk work");
console.log("✓ Provider Exit Drill proves portable restore paths in isolated dry-run mode with zero paid infrastructure");
console.log("✓ Fair-Share Capacity Scheduler reserves critical capacity, caps tenants, ages waiting work, and isolates noisy neighbors");
console.log("✓ Capacity Forecast emits advisory server/cluster triggers without provisioning hardware or paid infrastructure");
console.log("✓ Recovery Runbook Compiler generates evidence-gated dry-run recovery steps with no Production mutation");
console.log("✓ Queue Persistence abstraction provides tenant-scoped idempotent lease/retry behavior with a zero-cost in-memory reference adapter");
