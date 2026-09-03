export const LANERIQ_TELEMETRY_VERSION = "2026-09-03.2";

export const TELEMETRY_SIGNAL = Object.freeze({
  REQUEST: "request",
  LATENCY: "latency",
  ERROR: "error",
  CAPACITY: "capacity",
  DEPLOYMENT: "deployment",
  ROUTE_DECISION: "route_decision",
});

const SIGNALS = new Set(Object.values(TELEMETRY_SIGNAL));
const TOKEN_RE = /^[a-z0-9][a-z0-9._:-]{0,95}$/i;
const BLOCKED_METADATA_KEY = /(provider|vendor|token|secret|authorization|cookie|api.?key|email|phone|ip|prompt|payload|request.?body|response.?body|user.?id)/i;

function token(value, name) {
  const normalized = String(value || "").trim();
  if (!TOKEN_RE.test(normalized)) throw new Error(`LANERIQ_TELEMETRY_INVALID_${name}`);
  return normalized;
}

function finiteNonNegative(value, name, nullable = false) {
  if (nullable && (value === null || value === undefined)) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`LANERIQ_TELEMETRY_INVALID_${name}`);
  return number;
}

function sanitizeMetadata(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const output = {};
  for (const [key, value] of Object.entries(source).slice(0, 24)) {
    if (BLOCKED_METADATA_KEY.test(key)) continue;
    if (!["string", "number", "boolean"].includes(typeof value)) continue;
    const normalizedKey = String(key).replace(/[^a-z0-9_.:-]/gi, "_").slice(0, 64);
    if (!normalizedKey) continue;
    if (typeof value === "string") output[normalizedKey] = value.slice(0, 160);
    else if (typeof value === "number" && Number.isFinite(value)) output[normalizedKey] = value;
    else if (typeof value === "boolean") output[normalizedKey] = value;
  }
  return Object.freeze(output);
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function createTelemetryEvent({
  id,
  signal,
  serviceId,
  cellId = "global",
  routeClass = "default",
  timestampMs = Date.now(),
  durationMs = null,
  success = null,
  statusCode = null,
  metadata = {},
} = {}) {
  const normalizedSignal = String(signal || "").trim().toLowerCase();
  if (!SIGNALS.has(normalizedSignal)) throw new Error("LANERIQ_TELEMETRY_SIGNAL_UNSUPPORTED");
  const eventId = token(id, "ID");
  const service = token(serviceId, "SERVICE_ID");
  const cell = token(cellId, "CELL_ID");
  const route = token(routeClass, "ROUTE_CLASS");
  const timestamp = Math.floor(finiteNonNegative(timestampMs, "TIMESTAMP_MS"));
  const duration = finiteNonNegative(durationMs, "DURATION_MS", true);
  const code = statusCode === null || statusCode === undefined ? null : Math.floor(finiteNonNegative(statusCode, "STATUS_CODE"));
  if (code !== null && (code < 100 || code > 599)) throw new Error("LANERIQ_TELEMETRY_STATUS_CODE_RANGE");

  return Object.freeze({
    version: LANERIQ_TELEMETRY_VERSION,
    id: eventId,
    signal: normalizedSignal,
    serviceId: service,
    cellId: cell,
    routeClass: route,
    timestampMs: timestamp,
    durationMs: duration,
    success: success === null || success === undefined ? null : Boolean(success),
    statusCode: code,
    metadata: sanitizeMetadata(metadata),
  });
}

export function createTelemetryBus({ maxEvents = 1000, now = () => Date.now() } = {}) {
  const capacity = Math.floor(finiteNonNegative(maxEvents, "MAX_EVENTS"));
  if (capacity < 1 || capacity > 10000) throw new Error("LANERIQ_TELEMETRY_MAX_EVENTS_RANGE");
  if (typeof now !== "function") throw new Error("LANERIQ_TELEMETRY_NOW_FUNCTION_REQUIRED");
  const events = [];

  return Object.freeze({
    emit(input = {}) {
      const event = createTelemetryEvent({ ...input, timestampMs: input.timestampMs ?? now() });
      events.push(event);
      if (events.length > capacity) events.splice(0, events.length - capacity);
      return event;
    },
    snapshot({ serviceId = null, cellId = null, sinceMs = 0 } = {}) {
      const since = finiteNonNegative(sinceMs, "SINCE_MS");
      const service = serviceId === null ? null : token(serviceId, "SERVICE_ID");
      const cell = cellId === null ? null : token(cellId, "CELL_ID");
      return Object.freeze(events.filter((event) => (
        event.timestampMs >= since &&
        (service === null || event.serviceId === service) &&
        (cell === null || event.cellId === cell)
      )));
    },
    clear() {
      events.length = 0;
    },
    size() {
      return events.length;
    },
    capacity,
  });
}

export function aggregateTelemetry(events = []) {
  const normalized = (Array.isArray(events) ? events : []).map((event) => createTelemetryEvent(event));
  const durations = normalized.map((event) => event.durationMs).filter((value) => value !== null);
  const successSamples = normalized.filter((event) => event.success !== null);
  const failures = successSamples.filter((event) => event.success === false).length;
  const cells = [...new Set(normalized.map((event) => event.cellId))];
  const routes = [...new Set(normalized.map((event) => event.routeClass))];

  return Object.freeze({
    version: LANERIQ_TELEMETRY_VERSION,
    sampleCount: normalized.length,
    successSampleCount: successSamples.length,
    successRate: successSamples.length ? (successSamples.length - failures) / successSamples.length : null,
    errorCount: failures,
    latencyP50Ms: percentile(durations, 50),
    latencyP95Ms: percentile(durations, 95),
    affectedCells: Object.freeze(cells),
    routeClasses: Object.freeze(routes),
    providerIdentityExposed: false,
  });
}

export function publicTelemetryPolicy() {
  return Object.freeze({
    version: LANERIQ_TELEMETRY_VERSION,
    providerIdentityExposed: false,
    productionPayloadCaptureAllowed: false,
    blockedSensitiveMetadata: true,
    durableStorageClaimed: false,
    liveExternalIngestionClaimed: false,
    fixedInfrastructureRequired: false,
    defaultMode: "in_memory_bounded_control_plane_evidence",
  });
}
