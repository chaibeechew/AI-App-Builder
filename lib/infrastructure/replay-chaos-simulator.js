export const LANERIQ_REPLAY_CHAOS_VERSION = "2026-09-03.2";

function finiteNonNegative(value, name) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`LANERIQ_REPLAY_INVALID_${name}`);
  return number;
}

function ratio(value, name) {
  const number = finiteNonNegative(value, name);
  if (number > 1) throw new Error(`LANERIQ_REPLAY_${name}_RANGE`);
  return number;
}

function token(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > 96) throw new Error(`LANERIQ_REPLAY_INVALID_${name}`);
  return normalized;
}

function deterministicFraction(seed) {
  const text = String(seed || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function createReplayEnvelope({
  id,
  serviceId,
  cellId = "global",
  requestClass = "default",
  latencyMs = 0,
  success = true,
  statusCode = null,
} = {}) {
  const code = statusCode === null || statusCode === undefined ? null : Math.floor(finiteNonNegative(statusCode, "STATUS_CODE"));
  if (code !== null && (code < 100 || code > 599)) throw new Error("LANERIQ_REPLAY_STATUS_CODE_RANGE");
  return Object.freeze({
    version: LANERIQ_REPLAY_CHAOS_VERSION,
    id: token(id, "ID"),
    serviceId: token(serviceId, "SERVICE_ID"),
    cellId: token(cellId, "CELL_ID"),
    requestClass: token(requestClass, "REQUEST_CLASS"),
    latencyMs: finiteNonNegative(latencyMs, "LATENCY_MS"),
    success: Boolean(success),
    statusCode: code,
  });
}

function summarize(events) {
  const total = events.length;
  const failures = events.filter((event) => !event.success).length;
  const dropped = events.filter((event) => event.dropped === true).length;
  const successes = events.filter((event) => event.success && event.dropped !== true).length;
  const latencies = events.filter((event) => !event.dropped).map((event) => event.latencyMs);
  return Object.freeze({
    total,
    failures,
    dropped,
    availability: total ? successes / total : null,
    p95LatencyMs: percentile(latencies, 95),
  });
}

export function simulateReplay({
  events = [],
  seed = "laneriq",
  faultPlan = {},
  thresholds = {},
} = {}) {
  const normalized = (Array.isArray(events) ? events : []).map(createReplayEnvelope);
  const addedLatencyMs = Math.min(60000, finiteNonNegative(faultPlan.addedLatencyMs, "ADDED_LATENCY_MS"));
  const failureRate = ratio(faultPlan.failureRate, "FAILURE_RATE");
  const dropRate = ratio(faultPlan.dropRate, "DROP_RATE");
  const outageCells = new Set((Array.isArray(faultPlan.outageCells) ? faultPlan.outageCells : []).map((value) => token(value, "OUTAGE_CELL")));
  const targetedClasses = new Set((Array.isArray(faultPlan.requestClasses) ? faultPlan.requestClasses : []).map((value) => token(value, "REQUEST_CLASS")));
  const availabilityDropLimit = ratio(thresholds.maxAvailabilityDrop ?? 0.01, "MAX_AVAILABILITY_DROP");
  const p95IncreaseLimitMs = finiteNonNegative(thresholds.maxP95IncreaseMs ?? 1500, "MAX_P95_INCREASE_MS");

  const simulated = normalized.map((event) => {
    const targeted = targetedClasses.size === 0 || targetedClasses.has(event.requestClass);
    const outage = outageCells.has(event.cellId);
    const failureDraw = deterministicFraction(`${seed}|fail|${event.id}`);
    const dropDraw = deterministicFraction(`${seed}|drop|${event.id}`);
    const dropped = targeted && (outage || dropDraw < dropRate);
    const injectedFailure = targeted && !dropped && (outage || failureDraw < failureRate);
    return Object.freeze({
      ...event,
      latencyMs: event.latencyMs + (targeted && !dropped ? addedLatencyMs : 0),
      success: dropped ? false : (injectedFailure ? false : event.success),
      dropped,
      injectedFailure,
      outageInjected: outage,
    });
  });

  const baseline = summarize(normalized.map((event) => ({ ...event, dropped: false })));
  const result = summarize(simulated);
  const availabilityDrop = baseline.availability === null || result.availability === null ? 0 : Math.max(0, baseline.availability - result.availability);
  const p95IncreaseMs = baseline.p95LatencyMs === null || result.p95LatencyMs === null ? 0 : Math.max(0, result.p95LatencyMs - baseline.p95LatencyMs);
  const pass = availabilityDrop <= availabilityDropLimit && p95IncreaseMs <= p95IncreaseLimitMs;

  return Object.freeze({
    version: LANERIQ_REPLAY_CHAOS_VERSION,
    seed: String(seed),
    baseline,
    simulated: result,
    availabilityDrop,
    p95IncreaseMs,
    thresholds: Object.freeze({ maxAvailabilityDrop: availabilityDropLimit, maxP95IncreaseMs: p95IncreaseLimitMs }),
    pass,
    productionMutationPerformed: false,
    externalNetworkUsed: false,
    replayedPayloadData: false,
    outcomes: Object.freeze(simulated),
  });
}

export function publicReplayChaosPolicy() {
  return Object.freeze({
    version: LANERIQ_REPLAY_CHAOS_VERSION,
    deterministicBySeed: true,
    productionMutationAllowed: false,
    externalNetworkAllowed: false,
    productionPayloadReplayAllowed: false,
    liveTrafficInjectionClaimed: false,
    fixedInfrastructureRequired: false,
    defaultMode: "offline_control_plane_simulation",
  });
}
