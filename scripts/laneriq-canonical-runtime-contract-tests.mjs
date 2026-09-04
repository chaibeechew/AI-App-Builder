import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  LANERIQ_LEGACY_RUNTIME_ADAPTER_VERSION,
  laneriqCanonicalRuntimeStatus,
  laneriqSecurityCapability,
  publicLaneriqPlatformStatus,
  resolveLaneriqAccountContext,
  resolveLaneriqCapabilities,
} from "../lib/laneriq/legacy-runtime-adapter.js";

assert.equal(LANERIQ_LEGACY_RUNTIME_ADAPTER_VERSION, "1.0.0");
assert.ok(resolveLaneriqCapabilities({ tier: "free" }));

const anonymous = await resolveLaneriqAccountContext({ anonymousOnly: true });
assert.equal(anonymous.authenticated, false);
assert.equal(anonymous.subscription.tier, "free");

const platform = publicLaneriqPlatformStatus({ env: {} });
assert.equal(platform.service, "LANERIQ Platform Operator");
assert.equal(platform.authority, "laneriq");
assert.equal(platform.canonicalNamespace, "/api/laneriq");
assert.equal(platform.compatibility.legacyRuntimeRequired, false);

const runtime = laneriqCanonicalRuntimeStatus();
assert.equal(runtime.service, "LANERIQ Canonical Runtime");
assert.equal(runtime.authority, "laneriq");
assert.equal(runtime.canonicalApiNamespace, "/api/laneriq");
assert.equal(runtime.legacyCompatibilityAvailable, true);
assert.equal(runtime.legacyRuntimeRequired, false);
assert.equal(runtime.newLaneriqCodeMayImportLegacyModulesDirectly, false);

const security = laneriqSecurityCapability();
assert.equal(security.authority, "laneriq");
assert.equal(security.secureByDefault, true);
assert.equal(security.releaseFailClosed, true);

function filesUnder(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (entry.isFile() && /\.(js|mjs|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const canonicalRoutes = filesUnder("app/api/laneriq");
assert.ok(canonicalRoutes.length >= 3);
for (const file of canonicalRoutes) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /lib\/soolen\/|\.\.\/soolen\//, `${file} must not directly import legacy runtime modules`);
  assert.doesNotMatch(source, /lib\/supabase\/|@supabase\//, `${file} must not directly import the current database provider`);
  assert.doesNotMatch(source, /SOOLENAI_|SoolenAI Platform Operator/, `${file} must expose LANERIQ canonical naming`);
  assert.doesNotMatch(source, /SERVICE_ROLE|SECRET_KEY|API_KEY/, `${file} must not contain provider secrets`);
}

const canonicalLibFiles = filesUnder("lib/laneriq");
for (const file of canonicalLibFiles) {
  if (file === path.normalize("lib/laneriq/legacy-runtime-adapter.js")) continue;
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /\.\.\/soolen\/|\.\.\/supabase\//, `${file} must cross legacy/provider dependencies only through the adapter`);
}

const adapter = fs.readFileSync("lib/laneriq/legacy-runtime-adapter.js", "utf8");
assert.match(adapter, /resolveSoolenCapabilities/);
assert.match(adapter, /publicPlatformStatus/);
assert.match(adapter, /getSoolenSubscription/);
assert.match(adapter, /createClient/);
assert.match(adapter, /legacyRuntimeRequired:\s*false/);

for (const route of [
  "app/api/laneriq/capabilities/route.js",
  "app/api/laneriq/platform/route.js",
  "app/api/laneriq/runtime/status/route.js",
]) {
  assert.equal(fs.existsSync(route), true, `Canonical LANERIQ route missing: ${route}`);
}

for (const legacyRoute of [
  "app/api/soolenai/capabilities/route.js",
  "app/api/soolenai/platform/route.js",
]) {
  assert.equal(fs.existsSync(legacyRoute), true, `Compatibility route must remain during gradual migration: ${legacyRoute}`);
}

console.log("✓ LANERIQ canonical API namespace exists for capabilities, platform and runtime truth");
console.log("✓ New LANERIQ routes cannot directly import SoolenAI runtime modules or Supabase");
console.log("✓ Legacy dependencies are contained behind one explicit compatibility adapter");
console.log("✓ Legacy API routes remain available while LANERIQ becomes the authoritative runtime namespace");
