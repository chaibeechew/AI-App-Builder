import crypto from "node:crypto";

export const CLOUD_SECURITY_LEVEL = 5;
export const CLOUD_SECURITY_PROFILE = "LANERIQ-CLOUD-L5";
export const CLOUD_CONTRACT = "csvc1";
export const CLOUD_OPERATE_PATH = "/api/cloud/v1/operate";
export const CLOUD_MAX_REQUEST_BYTES = 128 * 1024;
export const CLOUD_MAX_UPSTREAM_RESPONSE_BYTES = 256 * 1024;

const MAX_SKEW = 5 * 60 * 1000;
const NONCE_TTL = 10 * 60 * 1000;
const BURST_WINDOW = 60 * 1000;
const BURST_LIMIT = 120;
const WRITE_BURST_LIMIT = 40;
const ID = /^[A-Za-z0-9._:-]{1,160}$/;
const SIG = /^[a-f0-9]{64}$/i;
const OPS = new Set(["project.read", "project.write", "context.read", "context.write", "artifact.meta"]);
const FORBIDDEN_KEYS = /^(?:__proto__|prototype|constructor)$/i;
const SECRET_KEYS = /^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|service[_-]?role|private[_-]?key|client[_-]?secret|credential)$/i;
const METADATA_BINARY_KEYS = /^(?:content|contents|bytes|binary|blob|fileData|file_data|base64|raw)$/i;

const nonceCache = globalThis.__laneriqCloudNonceCache || new Map();
const burstCache = globalThis.__laneriqCloudBurstCache || new Map();
globalThis.__laneriqCloudNonceCache = nonceCache;
globalThis.__laneriqCloudBurstCache = burstCache;

function secret() {
  return String(process.env.LANERIQ_CLOUD_SERVICE_SECRET || "");
}

function hash(body) {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function expected(body, ts, nonce) {
  return crypto
    .createHmac("sha256", secret())
    .update(`${CLOUD_CONTRACT}\n${ts}\n${nonce}\n${CLOUD_OPERATE_PATH}\n${hash(body)}`)
    .digest("hex");
}

function prune(cache, now, ttl) {
  for (const [key, value] of cache.entries()) {
    const at = typeof value === "number" ? value : Number(value?.startedAt || 0);
    if (!Number.isFinite(at) || now - at > ttl) cache.delete(key);
  }
}

function inspectObject(value, state, depth = 0) {
  if (depth > 12) return "PAYLOAD_TOO_DEEP";
  if (value === null || typeof value === "boolean" || typeof value === "number") return null;
  if (typeof value === "string") {
    state.strings += value.length;
    if (state.strings > 256 * 1024) return "PAYLOAD_TEXT_TOO_LARGE";
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length > 500) return "PAYLOAD_ARRAY_TOO_LARGE";
    for (const item of value) {
      const error = inspectObject(item, state, depth + 1);
      if (error) return error;
    }
    return null;
  }
  if (!value || typeof value !== "object") return "UNSUPPORTED_PAYLOAD_VALUE";
  const entries = Object.entries(value);
  state.keys += entries.length;
  if (state.keys > 800) return "PAYLOAD_TOO_COMPLEX";
  for (const [key, child] of entries) {
    if (FORBIDDEN_KEYS.test(key)) return "PROTOTYPE_POLLUTION_KEY_FORBIDDEN";
    if (SECRET_KEYS.test(key) && typeof child === "string" && child.trim()) return "RAW_SECRET_FORBIDDEN";
    const error = inspectObject(child, state, depth + 1);
    if (error) return error;
  }
  return null;
}

function metadataContainsBinary(payload) {
  return Object.keys(payload || {}).some((key) => METADATA_BINARY_KEYS.test(key));
}

export function validateCloudRequestEnvelope(req, rawBody) {
  const contract = String(req.headers?.["x-laneriq-cloud-contract"] || "");
  if (contract !== CLOUD_CONTRACT) return { ok: false, status: 409, error: "CONTRACT_MISMATCH" };
  const contentType = String(req.headers?.["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) return { ok: false, status: 415, error: "JSON_CONTENT_TYPE_REQUIRED" };
  const bytes = Buffer.byteLength(String(rawBody || ""), "utf8");
  if (bytes < 2) return { ok: false, status: 400, error: "EMPTY_BODY" };
  if (bytes > CLOUD_MAX_REQUEST_BYTES) return { ok: false, status: 413, error: "REQUEST_TOO_LARGE" };
  return { ok: true };
}

export function verifySignedCloudRequest(req, body) {
  const s = secret();
  if (s.length < 32) return { ok: false, status: 503, error: "CLOUD_SERVICE_NOT_CONFIGURED" };
  const ts = String(req.headers?.["x-laneriq-cloud-ts"] || "");
  const nonce = String(req.headers?.["x-laneriq-cloud-nonce"] || "");
  const sig = String(req.headers?.["x-laneriq-cloud-signature"] || "");
  const n = Number(ts);
  if (!Number.isFinite(n) || Math.abs(Date.now() - n) > MAX_SKEW) return { ok: false, status: 401, error: "STALE_OR_INVALID_TIMESTAMP" };
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(nonce)) return { ok: false, status: 401, error: "INVALID_NONCE" };
  if (!SIG.test(sig)) return { ok: false, status: 401, error: "INVALID_SIGNATURE" };
  const exp = expected(body, ts, nonce);
  if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(exp, "hex"))) return { ok: false, status: 401, error: "INVALID_SIGNATURE" };

  const now = Date.now();
  prune(nonceCache, now, NONCE_TTL);
  if (nonceCache.has(nonce)) return { ok: false, status: 409, error: "REPLAYED_NONCE" };
  nonceCache.set(nonce, now);
  return { ok: true };
}

export function validateCloudPayload(input = {}) {
  const operation = String(input.operation || "");
  if (!OPS.has(operation)) return { ok: false, error: "INVALID_OPERATION" };
  const requestId = String(input.requestId || "");
  const tenantId = String(input.tenantId || "");
  const userId = String(input.userId || "");
  const projectId = String(input.projectId || "");
  if (!ID.test(requestId) || !ID.test(tenantId) || !ID.test(userId) || !ID.test(projectId)) return { ok: false, error: "INVALID_SCOPE_IDENTITY" };
  if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) return { ok: false, error: "INVALID_PAYLOAD_OBJECT" };

  const payload = input.payload;
  const state = { keys: 0, strings: 0 };
  const inspectionError = inspectObject(payload, state);
  if (inspectionError) return { ok: false, error: inspectionError };
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > CLOUD_MAX_REQUEST_BYTES) return { ok: false, error: "PAYLOAD_TOO_LARGE" };
  if (/\b(select|insert|update|delete|drop|alter|create)\b[\s\S]{0,30}\b(from|into|table)\b/i.test(serialized)) return { ok: false, error: "ARBITRARY_QUERY_FORBIDDEN" };
  if (operation === "artifact.meta" && metadataContainsBinary(payload)) return { ok: false, error: "BINARY_UPLOAD_FORBIDDEN" };

  return { ok: true, value: { operation, requestId, tenantId, userId, projectId, payload } };
}

export function enforceCloudBurstLimit(scope) {
  const now = Date.now();
  prune(burstCache, now, BURST_WINDOW * 2);
  const write = String(scope.operation || "").endsWith(".write");
  const limit = write ? WRITE_BURST_LIMIT : BURST_LIMIT;
  const key = `${scope.tenantId}:${scope.userId}:${write ? "write" : "read"}`;
  const current = burstCache.get(key);
  if (!current || now - current.startedAt >= BURST_WINDOW) {
    burstCache.set(key, { startedAt: now, count: 1 });
    return { ok: true, limit, remaining: limit - 1 };
  }
  if (current.count >= limit) return { ok: false, status: 429, error: "CLOUD_RATE_LIMITED", retryAfter: Math.max(1, Math.ceil((BURST_WINDOW - (now - current.startedAt)) / 1000)) };
  current.count += 1;
  burstCache.set(key, current);
  return { ok: true, limit, remaining: Math.max(0, limit - current.count) };
}

export function validateAdapterUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return "";
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return "";
    if (/^(?:10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) return "";
    return url.toString();
  } catch {
    return "";
  }
}
