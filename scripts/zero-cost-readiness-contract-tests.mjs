import assert from "node:assert/strict";
import fs from "node:fs";

import {
  assertZeroCostProvider,
  filterProvidersByCost,
  getSoolenCostMode,
  zeroCostPolicy,
  zeroCostProviders,
} from "../lib/soolen/cost-policy.js";
import { resolveSoolenCapabilities } from "../lib/soolen/capability-registry.js";
import { assertCloudAdapter, publicCloudContract } from "../lib/cloud/contracts.js";
import { resolveCloudResourceRoute } from "../lib/cloud/resource-router.js";
import {
  assertCloudTransferAllowed,
  DATA_CLASS,
  publicCloudSecurityPolicy,
} from "../lib/cloud/security-policy.js";
import { evaluateDedicatedServerGate, publicServerEconomicsPolicy } from "../lib/cloud/server-economics.js";

const capabilityRoute=fs.readFileSync("app/api/soolenai/capabilities/route.js","utf8");
const cloudPolicyRoute=fs.readFileSync("app/api/cloud/policy/route.js","utf8");
const cloudPage=fs.readFileSync("app/account/cloud/page.js","utf8");
const accountNav=fs.readFileSync("app/components/AccountNav.js","utf8");
const cloudDoc=fs.readFileSync("docs/LANERIQ-CLOUD-ZERO-TRUST-SEPARATION.md","utf8");
const cloudDomainFiles=[
  "lib/cloud/contracts.js",
  "lib/cloud/security-policy.js",
  "lib/cloud/resource-router.js",
  "lib/cloud/server-economics.js",
  "app/api/cloud/policy/route.js",
  "app/account/cloud/page.js",
];
const hostileZeroEnv = {
  SOOLEN_COST_MODE: "zero",
  SOOLEN_ZERO_COST_PROVIDERS: "mystery-cloud,openai,gemini,ollama,soolen-local,ollama",
  OPENAI_API_KEY: "configured-but-must-not-run",
  GEMINI_API_KEY: "configured-but-must-not-run",
  SOOLEN_IMAGE_PROVIDER_URL: "https://paid.example.test/image",
  SOOLEN_VIDEO_PROVIDER_URL: "https://paid.example.test/video",
  SOOLEN_WEB_SEARCH_URL: "https://paid.example.test/search",
};

assert.equal(getSoolenCostMode(hostileZeroEnv), "zero");
assert.deepEqual(
  zeroCostProviders(hostileZeroEnv),
  ["ollama", "soolen-local"],
  "Zero-cost provider configuration must be an explicit allowlist, not an unknown-provider pass-through.",
);
assert.deepEqual(
  filterProvidersByCost(["mystery-cloud", "openai", "gemini", "ollama", "soolen-local"], hostileZeroEnv),
  ["ollama", "soolen-local"],
  "Unknown and metered cloud providers must be removed in zero-cost mode.",
);
assert.throws(
  () => assertZeroCostProvider("mystery-cloud", hostileZeroEnv),
  /SOOLEN_ZERO_COST_POLICY_BLOCKED_METERED_PROVIDER/,
  "An unknown provider must fail closed in zero-cost mode.",
);
assert.throws(
  () => assertZeroCostProvider("openai", hostileZeroEnv),
  /SOOLEN_ZERO_COST_POLICY_BLOCKED_METERED_PROVIDER/,
  "A known metered provider must fail closed in zero-cost mode.",
);
assert.doesNotThrow(() => assertZeroCostProvider("ollama", hostileZeroEnv));
assert.doesNotThrow(() => assertZeroCostProvider("soolen-local", hostileZeroEnv));

const zeroPolicy = zeroCostPolicy(hostileZeroEnv);
assert.equal(zeroPolicy.mode, "zero");
assert.equal(zeroPolicy.meteredProvidersAllowed, false);
assert.equal(zeroPolicy.freeTierCloudAllowed, false);
assert.equal(zeroPolicy.cloudVideoAllowed, false);
assert.equal(zeroPolicy.externalSpendCap, 0);
assert.equal(zeroPolicy.deviceFirst, true);
assert.equal(zeroPolicy.browserVoiceFirst, true);
assert.equal(zeroPolicy.programmaticImagesFirst, true);
assert.deepEqual(zeroPolicy.allowedProviders, ["ollama", "soolen-local"]);

const freeCapabilities = resolveSoolenCapabilities({ tier: "free", env: hostileZeroEnv });
assert.equal(freeCapabilities.providers.costMode, "zero");
assert.equal(freeCapabilities.providers.count, 3, "Configured metered providers may exist but must remain outside the zero-cost route.");
assert.deepEqual(
  freeCapabilities.providers.text,
  ["soolen-local"],
  "Only configured and zero-cost-approved providers may be selected; an allowed but unconfigured Ollama endpoint must not be advertised as ready.",
);
assert.equal(freeCapabilities.providers.premiumRouting, false);
assert.equal(freeCapabilities.policy.failClosed, true);
assert.equal(freeCapabilities.policy.externalSpendCap, 0);

for (const id of [
  "multilingual-chat",
  "app-website-builder",
  "coding-agent",
  "visual-understanding",
  "local-image-creation",
  "browser-voice",
  "video-storyboard",
  "project-memory",
]) {
  const capability = freeCapabilities.capabilities.find((item) => item.id === id);
  assert.ok(capability, `Missing free capability ${id}`);
  assert.equal(capability.entitled, true, `${id} must remain available to the free tier`);
  assert.equal(capability.status, "ready", `${id} must have a zero-cost ready path`);
}

for (const id of [
  "advanced-reasoning",
  "premium-image-studio",
  "cloud-transcription",
  "premium-neural-voice",
  "premium-video-studio",
  "live-web-research",
]) {
  const capability = freeCapabilities.capabilities.find((item) => item.id === id);
  assert.ok(capability, `Missing professional capability ${id}`);
  assert.equal(capability.entitled, false, `${id} must not masquerade as a free capability`);
  assert.equal(capability.status, "professional_access_required", `${id} must fail closed before Professional access`);
}

const proCapabilities = resolveSoolenCapabilities({ tier: "pro", env: hostileZeroEnv });
for (const id of ["premium-image-studio", "premium-video-studio", "live-web-research"]) {
  const capability = proCapabilities.capabilities.find((item) => item.id === id);
  assert.ok(capability, `Missing pro capability ${id}`);
  assert.equal(capability.entitled, true);
  assert.notEqual(capability.status, "ready", `${id} must not claim live paid-cloud readiness while zero-cost mode blocks it`);
}

// Public creator-runtime readiness reports safe booleans only and never promotes CODE/provider-ready state into LIVE evidence.
for(const pattern of [
  /function creatorRuntimeReadiness\(\)/,
  /avatar:\{externalProviderConnected:/,
  /durablePrivateCapture:true/,
  /idempotentReplay:true/,
  /video:\{externalRendererConnected:/,
  /durablePrivateMp4Required:true/,
  /idempotentRendererSubmission:true/,
  /gameRuntime:\{localPlayableRuntime:/,
  /generatedProductionProjectVerified:false/,
  /realDeviceEvidenceVerified:false/,
  /multiplayer:\{externalProviderConnected:/,
  /replaySafeMatchmaking:true/,
  /authoritativeRuntimeReady:true/,
  /liveProviderEvidenceVerified:false/,
  /providerNamesHidden:true/,
])assert.match(capabilityRoute,pattern);
assert.doesNotMatch(capabilityRoute,/IMAGE_GENERATION_ENDPOINT|VIDEO_RENDER_ENDPOINT|MULTIPLAYER_MATCHMAKING_ENDPOINT|PROVIDER_TOKEN|API_KEY|SERVICE_ROLE/);

// LANERIQ Cloud is an embedded module today but must be separable later.
const cloudContract=publicCloudContract();
assert.equal(cloudContract.architecture,"embedded-module-separable-service");
assert.equal(cloudContract.providerOpaque,true);
assert.equal(cloudContract.directProviderSdkImportsAllowedInCloudDomain,false);
assert.deepEqual(cloudContract.capabilities,["identity","database","storage","realtime","functions","deployment","backup","ai"]);
assert.throws(()=>assertCloudAdapter("database",{query(){}}),/LANERIQ_CLOUD_ADAPTER_METHOD_REQUIRED:database:mutate/);
assert.doesNotThrow(()=>assertCloudAdapter("database",{query(){},mutate(){}}));

const cloudSecurity=publicCloudSecurityPolicy();
assert.equal(cloudSecurity.defaultDeny,true);
assert.equal(cloudSecurity.privateDataEncryptBeforeCloud,true);
assert.equal(cloudSecurity.secretDataBrowserPlaintextAllowed,false);
assert.equal(cloudSecurity.serviceRoleClientExposureAllowed,false);
assert.equal(cloudSecurity.zeroKnowledgeMode.liveEvidenceVerified,false,"Zero-knowledge must not be called LIVE before native key-custody evidence exists.");
assert.throws(()=>assertCloudTransferAllowed({dataClass:DATA_CLASS.PRIVATE,executionContext:"browser",clientSideEncrypted:false,target:"shared_cloud"}),/LANERIQ_CLOUD_PRIVATE_DATA_MUST_BE_ENCRYPTED_BEFORE_SYNC/);
assert.doesNotThrow(()=>assertCloudTransferAllowed({dataClass:DATA_CLASS.PRIVATE,executionContext:"browser",clientSideEncrypted:true,target:"shared_cloud"}));
assert.throws(()=>assertCloudTransferAllowed({dataClass:DATA_CLASS.SECRET,executionContext:"browser",target:"secret_vault"}),/LANERIQ_CLOUD_SECRET_BROWSER_BLOCKED/);

const localRoute=resolveCloudResourceRoute({capability:"database",dataClass:DATA_CLASS.NORMAL,requiresCloud:false});
assert.equal(localRoute.target,"local_device");
assert.equal(localRoute.reason,"local_first");
const encryptedCloudRoute=resolveCloudResourceRoute({capability:"database",dataClass:DATA_CLASS.PRIVATE,requiresCloud:true,clientSideEncrypted:true,zeroCostMode:true,availableAdapters:["shared-free","shared-default"]});
assert.equal(encryptedCloudRoute.target,"shared_cloud");
assert.equal(encryptedCloudRoute.adapter,"shared-free");
const secretRoute=resolveCloudResourceRoute({capability:"storage",dataClass:DATA_CLASS.SECRET,requiresCloud:true,availableAdapters:["vault"]});
assert.equal(secretRoute.target,"secret_vault");
assert.equal(secretRoute.adapter,"vault");

const notReadyServer=evaluateDedicatedServerGate({providerMonthlyCost:5000,dedicatedComputeCost:1000,bandwidthCost:200,backupCost:100,observabilityCost:100,operationsCost:500});
assert.equal(notReadyServer.economicallyBetter,true);
assert.equal(notReadyServer.operationallyReady,false);
assert.equal(notReadyServer.migrate,false,"Lower hardware cost alone must never trigger migration without operational readiness.");
const readyServer=evaluateDedicatedServerGate({providerMonthlyCost:5000,dedicatedComputeCost:1000,bandwidthCost:200,backupCost:100,observabilityCost:100,operationsCost:500,redundancyReady:true,backupReady:true,restoreTested:true,securityReady:true,observabilityReady:true});
assert.equal(readyServer.migrate,true);
assert.equal(readyServer.userCountThresholdRequired,false);
assert.equal(publicServerEconomicsPolicy().migrationStrategy,"workload-by-workload");

// New Cloud domain must stay provider-opaque. Legacy provider imports outside this domain are migration debt, not a pattern for new code.
for(const path of cloudDomainFiles){
  const source=fs.readFileSync(path,"utf8");
  assert.doesNotMatch(source,/@supabase\/|lib\/supabase\/|@vercel\/|from\s+["'][^"']*vercel/i,`${path} must not directly depend on a provider SDK`);
  assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|VERCEL_TOKEN|OPENAI_API_KEY|API_KEY\s*=/,`${path} must not contain server/provider secrets`);
}
for(const pattern of [/LANERIQ Cloud/,/Truthful implementation status/,/providerAdaptersFullyMigrated/,/clientSideEncryptionFullyLive/,/zeroKnowledgeNativeKeyCustodyLive/,/dedicatedLaneriqServerLive/])assert.match(cloudPage,pattern);
assert.match(accountNav,/\/account\/cloud/);
assert.match(cloudPolicyRoute,/providerAdaptersFullyMigrated:\s*false/);
assert.match(cloudPolicyRoute,/clientSideEncryptionFullyLive:\s*false/);
assert.match(cloudPolicyRoute,/zeroKnowledgeNativeKeyCustodyLive:\s*false/);
assert.match(cloudPolicyRoute,/dedicatedLaneriqServerLive:\s*false/);
assert.doesNotMatch(cloudPolicyRoute,/SUPABASE|VERCEL|SERVICE_ROLE|API_KEY/);
assert.match(cloudDoc,/embedded separable module/i);
assert.match(cloudDoc,/user count alone does not trigger/i);
assert.match(cloudDoc,/must not claim.*LIVE/i);

console.log("✓ Zero-cost mode now uses an explicit provider allowlist and rejects unknown/metered providers");
console.log("✓ Only configured zero-cost providers are selected; allowed but unconfigured local providers are not falsely advertised as ready");
console.log("✓ Free LANERIQ AI App/Website, local image, browser voice, storyboard and memory paths remain ready at zero external spend");
console.log("✓ Paid cloud image/video/web capabilities remain fail-closed and cannot be promoted to ready by stray provider URLs in zero-cost mode");
console.log("✓ Avatar, Video, Game Runtime and Multiplayer readiness stay provider-opaque and explicitly separate provider-ready CODE from real LIVE evidence");
console.log("✓ LANERIQ Cloud now has a provider-opaque contract boundary that can be extracted later without moving the Builder");
console.log("✓ Private shared-cloud sync fails closed without client-side encryption; browser plaintext secrets are blocked and vault-only");
console.log("✓ Dedicated LANERIQ infrastructure is governed by TCO plus redundancy/backup/security/observability readiness, not user count alone");
console.log("✓ LANERIQ Cloud UI/API truthfully distinguish code policy from provider migration, E2EE, zero-knowledge and dedicated-server LIVE evidence");
