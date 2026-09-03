export const LANERIQ_SHADOW_SCHEDULER_VERSION = "2026-09-03.1";

function finiteNonNegative(value, name) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`LANERIQ_SHADOW_INVALID_${name}`);
  return number;
}

function stableFraction(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function normalizeCandidate(candidate, index) {
  const id = String(candidate?.id || "").trim();
  if (!id) throw new Error(`LANERIQ_SHADOW_CANDIDATE_${index}_ID_REQUIRED`);
  return Object.freeze({
    id,
    eligible: candidate?.eligible !== false,
    healthy: candidate?.healthy !== false,
    predictedLatencyMs: finiteNonNegative(candidate?.predictedLatencyMs, `CANDIDATE_${index}_LATENCY`),
    predictedErrorRate: finiteNonNegative(candidate?.predictedErrorRate, `CANDIDATE_${index}_ERROR_RATE`),
    incrementalCostUsd: finiteNonNegative(candidate?.incrementalCostUsd, `CANDIDATE_${index}_COST`),
    capacityScore: Math.min(1, finiteNonNegative(candidate?.capacityScore ?? 1, `CANDIDATE_${index}_CAPACITY`)),
  });
}

function candidateScore(candidate) {
  if (!candidate.eligible || !candidate.healthy) return Number.POSITIVE_INFINITY;
  return (
    candidate.predictedErrorRate * 100000 +
    candidate.incrementalCostUsd * 10000 +
    candidate.predictedLatencyMs * 0.1 +
    (1 - candidate.capacityScore) * 100
  );
}

export function planShadowSchedule({
  taskId,
  candidates = [],
  shadowSampleRate = 0,
  maxShadowIncrementalCostUsd = 0,
} = {}) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) throw new Error("LANERIQ_SHADOW_TASK_ID_REQUIRED");

  const sampleRate = finiteNonNegative(shadowSampleRate, "SAMPLE_RATE");
  if (sampleRate > 1) throw new Error("LANERIQ_SHADOW_SAMPLE_RATE_RANGE");
  const maxShadowCost = finiteNonNegative(maxShadowIncrementalCostUsd, "MAX_SHADOW_COST");

  const ranked = (Array.isArray(candidates) ? candidates : [])
    .map(normalizeCandidate)
    .map((candidate) => Object.freeze({ ...candidate, score: candidateScore(candidate) }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));

  if (!ranked.length) throw new Error("LANERIQ_SHADOW_NO_ELIGIBLE_PRIMARY");

  const primary = ranked[0];
  const shadowCandidate = ranked.slice(1).find((candidate) => candidate.incrementalCostUsd <= maxShadowCost) || null;
  const sampled = stableFraction(normalizedTaskId) < sampleRate;
  const shadow = sampled ? shadowCandidate : null;

  return Object.freeze({
    version: LANERIQ_SHADOW_SCHEDULER_VERSION,
    taskId: normalizedTaskId,
    primaryTargetId: primary.id,
    shadowTargetId: shadow?.id || null,
    shadowPlanned: Boolean(shadow),
    shadowReason: !sampled
      ? "sample_not_selected"
      : shadowCandidate
        ? "advisory_shadow_selected"
        : "no_zero_cost_or_budgeted_shadow_candidate",
    mutationAllowedForShadow: false,
    primaryScore: primary.score,
    shadowScore: shadow?.score ?? null,
    shadowIncrementalCostUsd: shadow?.incrementalCostUsd ?? 0,
  });
}

export function compareShadowOutcome({ primary, shadow } = {}) {
  if (!primary || !shadow) throw new Error("LANERIQ_SHADOW_OUTCOMES_REQUIRED");
  const primaryLatency = finiteNonNegative(primary.latencyMs, "PRIMARY_LATENCY");
  const shadowLatency = finiteNonNegative(shadow.latencyMs, "SHADOW_LATENCY");
  const primarySuccess = primary.success !== false;
  const shadowSuccess = shadow.success !== false;

  let preferred = "primary";
  if (!primarySuccess && shadowSuccess) preferred = "shadow";
  else if (primarySuccess === shadowSuccess && shadowLatency + 25 < primaryLatency) preferred = "shadow";

  return Object.freeze({
    preferred,
    advisoryOnly: true,
    automaticCutoverAllowed: false,
    primarySuccess,
    shadowSuccess,
    latencyDeltaMs: shadowLatency - primaryLatency,
  });
}

export function publicShadowSchedulerPolicy() {
  return Object.freeze({
    version: LANERIQ_SHADOW_SCHEDULER_VERSION,
    defaultShadowSampleRate: 0,
    defaultShadowIncrementalCostUsd: 0,
    shadowCanMutateProduction: false,
    automaticCutoverFromShadow: false,
    liveShadowTrafficClaimed: false,
  });
}
