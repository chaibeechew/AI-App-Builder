export const LANERIQ_SLO_VERSION = "2026-09-03.1";

export const ERROR_BUDGET_STATE = Object.freeze({
  HEALTHY: "healthy",
  WATCH: "watch",
  SLOW_BURN: "slow_burn",
  FAST_BURN: "fast_burn",
  FREEZE_CHANGES: "freeze_changes",
  INSUFFICIENT_EVIDENCE: "insufficient_evidence",
});

function finiteNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`LANERIQ_SLO_INVALID_${name}`);
  return number;
}

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[rank];
}

export function createServiceSlo({
  id,
  availabilityTarget = 0.999,
  latencyP95Ms = 1500,
  windowMinutes = 60 * 24 * 30,
  minimumSamples = 100,
} = {}) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) throw new Error("LANERIQ_SLO_ID_REQUIRED");

  const availability = finiteNumber(availabilityTarget, "AVAILABILITY_TARGET");
  if (availability <= 0 || availability >= 1) throw new Error("LANERIQ_SLO_AVAILABILITY_TARGET_RANGE");

  const latency = finiteNumber(latencyP95Ms, "LATENCY_P95");
  const window = finiteNumber(windowMinutes, "WINDOW_MINUTES");
  const samples = Math.floor(finiteNumber(minimumSamples, "MINIMUM_SAMPLES"));
  if (latency <= 0 || window <= 0 || samples <= 0) throw new Error("LANERIQ_SLO_POSITIVE_LIMITS_REQUIRED");

  return Object.freeze({
    version: LANERIQ_SLO_VERSION,
    id: normalizedId,
    availabilityTarget: availability,
    latencyP95Ms: latency,
    windowMinutes: window,
    minimumSamples: samples,
  });
}

export function evaluateServiceLevel({
  slo,
  totalRequests = 0,
  successfulRequests = 0,
  latencySamplesMs = [],
} = {}) {
  if (!slo?.id) throw new Error("LANERIQ_SLO_POLICY_REQUIRED");

  const total = Math.floor(finiteNumber(totalRequests, "TOTAL_REQUESTS"));
  const successful = Math.floor(finiteNumber(successfulRequests, "SUCCESSFUL_REQUESTS"));
  if (total < 0 || successful < 0 || successful > total) throw new Error("LANERIQ_SLO_REQUEST_COUNTS_INVALID");

  const latencies = (Array.isArray(latencySamplesMs) ? latencySamplesMs : []).map((value) => {
    const number = finiteNumber(value, "LATENCY_SAMPLE");
    if (number < 0) throw new Error("LANERIQ_SLO_LATENCY_SAMPLE_NEGATIVE");
    return number;
  });

  const availability = total > 0 ? successful / total : null;
  const observedFailureRate = total > 0 ? (total - successful) / total : null;
  const allowedFailureRate = 1 - slo.availabilityTarget;
  const burnRate = observedFailureRate === null ? null : observedFailureRate / allowedFailureRate;
  const latencyP95ObservedMs = percentile(latencies, 95);
  const enoughEvidence = total >= slo.minimumSamples && latencies.length >= Math.min(slo.minimumSamples, total);
  const latencyHealthy = latencyP95ObservedMs !== null && latencyP95ObservedMs <= slo.latencyP95Ms;

  let state = ERROR_BUDGET_STATE.INSUFFICIENT_EVIDENCE;
  if (enoughEvidence) {
    if (burnRate >= 10 || (availability !== null && availability < slo.availabilityTarget * 0.995)) {
      state = ERROR_BUDGET_STATE.FREEZE_CHANGES;
    } else if (burnRate >= 6) {
      state = ERROR_BUDGET_STATE.FAST_BURN;
    } else if (burnRate >= 2 || !latencyHealthy) {
      state = ERROR_BUDGET_STATE.SLOW_BURN;
    } else if (burnRate >= 1) {
      state = ERROR_BUDGET_STATE.WATCH;
    } else {
      state = ERROR_BUDGET_STATE.HEALTHY;
    }
  }

  const budgetConsumedFraction = burnRate === null ? null : Math.max(0, burnRate);
  return Object.freeze({
    sloId: slo.id,
    state,
    enoughEvidence,
    availability,
    availabilityTarget: slo.availabilityTarget,
    observedFailureRate,
    allowedFailureRate,
    burnRate,
    budgetConsumedFraction,
    latencyP95ObservedMs,
    latencyP95TargetMs: slo.latencyP95Ms,
    latencyHealthy,
    deploymentChangesAllowed: state !== ERROR_BUDGET_STATE.FREEZE_CHANGES,
  });
}

export function publicSloPolicy() {
  return Object.freeze({
    version: LANERIQ_SLO_VERSION,
    evidenceRequiredBeforeHealthy: true,
    errorBudgetCanFreezeChanges: true,
    liveTelemetryClaimed: false,
    fixedInfrastructureRequired: false,
  });
}
