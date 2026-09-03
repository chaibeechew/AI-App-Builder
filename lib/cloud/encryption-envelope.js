export const LANERIQ_PRIVATE_ENVELOPE_VERSION = "laneriq-private-v1";
export const LANERIQ_PRIVATE_ENVELOPE_ALGORITHM = "AES-256-GCM";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function runtimeCrypto() {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle || typeof crypto.getRandomValues !== "function") {
    throw new Error("LANERIQ_PRIVATE_CRYPTO_UNAVAILABLE");
  }
  return crypto;
}

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof value === "string") return encoder.encode(value);
  throw new Error("LANERIQ_PRIVATE_ENVELOPE_BYTES_REQUIRED");
}

function encodeBase64Url(value) {
  const bytes = asBytes(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value) {
  const text = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = text + "=".repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function canonicalContext(context, keyId) {
  const tenantId = String(context?.tenantId || "").trim();
  const projectId = String(context?.projectId || "").trim();
  const purpose = String(context?.purpose || "private-sync").trim();
  const normalizedKeyId = String(keyId || "").trim();
  if (!tenantId || !projectId || !purpose || !normalizedKeyId) {
    throw new Error("LANERIQ_PRIVATE_ENVELOPE_CONTEXT_REQUIRED");
  }
  return JSON.stringify({
    version: LANERIQ_PRIVATE_ENVELOPE_VERSION,
    tenantId,
    projectId,
    purpose,
    keyId: normalizedKeyId,
  });
}

function assertKey(key) {
  if (!key || key.type !== "secret" || key.algorithm?.name !== "AES-GCM") {
    throw new Error("LANERIQ_PRIVATE_ENVELOPE_AES_KEY_REQUIRED");
  }
}

export function generateProjectKeyMaterial() {
  const rawKey = new Uint8Array(KEY_BYTES);
  runtimeCrypto().getRandomValues(rawKey);
  return rawKey;
}

export async function importProjectDataKey(rawKey) {
  const bytes = asBytes(rawKey);
  if (bytes.byteLength !== KEY_BYTES) throw new Error("LANERIQ_PRIVATE_ENVELOPE_KEY_LENGTH_INVALID");
  return runtimeCrypto().subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptPrivateEnvelope({ plaintext, key, keyId, context }) {
  assertKey(key);
  const iv = new Uint8Array(IV_BYTES);
  runtimeCrypto().getRandomValues(iv);
  const additionalData = encoder.encode(canonicalContext(context, keyId));
  const ciphertext = await runtimeCrypto().subtle.encrypt(
    { name: "AES-GCM", iv, additionalData, tagLength: 128 },
    key,
    asBytes(plaintext),
  );

  return Object.freeze({
    version: LANERIQ_PRIVATE_ENVELOPE_VERSION,
    algorithm: LANERIQ_PRIVATE_ENVELOPE_ALGORITHM,
    keyId: String(keyId).trim(),
    iv: encodeBase64Url(iv),
    ciphertext: encodeBase64Url(ciphertext),
  });
}

export async function decryptPrivateEnvelope({ envelope, key, context }) {
  assertKey(key);
  if (envelope?.version !== LANERIQ_PRIVATE_ENVELOPE_VERSION || envelope?.algorithm !== LANERIQ_PRIVATE_ENVELOPE_ALGORITHM) {
    throw new Error("LANERIQ_PRIVATE_ENVELOPE_VERSION_UNSUPPORTED");
  }
  const keyId = String(envelope?.keyId || "").trim();
  const iv = decodeBase64Url(envelope?.iv);
  if (!keyId || iv.byteLength !== IV_BYTES || !envelope?.ciphertext) {
    throw new Error("LANERIQ_PRIVATE_ENVELOPE_INVALID");
  }
  const additionalData = encoder.encode(canonicalContext(context, keyId));
  const plaintext = await runtimeCrypto().subtle.decrypt(
    { name: "AES-GCM", iv, additionalData, tagLength: 128 },
    key,
    decodeBase64Url(envelope.ciphertext),
  );
  return new Uint8Array(plaintext);
}

export async function encryptPrivateTextEnvelope(input) {
  return encryptPrivateEnvelope(input);
}

export async function decryptPrivateTextEnvelope(input) {
  return decoder.decode(await decryptPrivateEnvelope(input));
}

export function publicEncryptionEnvelopePolicy() {
  return Object.freeze({
    version: LANERIQ_PRIVATE_ENVELOPE_VERSION,
    algorithm: LANERIQ_PRIVATE_ENVELOPE_ALGORITHM,
    authenticatedEncryption: true,
    aadBindsTenantProjectPurposeAndKeyId: true,
    keyMaterialStoredInEnvelope: false,
    keyExtractableAfterImport: false,
    nativeKeyCustodyLive: false,
    encryptedSyncFullyLive: false,
  });
}
