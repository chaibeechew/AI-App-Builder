import assert from "node:assert/strict";

import {
  CAPACITY_EVIDENCE_LEVEL,
  buildSyntheticCapacityEvidence,
  capacityClaimAllowed,
  publicCapacityEvidencePolicy,
} from "../lib/infrastructure/capacity-evidence.js";

const report = buildSyntheticCapacityEvidence({
  targets: [1000, 5000, 10000],
  generationShare: 0.1,
  modeledGenerationSlots: 800,
});

assert.equal(report.evidenceLevel, CAPACITY_EVIDENCE_LEVEL.SYNTHETIC_CI);
assert.deepEqual(report.targets, [1000, 5000, 10000]);
assert.equal(report.stages.length, 3);
assert.equal(report.liveValidationRequiredForSupportClaim, true);
assert.equal(report.productionLoadRequiredForAppConcurrencyClaim, true);
assert.equal(report.providerLiveRequiredForGenerationConcurrencyClaim, true);
assert.equal(report.smsBoundary, "ON_HOLD_NOT_EXERCISED");
assert.equal(report.paidInfrastructureRequired, false);

const [stage1k, stage5k, stage10k] = report.stages;
assert.equal(stage1k.syntheticGenerationDemand, 100);
assert.equal(stage5k.syntheticGenerationDemand, 500);
assert.equal(stage10k.syntheticGenerationDemand, 1000);
assert.equal(stage1k.pressure.level, "normal");
assert.equal(stage5k.pressure.level, "elevated");
assert.equal(stage10k.pressure.level, "emergency");

for (const stage of report.stages) {
  assert.equal(stage.fairShare.allocatedCapacity <= stage.fairShare.totalCapacity, true);
  assert.equal(stage.fairShare.allocations.every((row) => row.allocated <= row.demand), true);
  assert.equal(stage.evidenceBoundary.syntheticOnly, true);
  assert.equal(stage.evidenceBoundary.productionTrafficSent, false);
  assert.equal(stage.evidenceBoundary.providerNetworkCalls, 0);
  assert.equal(stage.evidenceBoundary.paidProviderCalls, 0);
  assert.equal(stage.evidenceBoundary.productionMutation, false);
  assert.equal(stage.evidenceBoundary.physicalDeviceVerified, false);
  assert.equal(stage.evidenceBoundary.smsExercised, false);
  assert.equal(stage.evidenceBoundary.emailExercised, false);
  assert.equal(stage.evidenceBoundary.appConcurrentCapacityClaimAllowed, false);
  assert.equal(stage.evidenceBoundary.generationConcurrentCapacityClaimAllowed, false);
}

assert.equal(stage10k.decisions.critical.decision, "admit");
assert.equal(stage10k.decisions.interactive.decision, "admit");
assert.equal(stage10k.decisions.normal.decision, "shed");
assert.equal(stage10k.decisions.background.decision, "shed");

const syntheticAppClaim = capacityClaimAllowed({
  kind: "app",
  evidenceLevel: CAPACITY_EVIDENCE_LEVEL.SYNTHETIC_CI,
  measuredConcurrentUsers: 10000,
  targetConcurrentUsers: 10000,
});
assert.equal(syntheticAppClaim.allowed, false);
assert.equal(syntheticAppClaim.requiredLevel, CAPACITY_EVIDENCE_LEVEL.PRODUCTION_LOAD);

const previewAppClaim = capacityClaimAllowed({
  kind: "app",
  evidenceLevel: CAPACITY_EVIDENCE_LEVEL.PREVIEW_LOAD,
  measuredConcurrentUsers: 10000,
  targetConcurrentUsers: 10000,
});
assert.equal(previewAppClaim.allowed, false);

const productionAppClaim = capacityClaimAllowed({
  kind: "app",
  evidenceLevel: CAPACITY_EVIDENCE_LEVEL.PRODUCTION_LOAD,
  measuredConcurrentUsers: 10000,
  targetConcurrentUsers: 10000,
});
assert.equal(productionAppClaim.allowed, true);

const productionGenerationClaim = capacityClaimAllowed({
  kind: "generation",
  evidenceLevel: CAPACITY_EVIDENCE_LEVEL.PRODUCTION_LOAD,
  measuredConcurrentUsers: 10000,
  targetConcurrentUsers: 10000,
});
assert.equal(productionGenerationClaim.allowed, false);
assert.equal(productionGenerationClaim.requiredLevel, CAPACITY_EVIDENCE_LEVEL.PROVIDER_LIVE);

const providerLiveGenerationClaim = capacityClaimAllowed({
  kind: "generation",
  evidenceLevel: CAPACITY_EVIDENCE_LEVEL.PROVIDER_LIVE,
  measuredConcurrentUsers: 10000,
  targetConcurrentUsers: 10000,
});
assert.equal(providerLiveGenerationClaim.allowed, true);

const policy = publicCapacityEvidencePolicy();
assert.deepEqual(policy.syntheticGateTargets, [1000, 5000, 10000]);
assert.equal(policy.syntheticEvidenceMayClaimLiveCapacity, false);
assert.equal(policy.previewEvidenceMayClaimProductionCapacity, false);
assert.equal(policy.smsOnHoldBoundaryPreserved, true);
assert.equal(policy.paidInfrastructureRequired, false);

console.log("✓ Synthetic capacity evidence exercises 1,000 / 5,000 / 10,000 concurrent-user stages with zero network/provider spend");
console.log("✓ Backpressure progresses from normal to elevated to emergency and protects critical/interactive work at the 10k stage");
console.log("✓ Fair-share allocation never exceeds modeled capacity or tenant demand");
console.log("✓ Synthetic/Preview evidence cannot be mislabeled as Production capacity");
console.log("✓ Generation concurrency claims require Provider LIVE evidence, independently from app concurrency");
console.log("✓ SMS and Email remain unexercised; physical-device evidence remains independent");
