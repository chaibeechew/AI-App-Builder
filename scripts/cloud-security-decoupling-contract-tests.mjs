import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  decryptPrivateTextEnvelope,
  encryptPrivateTextEnvelope,
  generateProjectKeyMaterial,
  importProjectDataKey,
  LANERIQ_PRIVATE_ENVELOPE_ALGORITHM,
  LANERIQ_PRIVATE_ENVELOPE_VERSION,
  publicEncryptionEnvelopePolicy,
} from "../lib/cloud/encryption-envelope.js";

const PROJECT_PROVIDER_IMPORT_BUDGET = 69;
const RUNTIME_EXTENSIONS = new Set([".js", ".mjs", ".ts", ".tsx"]);

function runtimeFiles(root) {
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...runtimeFiles(full));
    else if (entry.isFile() && RUNTIME_EXTENSIONS.has(path.extname(entry.name))) found.push(full);
  }
  return found;
}

const listRoute = fs.readFileSync("app/api/apps/route.js", "utf8");
const detailRoute = fs.readFileSync("app/api/apps/[id]/route.js", "utf8");
const previewRoute = fs.readFileSync("app/api/preview/route.js", "utf8");
const securityRoute = fs.readFileSync("app/api/security/route.js", "utf8");
const shareRoute = fs.readFileSync("app/api/share/route.js", "utf8");
const demoRoute = fs.readFileSync("app/api/demo/route.js", "utf8");
const generateRoute = fs.readFileSync("app/api/generate/route.js", "utf8");
const modifyRoute = fs.readFileSync("app/api/modify/route.js", "utf8");
const publishRoute = fs.readFileSync("app/api/publish/request/route.js", "utf8");
const storeSaveRoute = fs.readFileSync("app/api/store-metadata/save/route.js", "utf8");
const projectDomain = fs.readFileSync("lib/cloud/projects.js", "utf8");
const compatibilityAdapter = fs.readFileSync("lib/cloud-adapters/project-data.js", "utf8");
const creatorDomain = fs.readFileSync("lib/cloud/creator-operations.js", "utf8");
const creatorAdapter = fs.readFileSync("lib/cloud-adapters/creator-operations-data.js", "utf8");
const builderDomain = fs.readFileSync("lib/cloud/builder-projects.js", "utf8");
const builderAdapter = fs.readFileSync("lib/cloud-adapters/builder-project-data.js", "utf8");
const envelopeSource = fs.readFileSync("lib/cloud/encryption-envelope.js", "utf8");
const cloudPolicyRoute = fs.readFileSync("app/api/cloud/policy/route.js", "utf8");
const cloudPage = fs.readFileSync("app/account/cloud/page.js", "utf8");

// Core Project reads cross the LANERIQ Cloud boundary rather than importing a provider in route code.
for (const [name, source] of [["project list", listRoute], ["project detail", detailRoute]]) {
  assert.match(source, /lib\/cloud\/projects\.js/, `${name} route must use LANERIQ Cloud project domain`);
  assert.doesNotMatch(source, /lib\/supabase\/|@supabase\//, `${name} route must not directly import the current database provider`);
  assert.doesNotMatch(source, /SERVICE_ROLE|SECRET_KEY|API_KEY/, `${name} route must not contain provider secrets`);
}
assert.match(projectDomain, /cloud-adapters\/project-data\.js/);
assert.doesNotMatch(projectDomain, /lib\/supabase\/|@supabase\//, "Provider-opaque Project domain must not import the current provider directly");
assert.match(compatibilityAdapter, /\.\.\/supabase\/server\.js/, "Compatibility provider dependency belongs only behind the adapter boundary");
assert.doesNotMatch(compatibilityAdapter, /createAdminClient|SERVICE_ROLE|SECRET_KEY/, "Project reads must preserve user-scoped/RLS access rather than use an admin bypass client");
assert.match(compatibilityAdapter, /\.eq\("owner_id", principal\.principalId\)/, "Project ownership filter must remain explicit at the compatibility boundary");

// Preview / Security / Share / Demo creator lifecycle routes now cross the same Cloud boundary.
for (const [name, source] of [
  ["preview", previewRoute],
  ["security", securityRoute],
  ["share", shareRoute],
  ["demo", demoRoute],
]) {
  assert.match(source, /lib\/cloud\/creator-operations\.js/, `${name} route must use LANERIQ Cloud creator operations`);
  assert.doesNotMatch(source, /lib\/supabase\/|@supabase\//, `${name} route must not directly import the current provider`);
  assert.doesNotMatch(source, /SERVICE_ROLE|SECRET_KEY|API_KEY/, `${name} route must not contain provider secrets`);
}
assert.match(creatorDomain, /cloud-adapters\/creator-operations-data\.js/);
assert.doesNotMatch(creatorDomain, /lib\/supabase\/|@supabase\//, "Creator operations domain must remain provider opaque");
assert.match(creatorAdapter, /\.\.\/supabase\/server\.js/, "Creator provider dependency belongs only behind the adapter boundary");
assert.match(creatorAdapter, /auth\.getUser\(\)/, "Creator adapter must server-validate current identity");
assert.match(creatorAdapter, /\.eq\("owner_id", principal\.principal\.principalId\)/, "Creator ownership filter must remain explicit at the adapter boundary");
assert.match(creatorAdapter, /version_id:\s*project\.current_version_id/, "Share must pin the current owned version");
assert.match(creatorAdapter, /create_app_demo/, "Demo RPC coupling must be isolated to the adapter");
assert.doesNotMatch(creatorAdapter, /createAdminClient|SERVICE_ROLE|SECRET_KEY/, "Creator operations must remain user/RLS scoped");

// Generate / Modify / Publish / Store metadata writes now cross a provider-opaque Builder Project boundary.
for (const [name, source] of [
  ["generate", generateRoute],
  ["modify", modifyRoute],
  ["publish request", publishRoute],
  ["store metadata save", storeSaveRoute],
]) {
  assert.match(source, /lib\/cloud\/builder-projects\.js/, `${name} route must use LANERIQ Cloud Builder Project domain`);
  assert.doesNotMatch(source, /lib\/supabase\/|@supabase\//, `${name} route must not directly import the current provider`);
  assert.doesNotMatch(source, /SERVICE_ROLE|SECRET_KEY|API_KEY/, `${name} route must not contain provider secrets`);
}
assert.match(builderDomain, /cloud-adapters\/builder-project-data\.js/);
assert.doesNotMatch(builderDomain, /lib\/supabase\/|@supabase\//, "Builder Project domain must remain provider opaque");
assert.match(builderAdapter, /\.\.\/supabase\/server\.js/, "User-scoped provider dependency belongs only behind Builder adapter boundary");
assert.match(builderAdapter, /\.\.\/supabase\/admin\.js/, "Privileged persistence dependency belongs only behind Builder adapter boundary");
assert.match(builderAdapter, /auth\.getUser\(\)/, "Builder adapter must validate server identity before user-scoped or privileged work");
assert.match(builderAdapter, /server_persist_generated_project/, "Generated-project atomic persistence must stay inside the adapter");
assert.match(builderAdapter, /server_save_app_modification/, "Atomic modification persistence must stay inside the adapter");
assert.match(builderAdapter, /server_create_store_publish_request/, "Store publish request RPC must stay inside the adapter");
assert.match(builderAdapter, /\.eq\("owner_id", userId\)/, "Builder adapter must preserve explicit owner isolation");
assert.match(builderAdapter, /project\.current_version_id !== expectedVersionId/, "Modification must fail closed on version races before privileged save");
assert.match(builderAdapter, /project\.current_version_id !== versionId/, "Store metadata save must pin the exact current owned version");

// Ratchet: legacy route coupling may shrink but must never grow again.
const directProviderRoutes = runtimeFiles("app").filter((file) => fs.readFileSync(file, "utf8").includes("lib/supabase/server.js"));
assert.ok(
  directProviderRoutes.length <= PROJECT_PROVIDER_IMPORT_BUDGET,
  `Direct provider route budget regressed: ${directProviderRoutes.length} > ${PROJECT_PROVIDER_IMPORT_BUDGET}`,
);
for (const route of [
  "app/api/apps/route.js",
  "app/api/apps/[id]/route.js",
  "app/api/preview/route.js",
  "app/api/security/route.js",
  "app/api/share/route.js",
  "app/api/demo/route.js",
  "app/api/generate/route.js",
  "app/api/modify/route.js",
  "app/api/publish/request/route.js",
  "app/api/store-metadata/save/route.js",
]) assert.ok(!directProviderRoutes.includes(path.normalize(route)), `${route} must stay outside the direct-provider budget`);

// Versioned authenticated encryption envelope: AES-256-GCM, random 96-bit nonce and context-bound AAD.
const rawKey = generateProjectKeyMaterial();
assert.equal(rawKey.byteLength, 32);
const key = await importProjectDataKey(rawKey);
assert.equal(key.extractable, false, "Imported private-data keys must be non-extractable");
const context = { tenantId: "tenant-test", projectId: "project-test", purpose: "private-sync" };
const envelope = await encryptPrivateTextEnvelope({ plaintext: "private LANERIQ project data", key, keyId: "project-key-v1", context });
assert.equal(envelope.version, LANERIQ_PRIVATE_ENVELOPE_VERSION);
assert.equal(envelope.algorithm, LANERIQ_PRIVATE_ENVELOPE_ALGORITHM);
assert.equal(Object.hasOwn(envelope, "key"), false);
assert.equal(Object.hasOwn(envelope, "rawKey"), false);
assert.equal(await decryptPrivateTextEnvelope({ envelope, key, context }), "private LANERIQ project data");
await assert.rejects(
  () => decryptPrivateTextEnvelope({ envelope, key, context: { ...context, projectId: "another-project" } }),
  /./,
  "Moving ciphertext to another project context must fail authentication",
);
const tampered = { ...envelope, ciphertext: `${envelope.ciphertext[0] === "A" ? "B" : "A"}${envelope.ciphertext.slice(1)}` };
await assert.rejects(
  () => decryptPrivateTextEnvelope({ envelope: tampered, key, context }),
  /./,
  "Ciphertext tampering must fail authentication",
);
await assert.rejects(() => importProjectDataKey(new Uint8Array(31)), /KEY_LENGTH_INVALID/);

const envelopePolicy = publicEncryptionEnvelopePolicy();
assert.equal(envelopePolicy.authenticatedEncryption, true);
assert.equal(envelopePolicy.aadBindsTenantProjectPurposeAndKeyId, true);
assert.equal(envelopePolicy.keyMaterialStoredInEnvelope, false);
assert.equal(envelopePolicy.keyExtractableAfterImport, false);
assert.equal(envelopePolicy.nativeKeyCustodyLive, false);
assert.equal(envelopePolicy.encryptedSyncFullyLive, false);
assert.doesNotMatch(envelopeSource, /localStorage|sessionStorage|SERVICE_ROLE|SUPABASE|VERCEL|OPENAI_API_KEY/);

// Public status stays truthful: migration/envelope CODE is visible, full migration/E2EE/native custody/server remain not LIVE.
assert.match(cloudPolicyRoute, /projectReadAdapterMigrated:\s*true/);
assert.match(cloudPolicyRoute, /creatorLifecycleAdapterMigrated:\s*true/);
assert.match(cloudPolicyRoute, /builderGenerateModifyPublishAdapterMigrated:\s*true/);
assert.match(cloudPolicyRoute, /generatedProjectPersistenceAdapterMigrated:\s*true/);
assert.match(cloudPolicyRoute, /legacyDirectProviderRouteBudget:\s*69/);
assert.match(cloudPolicyRoute, /clientSideEncryptionEnvelopeInCode:\s*true/);
assert.match(cloudPolicyRoute, /providerAdaptersFullyMigrated:\s*false/);
assert.match(cloudPolicyRoute, /clientSideEncryptionFullyLive:\s*false/);
assert.match(cloudPolicyRoute, /zeroKnowledgeNativeKeyCustodyLive:\s*false/);
assert.match(cloudPolicyRoute, /dedicatedLaneriqServerLive:\s*false/);
assert.doesNotMatch(cloudPolicyRoute, /SUPABASE|VERCEL|SERVICE_ROLE|API_KEY/);
for (const pattern of [/Project read routes migrated behind adapter/, /Creator lifecycle routes migrated behind adapter/, /Private encryption envelope in code/, /clientSideEncryptionFullyLive/, /zeroKnowledgeNativeKeyCustodyLive/]) {
  assert.match(cloudPage, pattern);
}

console.log("✓ Project reads, creator lifecycle and Builder Generate/Modify/Publish routes use provider-opaque LANERIQ Cloud domains");
console.log("✓ Builder adapter keeps user identity/owner/version checks outside privileged service-role persistence RPCs");
console.log(`✓ Direct provider route coupling is ratcheted at <= ${PROJECT_PROVIDER_IMPORT_BUDGET} and cannot grow silently`);
console.log("✓ LANERIQ private envelope uses non-extractable AES-256-GCM keys, authenticated context and tamper detection");
console.log("✓ Encryption envelope is CODE foundation only; encrypted sync/native zero-knowledge custody remain truthfully NOT LIVE");
