"use client";

import {
  OFFLINE_RUNTIME_SCHEMA_VERSION,
  assertExactOfflineScope,
  createOfflineMutation,
} from "./runtime-core.js";

const DB_NAME = "laneriq-offline-runtime-v1";
const DB_VERSION = 1;
const PROJECT_STORE = "project_snapshots";
const MUTATION_STORE = "mutation_journal";
const META_STORE = "runtime_meta";
const ACTIVE_SCOPE_KEY = "active-scope";
const encoder = new TextEncoder();

function browserCrypto() {
  if (!globalThis.crypto?.subtle) throw new Error("LANERIQ_OFFLINE_CRYPTO_UNAVAILABLE");
  return globalThis.crypto;
}

function toBase64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function userScopeKey(userId) {
  const normalized = String(userId || "").trim();
  if (!normalized) throw new Error("LANERIQ_OFFLINE_USER_REQUIRED");
  const digest = await browserCrypto().subtle.digest("SHA-256", encoder.encode(`laneriq-offline-user:${normalized}`));
  return `usr_${toBase64Url(new Uint8Array(digest))}`;
}

function requireIndexedDb() {
  if (typeof indexedDB === "undefined") throw new Error("LANERIQ_OFFLINE_INDEXEDDB_UNAVAILABLE");
  return indexedDB;
}

export function openOfflineDatabase() {
  return new Promise((resolve, reject) => {
    const request = requireIndexedDb().open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        const projects = db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
        projects.createIndex("by_scope", "scopeKey", { unique: false });
        projects.createIndex("by_scope_project", ["scopeKey", "projectId"], { unique: true });
      }
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        const mutations = db.createObjectStore(MUTATION_STORE, { keyPath: "id" });
        mutations.createIndex("by_scope", "scopeKey", { unique: false });
        mutations.createIndex("by_scope_state", ["scopeKey", "state"], { unique: false });
        mutations.createIndex("by_scope_project", ["scopeKey", "projectId"], { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("LANERIQ_OFFLINE_DB_OPEN_FAILED"));
    request.onblocked = () => reject(new Error("LANERIQ_OFFLINE_DB_BLOCKED"));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("LANERIQ_OFFLINE_DB_REQUEST_FAILED"));
  });
}

async function withStore(storeName, mode, work) {
  const db = await openOfflineDatabase();
  try {
    const transaction = db.transaction(storeName, mode);
    const completion = new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("LANERIQ_OFFLINE_DB_TRANSACTION_FAILED"));
      transaction.onabort = () => reject(transaction.error || new Error("LANERIQ_OFFLINE_DB_TRANSACTION_ABORTED"));
    });
    const store = transaction.objectStore(storeName);
    const result = await work(store);
    await completion;
    return result;
  } finally {
    db.close();
  }
}

export async function setActiveOfflineUser(userId) {
  const scopeKey = await userScopeKey(userId);
  await withStore(META_STORE, "readwrite", (store) => requestResult(store.put({
    key: ACTIVE_SCOPE_KEY,
    value: scopeKey,
    schemaVersion: OFFLINE_RUNTIME_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  })));
  return scopeKey;
}

export async function clearActiveOfflineUser() {
  try {
    await withStore(META_STORE, "readwrite", (store) => requestResult(store.delete(ACTIVE_SCOPE_KEY)));
  } catch {}
}

export async function getActiveOfflineScope() {
  try {
    const record = await withStore(META_STORE, "readonly", (store) => requestResult(store.get(ACTIVE_SCOPE_KEY)));
    const value = String(record?.value || "").trim();
    return value.startsWith("usr_") ? value : "";
  } catch {
    return "";
  }
}

function projectRecordId(scopeKey, projectId) {
  return `${scopeKey}::project:${String(projectId || "").trim()}`;
}

export async function saveLocalProjectSnapshot({ scopeKey, projectId, snapshot, baseVersionId = "local", privacyClass = "P3" } = {}) {
  if (!scopeKey || !projectId || !snapshot || typeof snapshot !== "object") throw new Error("LANERIQ_OFFLINE_PROJECT_SNAPSHOT_INVALID");
  const record = {
    id: projectRecordId(scopeKey, projectId),
    schemaVersion: OFFLINE_RUNTIME_SCHEMA_VERSION,
    scopeKey,
    projectId: String(projectId),
    baseVersionId: String(baseVersionId || "local"),
    privacyClass: String(privacyClass || "P3"),
    updatedAt: new Date().toISOString(),
    snapshot,
  };
  assertExactOfflineScope(record, scopeKey);
  await withStore(PROJECT_STORE, "readwrite", (store) => requestResult(store.put(record)));
  return record;
}

export async function getLocalProjectSnapshot({ scopeKey, projectId } = {}) {
  if (!scopeKey || !projectId) return null;
  const record = await withStore(PROJECT_STORE, "readonly", (store) => requestResult(store.get(projectRecordId(scopeKey, projectId))));
  if (!record) return null;
  assertExactOfflineScope(record, scopeKey);
  return record;
}

export async function listLocalProjectSnapshots(scopeKey) {
  if (!scopeKey) return [];
  const records = await withStore(PROJECT_STORE, "readonly", (store) => requestResult(store.index("by_scope").getAll(scopeKey)));
  return (records || []).filter((record) => {
    try { return assertExactOfflineScope(record, scopeKey); } catch { return false; }
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function enqueueOfflineMutation(input) {
  const mutation = createOfflineMutation(input);
  await withStore(MUTATION_STORE, "readwrite", async (store) => {
    const existing = await requestResult(store.get(mutation.id));
    if (existing) {
      if (JSON.stringify(existing.payload) !== JSON.stringify(mutation.payload) || existing.scopeKey !== mutation.scopeKey) {
        throw new Error("LANERIQ_OFFLINE_IDEMPOTENCY_CONFLICT");
      }
      return existing;
    }
    await requestResult(store.put(mutation));
    return mutation;
  });
  return mutation;
}

export async function listOfflineMutations({ scopeKey, state } = {}) {
  if (!scopeKey) return [];
  const normalizedState = state ? String(state).toUpperCase() : "";
  const records = normalizedState
    ? await withStore(MUTATION_STORE, "readonly", (store) => requestResult(store.index("by_scope_state").getAll([scopeKey, normalizedState])))
    : await withStore(MUTATION_STORE, "readonly", (store) => requestResult(store.index("by_scope").getAll(scopeKey)));
  return (records || []).filter((record) => {
    try { return assertExactOfflineScope(record, scopeKey); } catch { return false; }
  }).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export async function updateOfflineMutationState({ scopeKey, id, state } = {}) {
  if (!scopeKey || !id) throw new Error("LANERIQ_OFFLINE_MUTATION_ID_REQUIRED");
  const normalizedState = String(state || "").toUpperCase();
  if (!["PENDING_LOCAL", "READY_FOR_REVIEW", "APPLIED", "CONFLICT", "DISCARDED"].includes(normalizedState)) throw new Error("LANERIQ_OFFLINE_MUTATION_STATE_INVALID");
  return withStore(MUTATION_STORE, "readwrite", async (store) => {
    const record = await requestResult(store.get(id));
    if (!record) return null;
    assertExactOfflineScope(record, scopeKey);
    const next = { ...record, state: normalizedState, stateUpdatedAt: new Date().toISOString() };
    await requestResult(store.put(next));
    return next;
  });
}

export async function offlineStoreStatus(scopeKey) {
  if (!scopeKey) return { available: typeof indexedDB !== "undefined", projectCount: 0, pendingCount: 0, readyCount: 0 };
  const [projects, pending, ready] = await Promise.all([
    listLocalProjectSnapshots(scopeKey),
    listOfflineMutations({ scopeKey, state: "PENDING_LOCAL" }),
    listOfflineMutations({ scopeKey, state: "READY_FOR_REVIEW" }),
  ]);
  return { available: true, projectCount: projects.length, pendingCount: pending.length, readyCount: ready.length };
}
