import { planReconnectSync } from "./billion-scale-free-ai.js";

export const OFFLINE_RUNTIME_CORE_VERSION = "2026-09-05.1";
export const OFFLINE_RUNTIME_SCHEMA_VERSION = 1;
export const OFFLINE_MUTATION_MAX_CHARS = 512 * 1024;

const SAFE_ID = /^[a-zA-Z0-9._:-]+$/u;
const OFFLINE_MUTATION_TYPES = new Set(["AI_MODIFY", "PROJECT_DRAFT", "PRIVATE_SYNC_DELTA"]);
const MUTATION_STATES = new Set(["PENDING_LOCAL", "READY_FOR_REVIEW", "APPLIED", "CONFLICT", "DISCARDED"]);

function boundedId(value, label, max = 180) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > max || !SAFE_ID.test(normalized)) throw new Error(`LANERIQ_OFFLINE_${label}_INVALID`);
  return normalized;
}

function normalizePrivacyClass(value) {
  const level = String(value || "P3").toUpperCase();
  return ["P0", "P1", "P2", "P3", "P4"].includes(level) ? level : "P4";
}

function normalizeState(value) {
  const state = String(value || "PENDING_LOCAL").toUpperCase();
  if (!MUTATION_STATES.has(state)) throw new Error("LANERIQ_OFFLINE_MUTATION_STATE_INVALID");
  return state;
}

function jsonSize(value) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("LANERIQ_OFFLINE_PAYLOAD_NOT_SERIALIZABLE");
  if (serialized.length > OFFLINE_MUTATION_MAX_CHARS) throw new Error("LANERIQ_OFFLINE_PAYLOAD_TOO_LARGE");
  return serialized.length;
}

export function classifyBrowserConnectivity({
  online = true,
  effectiveType = "4g",
  saveData = false,
  meteredHint = false,
  localPeerAvailable = false,
} = {}) {
  if (!online) return localPeerAvailable ? "local_network_only" : "offline";
  if (meteredHint) return "online_expensive";
  const type = String(effectiveType || "").toLowerCase();
  if (saveData || type === "slow-2g" || type === "2g") return "online_limited";
  return "online_fast";
}

export function createOfflineMutation({
  idempotencyKey,
  scopeKey,
  projectId,
  type,
  payload,
  privacyClass = "P3",
  baseVersionId = "local",
  createdAt = new Date().toISOString(),
  state = "PENDING_LOCAL",
} = {}) {
  const mutationType = String(type || "").toUpperCase();
  if (!OFFLINE_MUTATION_TYPES.has(mutationType)) throw new Error("LANERIQ_OFFLINE_MUTATION_TYPE_INVALID");
  const timestamp = new Date(createdAt);
  if (!Number.isFinite(timestamp.getTime())) throw new Error("LANERIQ_OFFLINE_CREATED_AT_INVALID");
  jsonSize(payload);
  return Object.freeze({
    schemaVersion: OFFLINE_RUNTIME_SCHEMA_VERSION,
    id: boundedId(idempotencyKey, "IDEMPOTENCY_KEY"),
    idempotencyKey: boundedId(idempotencyKey, "IDEMPOTENCY_KEY"),
    scopeKey: boundedId(scopeKey, "SCOPE_KEY", 220),
    projectId: boundedId(projectId, "PROJECT_ID"),
    type: mutationType,
    privacyClass: normalizePrivacyClass(privacyClass),
    baseVersionId: boundedId(baseVersionId || "local", "BASE_VERSION_ID"),
    createdAt: timestamp.toISOString(),
    state: normalizeState(state),
    payload,
    autoReplayAllowed: false,
  });
}

export function assessOfflineMutationReview(mutation, {
  connectivityState = "offline",
  privateSyncOptIn = false,
  encrypted = false,
  deltaAvailable = false,
} = {}) {
  if (!mutation || mutation.schemaVersion !== OFFLINE_RUNTIME_SCHEMA_VERSION) throw new Error("LANERIQ_OFFLINE_MUTATION_UNSUPPORTED");
  const sync = planReconnectSync({
    privacyClass: mutation.privacyClass,
    connectivityState,
    privateSyncOptIn,
    encrypted,
    deltaAvailable,
  });
  if (mutation.type === "AI_MODIFY") {
    return Object.freeze({
      readyForReview: !["offline", "local_network_only"].includes(connectivityState),
      autoReplayAllowed: false,
      reason: "private_ai_job_requires_user_review_before_network_send",
      sync,
    });
  }
  return Object.freeze({
    readyForReview: sync.allowed,
    autoReplayAllowed: mutation.type === "PRIVATE_SYNC_DELTA" && sync.route === "ENCRYPTED_DELTA",
    reason: sync.reason,
    sync,
  });
}

export function assertExactOfflineScope(record, expectedScopeKey) {
  const expected = boundedId(expectedScopeKey, "EXPECTED_SCOPE_KEY", 220);
  if (!record || record.scopeKey !== expected) throw new Error("LANERIQ_OFFLINE_SCOPE_MISMATCH");
  return true;
}

export function publicOfflineRuntimePolicy() {
  return Object.freeze({
    version: OFFLINE_RUNTIME_CORE_VERSION,
    schemaVersion: OFFLINE_RUNTIME_SCHEMA_VERSION,
    indexedDbLocalProjectStore: true,
    serviceWorkerSafeShell: true,
    privateApiResponseCaching: false,
    apiRequestsCachedByServiceWorker: false,
    exactUserProjectScopeRequired: true,
    rawUserIdPersistedByOfflineRuntime: false,
    privateMutationAutoReplayAllowed: false,
    privateAiJobRequiresReviewBeforeNetworkSend: true,
    p4AutoSyncAllowed: false,
    encryptedSyncProtocolReused: true,
    nativeOfflineModelRuntimeLive: false,
    sameUserLanMeshLive: false,
    browserOfflineRuntimeEvidenceLevel: "CODE_READY",
    evidenceBoundary: "The browser offline runtime provides a scoped IndexedDB store, safe app-shell cache and local store-and-forward journal. It does not claim native offline LLM inference, same-user LAN transport, or Production encrypted cross-device sync LIVE.",
  });
}
