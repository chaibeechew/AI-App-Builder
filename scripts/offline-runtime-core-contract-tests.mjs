import assert from "node:assert/strict";
import fs from "node:fs";

import {
  OFFLINE_RUNTIME_CORE_VERSION,
  OFFLINE_RUNTIME_SCHEMA_VERSION,
  assessOfflineMutationReview,
  assertExactOfflineScope,
  classifyBrowserConnectivity,
  createOfflineMutation,
  publicOfflineRuntimePolicy,
} from "../lib/offline/runtime-core.js";

assert.equal(classifyBrowserConnectivity({ online: false }), "offline");
assert.equal(classifyBrowserConnectivity({ online: false, localPeerAvailable: true }), "local_network_only");
assert.equal(classifyBrowserConnectivity({ online: true, saveData: true }), "online_limited");
assert.equal(classifyBrowserConnectivity({ online: true, effectiveType: "2g" }), "online_limited");
assert.equal(classifyBrowserConnectivity({ online: true, meteredHint: true }), "online_expensive");
assert.equal(classifyBrowserConnectivity({ online: true, effectiveType: "4g" }), "online_fast");

const privateMutation = createOfflineMutation({
  idempotencyKey: "offline-op-001",
  scopeKey: "usr_scope-a",
  projectId: "11111111-1111-4111-8111-111111111111",
  type: "AI_MODIFY",
  payload: { appId: "11111111-1111-4111-8111-111111111111", instruction: "make spacing cleaner" },
  privacyClass: "P3",
  baseVersionId: "version-4",
  createdAt: "2026-09-05T02:20:00.000Z",
});
assert.equal(privateMutation.schemaVersion, OFFLINE_RUNTIME_SCHEMA_VERSION);
assert.equal(privateMutation.autoReplayAllowed, false);
assertExactOfflineScope(privateMutation, "usr_scope-a");
assert.throws(() => assertExactOfflineScope(privateMutation, "usr_scope-b"), /SCOPE_MISMATCH/);
assert.throws(() => createOfflineMutation({ ...privateMutation, idempotencyKey: "bad/op", type: "AI_MODIFY" }), /IDEMPOTENCY_KEY_INVALID/);
assert.throws(() => createOfflineMutation({ ...privateMutation, type: "ARBITRARY_CODE" }), /MUTATION_TYPE_INVALID/);

const offlineReview = assessOfflineMutationReview(privateMutation, { connectivityState: "offline" });
assert.equal(offlineReview.readyForReview, false);
assert.equal(offlineReview.autoReplayAllowed, false);
const onlineReview = assessOfflineMutationReview(privateMutation, { connectivityState: "online_fast" });
assert.equal(onlineReview.readyForReview, true);
assert.equal(onlineReview.autoReplayAllowed, false, "Private AI tasks must never auto-send just because connectivity returned.");
assert.equal(onlineReview.sync.route, "LOCAL_ONLY");

const p4Mutation = createOfflineMutation({
  idempotencyKey: "offline-op-002",
  scopeKey: "usr_scope-a",
  projectId: "11111111-1111-4111-8111-111111111111",
  type: "PROJECT_DRAFT",
  payload: { local: true },
  privacyClass: "P4",
});
const p4Review = assessOfflineMutationReview(p4Mutation, { connectivityState: "online_fast", privateSyncOptIn: true, encrypted: true, deltaAvailable: true });
assert.equal(p4Review.readyForReview, false);
assert.equal(p4Review.sync.route, "BLOCK");

const encryptedDelta = createOfflineMutation({
  idempotencyKey: "offline-op-003",
  scopeKey: "usr_scope-a",
  projectId: "11111111-1111-4111-8111-111111111111",
  type: "PRIVATE_SYNC_DELTA",
  payload: { ciphertextEnvelopeId: "env-1" },
  privacyClass: "P3",
});
const deltaReview = assessOfflineMutationReview(encryptedDelta, { connectivityState: "online_fast", privateSyncOptIn: true, encrypted: true, deltaAvailable: true });
assert.equal(deltaReview.readyForReview, true);
assert.equal(deltaReview.autoReplayAllowed, true);
assert.equal(deltaReview.sync.route, "ENCRYPTED_DELTA");

const policy = publicOfflineRuntimePolicy();
assert.equal(policy.version, OFFLINE_RUNTIME_CORE_VERSION);
assert.equal(policy.indexedDbLocalProjectStore, true);
assert.equal(policy.serviceWorkerSafeShell, true);
assert.equal(policy.apiRequestsCachedByServiceWorker, false);
assert.equal(policy.exactUserProjectScopeRequired, true);
assert.equal(policy.rawUserIdPersistedByOfflineRuntime, false);
assert.equal(policy.privateMutationAutoReplayAllowed, false);
assert.equal(policy.p4AutoSyncAllowed, false);
assert.equal(policy.nativeOfflineModelRuntimeLive, false);
assert.equal(policy.sameUserLanMeshLive, false);
assert.equal(policy.browserOfflineRuntimeEvidenceLevel, "CODE_READY");

const storeSource = fs.readFileSync("lib/offline/browser-store.js", "utf8");
assert.match(storeSource, /indexedDB/);
assert.match(storeSource, /SHA-256/);
assert.match(storeSource, /laneriq-offline-user:/);
assert.match(storeSource, /createIndex\("by_scope"/);
assert.match(storeSource, /assertExactOfflineScope/);
assert.match(storeSource, /LANERIQ_OFFLINE_IDEMPOTENCY_CONFLICT/);
assert.doesNotMatch(storeSource, /localStorage|sessionStorage/);

const swSource = fs.readFileSync("public/laneriq-sw.js", "utf8");
assert.match(swSource, /SAFE_SHELL_PATHS/);
assert.match(swSource, /SAFE_DYNAMIC_SHELL/);
const apiBranch = swSource.match(/if \(url\.pathname\.startsWith\("\/api\/"\)[\s\S]*?return;\n  \}/)?.[0] || "";
assert.match(apiBranch, /event\.respondWith\(fetch\(request\)\)/);
assert.doesNotMatch(apiBranch, /caches\.|cache\.put|cache\.match/, "Private API branch must be network-only and must never touch Cache Storage.");
assert.match(swSource, /cacheShellDocument/);

const bootstrapSource = fs.readFileSync("app/components/OfflineRuntimeBootstrap.js", "utf8");
assert.match(bootstrapSource, /serviceWorker\.register\("\/laneriq-sw\.js"/);
assert.match(bootstrapSource, /supabase\.auth\.getUser/);
assert.match(bootstrapSource, /setActiveOfflineUser\(user\.id\)/);
assert.match(bootstrapSource, /parsed\.pathname === "\/api\/modify"/);
assert.match(bootstrapSource, /!navigator\.onLine/);
assert.match(bootstrapSource, /enqueueOfflineMutation/);
assert.match(bootstrapSource, /READY_FOR_REVIEW/);
assert.match(bootstrapSource, /nothing private was sent automatically/i);
assert.doesNotMatch(bootstrapSource, /setInterval\(/, "Offline runtime must not poll in the background.");

const offlinePageSource = fs.readFileSync("app/offline/page.js", "utf8");
assert.match(offlinePageSource, /Working Offline/);
assert.match(offlinePageSource, /getActiveOfflineScope/);
assert.match(offlinePageSource, /listLocalProjectSnapshots/);
assert.match(offlinePageSource, /review before sending/i);
assert.match(offlinePageSource, /does not persist your raw user ID/i);

const layoutSource = fs.readFileSync("app/layout.js", "utf8");
assert.match(layoutSource, /OfflineRuntimeBootstrap/);
assert.match(layoutSource, /<OfflineRuntimeBootstrap \/>/);

console.log("✓ LANERIQ Offline Runtime Core classifies weak/offline connectivity without pretending internet exists");
console.log("✓ Local project storage is IndexedDB-backed, pseudonymous-user scoped and exact-project isolated");
console.log("✓ Private AI jobs store-and-forward locally and require review instead of auto-uploading on reconnect");
console.log("✓ Service Worker caches only safe shell/static assets and never caches private API responses");
console.log("✓ P4 automatic sync remains blocked; only explicit encrypted P3 delta can be replay-eligible");
console.log("✓ Browser offline runtime remains CODE_READY and does not claim native offline LLM or LAN mesh LIVE");
