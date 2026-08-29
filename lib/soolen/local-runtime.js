// Soolen Local Runtime Adapter
// Device-first execution boundary. Raw customer media stays in browser memory by default.

const APPROVED_MODEL_IDS = new Set();

export class SoolenLocalRuntimeError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "SoolenLocalRuntimeError";
    this.code = code;
  }
}

export function getLocalRuntimeCapabilities() {
  if (typeof window === "undefined") return { available: false, reason: "browser-required" };
  const nav = navigator || {};
  return {
    available: true,
    webgpu: Boolean(nav.gpu),
    cpuThreads: Number(nav.hardwareConcurrency || 0) || null,
    memoryGB: Number(nav.deviceMemory || 0) || null,
    networkDefault: "deny",
    persistenceDefault: "ephemeral",
    rawMediaUploadDefault: false,
  };
}

export function createLocalRuntimeSession({ taskId, allowNetwork = false, allowPersistence = false } = {}) {
  if (typeof window === "undefined") throw new SoolenLocalRuntimeError("LOCAL_RUNTIME_BROWSER_REQUIRED");
  return {
    id: taskId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    permissions: { network: allowNetwork === true, persistence: allowPersistence === true },
    state: "ready",
    blobs: new Set(),
    cancelled: false,
  };
}

export function attachPrivateBlob(session, file) {
  if (!session || session.cancelled) throw new SoolenLocalRuntimeError("LOCAL_SESSION_INACTIVE");
  if (!(file instanceof Blob)) throw new SoolenLocalRuntimeError("LOCAL_BLOB_REQUIRED");
  session.blobs.add(file);
  return { name: file.name || "private-blob", type: file.type || "application/octet-stream", size: file.size, localOnly: true };
}

export function assertApprovedModel(manifest = {}) {
  if (!manifest.id || !APPROVED_MODEL_IDS.has(manifest.id)) throw new SoolenLocalRuntimeError("MODEL_NOT_APPROVED");
  if (!manifest.sha256) throw new SoolenLocalRuntimeError("MODEL_HASH_REQUIRED");
  return true;
}

export async function loadModel(session, manifest) {
  if (!session || session.cancelled) throw new SoolenLocalRuntimeError("LOCAL_SESSION_INACTIVE");
  assertApprovedModel(manifest);
  throw new SoolenLocalRuntimeError("LOCAL_MODEL_RUNTIME_NOT_CONNECTED", "Approved local model runtime is not connected yet.");
}

export async function renderChunk() {
  throw new SoolenLocalRuntimeError("LOCAL_MODEL_RUNTIME_NOT_CONNECTED", "Local rendering requires a connected approved model runtime.");
}

export async function mergeChunks() {
  throw new SoolenLocalRuntimeError("LOCAL_MERGE_RUNTIME_NOT_CONNECTED", "Local media merge runtime is not connected yet.");
}

export function cancelLocalRuntimeSession(session) {
  if (!session) return;
  session.cancelled = true;
  session.state = "cancelled";
  session.blobs?.clear?.();
}

export function disposeLocalRuntimeSession(session) {
  if (!session) return;
  session.blobs?.clear?.();
  session.state = "disposed";
}
