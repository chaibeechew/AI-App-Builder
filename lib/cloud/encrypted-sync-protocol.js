import {
  LANERIQ_PRIVATE_ENVELOPE_ALGORITHM,
  LANERIQ_PRIVATE_ENVELOPE_VERSION,
} from "./encryption-envelope.js";

export const LANERIQ_ENCRYPTED_SYNC_PROTOCOL_VERSION = "laneriq-sync-v1";
export const LANERIQ_ENCRYPTED_SYNC_MAX_CIPHERTEXT_CHARS = 3 * 1024 * 1024;
export const LANERIQ_ENCRYPTED_SYNC_MAX_ID_CHARS = 160;

const ID_PATTERN = /^[a-zA-Z0-9._:-]+$/u;
const encoder = new TextEncoder();

function runtimeCrypto() {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) throw new Error("LANERIQ_SYNC_CRYPTO_UNAVAILABLE");
  return crypto;
}

function boundedId(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > LANERIQ_ENCRYPTED_SYNC_MAX_ID_CHARS || !ID_PATTERN.test(normalized)) {
    throw new Error(`LANERIQ_SYNC_${label}_INVALID`);
  }
  return normalized;
}

function positiveRevision(value, label, { allowZero = false } = {}) {
  const revision = Number(value);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(revision) || revision < minimum) throw new Error(`LANERIQ_SYNC_${label}_INVALID`);
  return revision;
}

function normalizeContext(context) {
  return Object.freeze({
    tenantId: boundedId(context?.tenantId, "TENANT_ID"),
    projectId: boundedId(context?.projectId, "PROJECT_ID"),
    purpose: boundedId(context?.purpose || "private-sync", "PURPOSE"),
  });
}

function assertEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new Error("LANERIQ_SYNC_ENVELOPE_REQUIRED");
  if (envelope.version !== LANERIQ_PRIVATE_ENVELOPE_VERSION || envelope.algorithm !== LANERIQ_PRIVATE_ENVELOPE_ALGORITHM) {
    throw new Error("LANERIQ_SYNC_ENVELOPE_UNSUPPORTED");
  }
  boundedId(envelope.keyId, "KEY_ID");
  const iv = String(envelope.iv || "");
  const ciphertext = String(envelope.ciphertext || "");
  if (!iv || iv.length > 64 || !ciphertext || ciphertext.length > LANERIQ_ENCRYPTED_SYNC_MAX_CIPHERTEXT_CHARS) {
    throw new Error("LANERIQ_SYNC_ENVELOPE_BOUNDS_INVALID");
  }
  for (const forbidden of ["key", "rawKey", "plaintext", "secret", "password"]) {
    if (Object.prototype.hasOwnProperty.call(envelope, forbidden)) throw new Error("LANERIQ_SYNC_ENVELOPE_SECRET_FIELD_FORBIDDEN");
  }
}

function base64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function sha256(value) {
  const digest = await runtimeCrypto().subtle.digest("SHA-256", encoder.encode(String(value)));
  return base64Url(new Uint8Array(digest));
}

function canonicalContext(context) {
  return JSON.stringify({ tenantId: context.tenantId, projectId: context.projectId, purpose: context.purpose });
}

export async function createEncryptedSyncMutation({
  envelope,
  context,
  operationId,
  deviceId,
  revision,
  previousRevision,
  createdAt = new Date().toISOString(),
} = {}) {
  assertEnvelope(envelope);
  const normalizedContext = normalizeContext(context);
  const normalizedRevision = positiveRevision(revision, "REVISION");
  const normalizedPrevious = positiveRevision(previousRevision, "PREVIOUS_REVISION", { allowZero: true });
  if (normalizedRevision !== normalizedPrevious + 1) throw new Error("LANERIQ_SYNC_REVISION_SEQUENCE_INVALID");
  const normalizedCreatedAt = new Date(createdAt);
  if (!Number.isFinite(normalizedCreatedAt.getTime())) throw new Error("LANERIQ_SYNC_CREATED_AT_INVALID");

  return Object.freeze({
    protocolVersion: LANERIQ_ENCRYPTED_SYNC_PROTOCOL_VERSION,
    operationId: boundedId(operationId, "OPERATION_ID"),
    deviceId: boundedId(deviceId, "DEVICE_ID"),
    revision: normalizedRevision,
    previousRevision: normalizedPrevious,
    createdAt: normalizedCreatedAt.toISOString(),
    context: normalizedContext,
    contextHash: await sha256(canonicalContext(normalizedContext)),
    ciphertextHash: await sha256(`${envelope.keyId}.${envelope.iv}.${envelope.ciphertext}`),
    envelope: Object.freeze({
      version: envelope.version,
      algorithm: envelope.algorithm,
      keyId: boundedId(envelope.keyId, "KEY_ID"),
      iv: String(envelope.iv),
      ciphertext: String(envelope.ciphertext),
    }),
  });
}

export async function validateEncryptedSyncMutation(record, { expectedContext } = {}) {
  if (!record || record.protocolVersion !== LANERIQ_ENCRYPTED_SYNC_PROTOCOL_VERSION) throw new Error("LANERIQ_SYNC_PROTOCOL_UNSUPPORTED");
  assertEnvelope(record.envelope);
  boundedId(record.operationId, "OPERATION_ID");
  boundedId(record.deviceId, "DEVICE_ID");
  const revision = positiveRevision(record.revision, "REVISION");
  const previousRevision = positiveRevision(record.previousRevision, "PREVIOUS_REVISION", { allowZero: true });
  if (revision !== previousRevision + 1) throw new Error("LANERIQ_SYNC_REVISION_SEQUENCE_INVALID");
  const context = normalizeContext(record.context);
  if (expectedContext) {
    const expected = normalizeContext(expectedContext);
    if (canonicalContext(context) !== canonicalContext(expected)) throw new Error("LANERIQ_SYNC_CONTEXT_MISMATCH");
  }
  if ((await sha256(canonicalContext(context))) !== record.contextHash) throw new Error("LANERIQ_SYNC_CONTEXT_HASH_MISMATCH");
  if ((await sha256(`${record.envelope.keyId}.${record.envelope.iv}.${record.envelope.ciphertext}`)) !== record.ciphertextHash) {
    throw new Error("LANERIQ_SYNC_CIPHERTEXT_HASH_MISMATCH");
  }
  return true;
}

export function assessEncryptedSyncApply(record, { currentRevision = 0, seenOperationIds = [] } = {}) {
  const operationId = boundedId(record?.operationId, "OPERATION_ID");
  const revision = positiveRevision(record?.revision, "REVISION");
  const previousRevision = positiveRevision(record?.previousRevision, "PREVIOUS_REVISION", { allowZero: true });
  const current = positiveRevision(currentRevision, "CURRENT_REVISION", { allowZero: true });
  const seen = new Set((seenOperationIds || []).map(value => String(value)));
  if (seen.has(operationId)) return Object.freeze({ accepted: true, replayed: true, conflict: false, nextRevision: current });
  if (previousRevision !== current || revision !== current + 1) {
    return Object.freeze({ accepted: false, replayed: false, conflict: true, nextRevision: current });
  }
  return Object.freeze({ accepted: true, replayed: false, conflict: false, nextRevision: revision });
}

export function publicEncryptedSyncProtocolPolicy() {
  return Object.freeze({
    protocolVersion: LANERIQ_ENCRYPTED_SYNC_PROTOCOL_VERSION,
    ciphertextOnlyTransport: true,
    contextBound: true,
    replayAware: true,
    optimisticConcurrency: true,
    boundedPayloads: true,
    serverReceivesRawProjectKey: false,
    nativeSecureKeyCustodyLive: false,
    crossDeviceKeyExchangeLive: false,
    encryptedSyncProductionLive: false,
  });
}
