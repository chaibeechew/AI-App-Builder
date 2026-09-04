import assert from "node:assert/strict";
import fs from "node:fs";

import {
  LANERIQ_INDEPENDENT_ROUTE_CONTRACT,
  LANERIQ_SERVICE_BOUNDARIES,
  independentRoutePolicy,
  publicIndependentRouteStatus,
  resolveIndependentService,
} from "../lib/platform/independent-route.js";

assert.equal(LANERIQ_INDEPENDENT_ROUTE_CONTRACT, "lir1");
assert.deepEqual(Object.keys(LANERIQ_SERVICE_BOUNDARIES), [
  "app",
  "cloudData",
  "malwareDefense",
  "creativeMedia",
  "providerRouter",
]);

const policy = independentRoutePolicy({});
assert.equal(policy.product, "LANERIQ AI");
assert.equal(policy.runtimeOwner, "LANERIQ AI");
assert.equal(policy.legacyCompatibility.soolenaiRuntimeRequired, false);
assert.equal(policy.legacyCompatibility.oldAiAppBuilderRuntimeRequired, false);
assert.equal(policy.infrastructure.serverIndependentNow, true);
assert.equal(policy.infrastructure.providerRouterRequiredForExternalAI, true);
assert.equal(policy.infrastructure.dedicatedLaneriqServerLive, false);
assert.equal(policy.infrastructure.migrateGradually, true);

for (const key of ["cloudData", "malwareDefense", "creativeMedia", "providerRouter"]) {
  assert.ok(LANERIQ_SERVICE_BOUNDARIES[key].endpointEnv.startsWith("LANERIQ_"));
  assert.equal(resolveIndependentService(key, {}).execution, "local-boundary");
}

assert.equal(
  resolveIndependentService("cloudData", { LANERIQ_CLOUD_DATA_URL: "https://cloud.laneriq.example" }).execution,
  "independent-remote",
);
assert.throws(
  () => resolveIndependentService("cloudData", { LANERIQ_CLOUD_DATA_URL: "https://soolenai.example" }),
  /LANERIQ_LEGACY_RUNTIME_TARGET_FORBIDDEN/,
);
assert.throws(
  () => resolveIndependentService("providerRouter", { LANERIQ_PROVIDER_ROUTER_URL: "https://ai-app-builder.example" }),
  /LANERIQ_LEGACY_RUNTIME_TARGET_FORBIDDEN/,
);
assert.throws(() => resolveIndependentService("unknown", {}), /LANERIQ_SERVICE_UNKNOWN/);

const status = publicIndependentRouteStatus({});
assert.equal(status.legacyRuntimeRequired, false);
assert.equal(status.serverIndependentNow, true);
assert.equal(status.dedicatedLaneriqServerLive, false);
assert.equal(status.services.app.service, "laneriq-ai");
assert.equal(status.services.cloudData.service, "laneriq-cloud-data");
assert.equal(status.services.malwareDefense.service, "laneriq-malware-defense");
assert.equal(status.services.creativeMedia.service, "laneriq-creative-media");
assert.equal(status.services.providerRouter.service, "laneriq-provider-router");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(packageJson.name, "laneriq-ai");
for (const dependencyName of Object.keys({ ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) })) {
  assert.doesNotMatch(dependencyName, /soolenai|ai-app-builder/i, `Legacy runtime dependency forbidden: ${dependencyName}`);
}

const routeSource = fs.readFileSync("app/api/platform/independent-route/status/route.js", "utf8");
assert.match(routeSource, /publicIndependentRouteStatus/);
assert.doesNotMatch(routeSource, /SUPABASE|VERCEL_TOKEN|API_KEY|SECRET|SERVICE_ROLE/);

const providerTruthSource = fs.readFileSync("lib/ai/provider-router-truth.js", "utf8");
assert.match(providerTruthSource, /laneriq-provider-router/);
const cloudBoundaryTest = fs.readFileSync("scripts/cloud-security-decoupling-contract-tests.mjs", "utf8");
assert.match(cloudBoundaryTest, /provider-opaque LANERIQ Cloud domains/);
assert.match(cloudBoundaryTest, /dedicatedLaneriqServerLive:\\s\*false/);

console.log("✓ LANERIQ AI independent-route contract is authoritative and legacy runtimes are optional compatibility only");
console.log("✓ Main App, Cloud/Data, Malware, Creative Media and Provider Router have explicit separable boundaries");
console.log("✓ External AI remains Provider-Router-first while dedicated LANERIQ servers remain truthfully NOT LIVE");
