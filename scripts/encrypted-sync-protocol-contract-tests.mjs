import assert from "node:assert/strict";
import {
  generateProjectKeyMaterial,
  importProjectDataKey,
  encryptPrivateTextEnvelope,
  decryptPrivateTextEnvelope,
} from "../lib/cloud/encryption-envelope.js";
import {
  LANERIQ_ENCRYPTED_SYNC_PROTOCOL_VERSION,
  createEncryptedSyncMutation,
  validateEncryptedSyncMutation,
  assessEncryptedSyncApply,
  publicEncryptedSyncProtocolPolicy,
} from "../lib/cloud/encrypted-sync-protocol.js";

const context={tenantId:"tenant-a",projectId:"project-42",purpose:"private-sync"};
const key=await importProjectDataKey(generateProjectKeyMaterial());
const envelope=await encryptPrivateTextEnvelope({plaintext:"private customer project payload",key,keyId:"device-key-1",context});
const mutation=await createEncryptedSyncMutation({
  envelope,
  context,
  operationId:"sync-op-001",
  deviceId:"iphone-001",
  revision:1,
  previousRevision:0,
  createdAt:"2026-09-03T15:00:00.000Z",
});

assert.equal(mutation.protocolVersion,LANERIQ_ENCRYPTED_SYNC_PROTOCOL_VERSION);
assert.equal(await validateEncryptedSyncMutation(mutation,{expectedContext:context}),true);
assert.equal(await decryptPrivateTextEnvelope({envelope:mutation.envelope,key,context}),"private customer project payload");
assert.equal(JSON.stringify(mutation).includes("private customer project payload"),false,"Sync transport must never contain plaintext.");
for(const forbidden of ["rawKey","plaintext","password","secret"]) assert.equal(Object.hasOwn(mutation.envelope,forbidden),false);

const firstApply=assessEncryptedSyncApply(mutation,{currentRevision:0,seenOperationIds:[]});
assert.deepEqual(firstApply,{accepted:true,replayed:false,conflict:false,nextRevision:1});
const replay=assessEncryptedSyncApply(mutation,{currentRevision:1,seenOperationIds:["sync-op-001"]});
assert.deepEqual(replay,{accepted:true,replayed:true,conflict:false,nextRevision:1});
const stale=assessEncryptedSyncApply({...mutation,operationId:"sync-op-002"},{currentRevision:3,seenOperationIds:[]});
assert.deepEqual(stale,{accepted:false,replayed:false,conflict:true,nextRevision:3});

await assert.rejects(
  validateEncryptedSyncMutation({...mutation,context:{...context,projectId:"project-other"}},{expectedContext:context}),
  /CONTEXT_MISMATCH|CONTEXT_HASH_MISMATCH/,
);
await assert.rejects(
  validateEncryptedSyncMutation({...mutation,envelope:{...mutation.envelope,ciphertext:`${mutation.envelope.ciphertext}A`}}),
  /CIPHERTEXT_HASH_MISMATCH/,
);
await assert.rejects(
  createEncryptedSyncMutation({...mutation,envelope:{...mutation.envelope,plaintext:"forbidden"},context,operationId:"sync-op-003",deviceId:"iphone-001",revision:2,previousRevision:1}),
  /SECRET_FIELD_FORBIDDEN/,
);
await assert.rejects(
  createEncryptedSyncMutation({envelope,context,operationId:"sync-op-004",deviceId:"iphone-001",revision:3,previousRevision:1}),
  /REVISION_SEQUENCE_INVALID/,
);

const policy=publicEncryptedSyncProtocolPolicy();
assert.equal(policy.ciphertextOnlyTransport,true);
assert.equal(policy.contextBound,true);
assert.equal(policy.replayAware,true);
assert.equal(policy.optimisticConcurrency,true);
assert.equal(policy.serverReceivesRawProjectKey,false);
assert.equal(policy.nativeSecureKeyCustodyLive,false);
assert.equal(policy.crossDeviceKeyExchangeLive,false);
assert.equal(policy.encryptedSyncProductionLive,false);

console.log("✓ LANERIQ encrypted sync protocol transports ciphertext only and binds tenant/project/purpose context");
console.log("✓ Sync mutations are bounded, tamper-evident, replay-aware and optimistic-concurrency safe");
console.log("✓ Raw project keys/plaintext never enter the sync record; server-side key custody remains forbidden");
console.log("✓ Protocol CODE readiness does not claim native secure-key custody, cross-device key exchange or Production encrypted sync LIVE");
