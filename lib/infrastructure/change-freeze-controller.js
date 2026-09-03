import { ERROR_BUDGET_STATE } from "./slo-error-budget.js";
import { BLAST_RADIUS } from "./cell-blast-radius.js";

export const LANERIQ_CHANGE_FREEZE_VERSION = "2026-09-03.2";

export const CHANGE_DECISION = Object.freeze({
  ALLOW: "allow",
  HOLD: "hold",
  FREEZE: "freeze",
});

const RISKY_RADIUS = new Set([BLAST_RADIUS.MULTI_CELL, BLAST_RADIUS.GLOBAL]);

function normalizeState(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRadius(value) {
  const radius = String(value || BLAST_RADIUS.RESOURCE).trim().toLowerCase();
  if (!Object.values(BLAST_RADIUS).includes(radius)) throw new Error("LANERIQ_CHANGE_FREEZE_BLAST_RADIUS_INVALID");
  return radius;
}

function sampleCount(value) {
  const count = Number(value ?? 0);
  if (!Number.isFinite(count) || count < 0) throw new Error("LANERIQ_CHANGE_FREEZE_SAMPLE_COUNT_INVALID");
  return Math.floor(count);
}

export function evaluateChangeFreeze({
  errorBudgetAssessments = [],
  blastRadiusAssessment = null,
  complexityAssessment = null,
  telemetryEvidence = null,
  rollbackReady = false,
  changeType = "routine",
  emergency = false,
} = {}) {
  const assessments = Array.isArray(errorBudgetAssessments) ? errorBudgetAssessments : [];
  const states = assessments.map((assessment) => normalizeState(assessment?.state)).filter(Boolean);
  const radius = normalizeRadius(blastRadiusAssessment?.radius);
  const complexityAllowed = complexityAssessment?.allowed !== false;
  const complexityLevel = normalizeState(complexityAssessment?.level || "low");
  const samples = sampleCount(telemetryEvidence?.sampleCount ?? 0);
  const freshTelemetry = telemetryEvidence?.fresh !== false;
  const reasons = [];
  let decision = CHANGE_DECISION.ALLOW;

  const freeze = (reason) => {
    reasons.push(reason);
    decision = CHANGE_DECISION.FREEZE;
  };
  const hold = (reason) => {
    reasons.push(reason);
    if (decision !== CHANGE_DECISION.FREEZE) decision = CHANGE_DECISION.HOLD;
  };

  if (!complexityAllowed) freeze("complexity_gate_blocked");
  if (states.includes(ERROR_BUDGET_STATE.FREEZE_CHANGES)) freeze("error_budget_freeze");
  if (states.includes(ERROR_BUDGET_STATE.FAST_BURN)) {
    if (RISKY_RADIUS.has(radius)) freeze("fast_burn_risky_blast_radius");
    else hold("fast_burn_requires_stabilization");
  }
  if (states.includes(ERROR_BUDGET_STATE.SLOW_BURN) && RISKY_RADIUS.has(radius)) {
    hold("slow_burn_cross_cell_or_global_change");
  }
  if (states.includes(ERROR_BUDGET_STATE.INSUFFICIENT_EVIDENCE) && RISKY_RADIUS.has(radius)) {
    hold("insufficient_slo_evidence_for_risky_change");
  }
  if (radius === BLAST_RADIUS.GLOBAL && !rollbackReady) freeze("global_change_requires_rollback");
  else if (radius === BLAST_RADIUS.MULTI_CELL && !rollbackReady) hold("multi_cell_change_requires_rollback");
  if ((complexityLevel === "critical" || complexityLevel === "high") && !rollbackReady) {
    hold("high_complexity_requires_rollback");
  }
  if ((!freshTelemetry || samples === 0) && RISKY_RADIUS.has(radius)) {
    hold("fresh_telemetry_required_for_risky_change");
  }

  const emergencyOverrideEligible = Boolean(
    emergency &&
    rollbackReady &&
    complexityAllowed &&
    !states.includes(ERROR_BUDGET_STATE.FREEZE_CHANGES) &&
    radius !== BLAST_RADIUS.GLOBAL,
  );

  if (emergencyOverrideEligible && decision === CHANGE_DECISION.HOLD) {
    reasons.push("emergency_override_with_rollback");
    decision = CHANGE_DECISION.ALLOW;
  }

  return Object.freeze({
    version: LANERIQ_CHANGE_FREEZE_VERSION,
    decision,
    frozen: decision === CHANGE_DECISION.FREEZE,
    held: decision === CHANGE_DECISION.HOLD,
    allowed: decision === CHANGE_DECISION.ALLOW,
    reasons: Object.freeze([...new Set(reasons)]),
    blastRadius: radius,
    changeType: String(changeType || "routine"),
    rollbackReady: Boolean(rollbackReady),
    telemetrySampleCount: samples,
    freshTelemetry,
    emergencyOverrideEligible,
    automaticDecisionFromEvidence: true,
    liveDeploymentIntegrationClaimed: false,
  });
}

export function assertChangeAllowed(input = {}) {
  const assessment = evaluateChangeFreeze(input);
  if (!assessment.allowed) {
    const code = assessment.frozen ? "FROZEN" : "HELD";
    throw new Error(`LANERIQ_CHANGE_${code}:${assessment.reasons.join(",") || "policy"}`);
  }
  return assessment;
}

export function publicChangeFreezePolicy() {
  return Object.freeze({
    version: LANERIQ_CHANGE_FREEZE_VERSION,
    errorBudgetFreezeIsHardBlocker: true,
    globalChangesNeedRollback: true,
    riskyChangesNeedFreshTelemetry: true,
    emergencyCannotBypassHardFreeze: true,
    liveDeploymentIntegrationClaimed: false,
    fixedInfrastructureRequired: false,
  });
}
