// Soolen Local Runtime Adapter
// Device-first execution boundary. Raw customer media stays in browser memory by default.

import { getApprovedModel, verifyModelBlob, createModelExecutionPolicy } from "./model-manager.js";
import { createChunkScheduler } from "./chunk-scheduler.js";

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
    loadedModels: new Map(),
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
  const approved = getApprovedModel(manifest.id);
  if (!approved) throw new SoolenLocalRuntimeError("MODEL_NOT_APPROVED");
  if (!manifest.sha256) throw new SoolenLocalRuntimeError("MODEL_HASH_REQUIRED");
  return approved;
}

export async function loadModel(session, manifest, modelBlob) {
  if (!session || session.cancelled) throw new SoolenLocalRuntimeError("LOCAL_SESSION_INACTIVE");
  assertApprovedModel(manifest);
  if (!(modelBlob instanceof Blob)) throw new SoolenLocalRuntimeError("MODEL_BLOB_REQUIRED");
  const verified = await verifyModelBlob(modelBlob, manifest);
  if (!verified.ok) throw new SoolenLocalRuntimeError(verified.code);
  const executionPolicy = createModelExecutionPolicy(manifest);
  session.loadedModels.set(manifest.id, { manifest: verified.manifest, blob: modelBlob, executionPolicy, loadedAt: new Date().toISOString() });
  return { ok: true, modelId: manifest.id, executionPolicy };
}

export function createLocalAutonomousScheduler(jobs = [], { concurrency = 1, maxRetries = 2 } = {}) {
  return createChunkScheduler(jobs, { concurrency, maxRetries });
}

export async function renderChunk(session, { modelId, chunk, executor } = {}) {
  if (!session || session.cancelled) throw new SoolenLocalRuntimeError("LOCAL_SESSION_INACTIVE");
  const loaded = session.loadedModels.get(modelId);
  if (!loaded) throw new SoolenLocalRuntimeError("MODEL_NOT_LOADED");
  if (typeof executor !== "function") throw new SoolenLocalRuntimeError("LOCAL_MODEL_EXECUTOR_NOT_CONNECTED", "A verified local model is loaded, but no approved WebGPU/CPU executor is connected yet.");
  return executor({ chunk, model: loaded.manifest, policy: loaded.executionPolicy, privateBlobs: session.blobs });
}

export async function mergeChunks(session, { chunks, merger } = {}) {
  if (!session || session.cancelled) throw new SoolenLocalRuntimeError("LOCAL_SESSION_INACTIVE");
  if (!Array.isArray(chunks) || chunks.length === 0) throw new SoolenLocalRuntimeError("CHUNKS_REQUIRED");
  if (typeof merger !== "function") throw new SoolenLocalRuntimeError("LOCAL_MERGE_RUNTIME_NOT_CONNECTED", "Local media merge runtime is not connected yet.");
  return merger(chunks);
}

export function cancelLocalRuntimeSession(session) {
  if (!session) return;
  session.cancelled = true;
  session.state = "cancelled";
  session.blobs?.clear?.();
  session.loadedModels?.clear?.();
}

export function disposeLocalRuntimeSession(session) {
  if (!session) return;
  session.blobs?.clear?.();
  session.loadedModels?.clear?.();
  session.state = "disposed";
}
