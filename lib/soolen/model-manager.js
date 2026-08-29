// Soolen Local Model Manager
// Approved-model registry, compatibility selection and integrity verification.

const registry = new Map();

export function registerApprovedModel(manifest = {}) {
  const id = String(manifest.id || "").trim();
  const version = String(manifest.version || "").trim();
  const sha256 = String(manifest.sha256 || "").toLowerCase();
  if (!id || !version || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("INVALID_MODEL_MANIFEST");
  const normalized = Object.freeze({
    id,
    version,
    sha256,
    taskTypes: Array.isArray(manifest.taskTypes) ? [...new Set(manifest.taskTypes.map(String))] : [],
    runtimes: Array.isArray(manifest.runtimes) ? [...new Set(manifest.runtimes.map(String))] : [],
    minMemoryGB: Math.max(0, Number(manifest.minMemoryGB || 0)),
    requiresWebGPU: manifest.requiresWebGPU === true,
    sizeBytes: Math.max(0, Number(manifest.sizeBytes || 0)),
    source: String(manifest.source || "bundled-or-approved-source"),
    license: String(manifest.license || "unknown"),
    allowNetworkDuringInference: false,
    allowArbitraryCode: false,
  });
  registry.set(id, normalized);
  return normalized;
}

export function unregisterApprovedModel(id) {
  registry.delete(String(id));
}

export function getApprovedModel(id) {
  return registry.get(String(id)) || null;
}

export function listApprovedModels() {
  return [...registry.values()];
}

export function chooseApprovedModel({ taskType, capabilities = {} } = {}) {
  const memory = Number(capabilities.memoryGB || 0);
  const webgpu = capabilities.webgpu === true;
  return listApprovedModels()
    .filter((m) => !taskType || m.taskTypes.length === 0 || m.taskTypes.includes(taskType))
    .filter((m) => !m.requiresWebGPU || webgpu)
    .filter((m) => !m.minMemoryGB || !memory || memory >= m.minMemoryGB)
    .sort((a, b) => a.sizeBytes - b.sizeBytes)[0] || null;
}

export async function sha256Blob(blob) {
  if (!(blob instanceof Blob)) throw new Error("MODEL_BLOB_REQUIRED");
  if (!globalThis.crypto?.subtle) throw new Error("WEBCRYPTO_REQUIRED");
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyModelBlob(blob, manifest) {
  const approved = getApprovedModel(manifest?.id);
  if (!approved) return { ok: false, code: "MODEL_NOT_APPROVED" };
  if (approved.version !== manifest.version || approved.sha256 !== String(manifest.sha256 || "").toLowerCase()) return { ok: false, code: "MODEL_MANIFEST_MISMATCH" };
  if (approved.sizeBytes && blob.size !== approved.sizeBytes) return { ok: false, code: "MODEL_SIZE_MISMATCH" };
  const actual = await sha256Blob(blob);
  if (actual !== approved.sha256) return { ok: false, code: "MODEL_HASH_MISMATCH", actual };
  return { ok: true, manifest: approved };
}

export function createModelExecutionPolicy(manifest) {
  const approved = getApprovedModel(manifest?.id);
  if (!approved) throw new Error("MODEL_NOT_APPROVED");
  return Object.freeze({
    modelId: approved.id,
    version: approved.version,
    network: "deny",
    arbitraryCode: "deny",
    filesystemEnumeration: "deny",
    privateBlobScope: "current-task-only",
    persistence: "user-controlled",
    integrityRequired: true,
  });
}
