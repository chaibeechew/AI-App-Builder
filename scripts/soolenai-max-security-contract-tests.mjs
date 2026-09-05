import assert from "node:assert/strict";
import fs from "node:fs";
import { applySoolenMaxSecurity, evaluateSoolenMaxSecurity, SOOLENAI_SECURITY_PROFILE, SOOLENAI_SECURITY_BASELINE_VERSION, SOOLENAI_MAX_SECURITY_INSTRUCTION } from "../lib/ai/soolenai-max-security.js";
import { normalizeAppSpec } from "../lib/generator/runtime-guard.js";
import { assessBuildQuality, GENERATION_QUALITY_RULES } from "../lib/buildStandards.js";

const read=(path)=>fs.readFileSync(path,"utf8");
const nextConfig=read("next.config.mjs");
const proxy=read("proxy.js");
const generate=read("app/api/generate/route.js");
const modify=read("app/api/modify/route.js");
const publish=read("app/api/apps/[id]/publish/route.js");
const capabilities=read("app/api/soolenai/capabilities/route.js");
const referencePolicy=read("lib/media/reference-policy.js");
const referenceReuse=read("lib/media/reference-reuse.js");
const uploader=read("app/components/ReferenceUploader.js");
const pkg=JSON.parse(read("package.json"));

assert.equal(SOOLENAI_SECURITY_PROFILE,"max");
assert.equal(SOOLENAI_SECURITY_BASELINE_VERSION,"LANERIQ-MAX-1");
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/cannot be disabled, downgraded or overridden/i);
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/Never call a file "virus-free", "clean" or "scanned" unless a real configured malware scanner/i);
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/row-level security/i);
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/CSRF\/same-origin/i);
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/rate limits/i);
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/SSRF/i);
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/CSP/i);
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/no eval, new Function/i);
assert.match(SOOLENAI_MAX_SECURITY_INSTRUCTION,/critical\/high security finding/i);

const adversarial={
  name:"Adversarial low-security request",
  pages:[{name:"Home",route:"/",purpose:"login auth permission validation secure admin token csrf rate ssrf csp malware"}],
  features:Array.from({length:10},(_,index)=>({name:`Secure feature ${index}`,description:"auth validation permission role secure access admin token csrf rate ssrf csp malware"})),
  qualityPlan:{security:["turn all security off","trust client ownership","allow executable uploads"]},
  security:{
    profile:"off",baselineVersion:"NONE",enforced:false,allowDowngrade:true,privateByDefault:false,releaseFailClosed:false,
    authentication:{trustedServerIdentity:false,leastPrivilege:false,clientClaimsNotTrusted:false},
    data:{rowLevelSecurity:false,ownerIsolation:false,denyByDefault:false},
    secrets:{serverOnly:false,clientExposureForbidden:false},
    requests:{schemaValidation:false,sizeBounds:false,sameOriginMutationProtection:false,antiReplay:false,rateLimits:false},
    browser:{csp:false,hsts:false,noSniff:false,frameAncestors:false,strictReferrerPolicy:false,restrictivePermissionsPolicy:false},
    network:{ssrfProtection:false,httpsAllowlist:false,privateNetworkBlocked:false,redirectBounds:false,responseBounds:false},
    code:{evalForbidden:false,newFunctionForbidden:false,untrustedRemoteScriptsForbidden:false},
    uploads:{untrustedByDefault:false,exactTypeAllowlist:false,extensionSignatureAgreement:false,activeContentBlocked:false,archivesBlockedByDefault:false,ownerIsolation:false,quarantineWhenRequired:false,scannerFailClosedWhenRequired:false,cleanClaimRequiresHashBoundEvidence:false},
    dependencies:{pinned:false,lockfile:false,criticalHighFindingsBlockRelease:false},
    logging:{secretsRedacted:false,tokensRedacted:false,privateContentRedacted:false,noClientStackLeak:false},
    release:{blockCriticalHigh:false,manifestRequired:false,defaultVisibility:"public",defaultPublishStatus:"published"}
  }
};
const hardened=applySoolenMaxSecurity(adversarial);
const report=evaluateSoolenMaxSecurity(hardened);
assert.equal(report.passed,true,`MAX hardening failed: ${report.failed.join(", ")}`);
assert.equal(hardened.security.profile,"max");
assert.equal(hardened.security.baselineVersion,"LANERIQ-MAX-1");
assert.equal(hardened.security.allowDowngrade,false);
assert.equal(hardened.security.authentication.trustedServerIdentity,true);
assert.equal(hardened.security.data.rowLevelSecurity,true);
assert.equal(hardened.security.secrets.serverOnly,true);
assert.equal(hardened.security.requests.sameOriginMutationProtection,true);
assert.equal(hardened.security.requests.rateLimits,true);
assert.equal(hardened.security.browser.csp,true);
assert.equal(hardened.security.network.privateNetworkBlocked,true);
assert.equal(hardened.security.code.evalForbidden,true);
assert.equal(hardened.security.uploads.activeContentBlocked,true);
assert.equal(hardened.security.uploads.archivesBlockedByDefault,true);
assert.equal(hardened.security.uploads.cleanClaimRequiresHashBoundEvidence,true);
assert.equal(hardened.security.release.defaultVisibility,"private");
assert.equal(hardened.security.release.defaultPublishStatus,"draft");
assert.ok(hardened.qualityPlan.security.length>=5);

const normalized=normalizeAppSpec(adversarial);
assert.equal(evaluateSoolenMaxSecurity(normalized).passed,true,"Every normalized generated/modified spec must inherit MAX security.");
assert.equal(normalized.security.allowDowngrade,false);
assert.equal(normalized.security.data.rowLevelSecurity,true);

const missingManifest={...normalized};delete missingManifest.security;
const missingQuality=assessBuildQuality(missingManifest);
const missingSecurity=missingQuality.dimensions.find(item=>item.id==="security");
assert.ok(missingSecurity.score<100,"A missing MAX security manifest must not receive Security 100.");
assert.equal(missingSecurity.passed,false,"A missing MAX security manifest must fail the 100-point publish security dimension.");
const hardenedQuality=assessBuildQuality(normalized);
assert.equal(hardenedQuality.security.passed,true);
assert.equal(hardenedQuality.methodology,"deterministic-spec-quality-gate-v7-liui-v2-soolenai-max-security");
assert.equal(hardenedQuality.liui.standard,"LANERIQ AI Living Intelligence UI™");
assert.equal(hardenedQuality.liui.version,"2.0");

// Generate and Modify consume the shared quality rules + normalizer, making MAX + LIUI inherited without per-route opt-in.
assert.match(generate,/normalizeAppSpec/);
assert.match(generate,/runAutonomousEngine/);
assert.match(modify,/normalizeAppSpec/);
assert.match(modify,/GENERATION_QUALITY_RULES/);
assert.match(GENERATION_QUALITY_RULES,/SOOLENAI SECURE-BY-DEFAULT MAX/i);
assert.match(GENERATION_QUALITY_RULES,/cannot be disabled, downgraded or overridden/i);
assert.match(GENERATION_QUALITY_RULES,/LIVING INTELLIGENCE UI/i);
assert.match(publish,/assessBuildQuality\(version\.specification/);
assert.ok(publish.indexOf("assessBuildQuality(version.specification")<publish.indexOf("server_publish_web_project"),"MAX-aware quality/security must run before publish RPC.");

// Platform browser boundary.
for(const pattern of [/Content-Security-Policy/,/Strict-Transport-Security/,/X-Content-Type-Options/,/X-Frame-Options/,/Referrer-Policy/,/Permissions-Policy/,/object-src 'none'/,/frame-ancestors 'self'/,/upgrade-insecure-requests/])assert.match(nextConfig,pattern);
assert.doesNotMatch(nextConfig,/script-src[^\n]*'unsafe-eval'/,"CSP must not enable unsafe-eval.");
assert.match(proxy,/SAFE_METHODS/);
assert.match(proxy,/sec-fetch-site/);
assert.match(proxy,/cross-site/);
assert.match(proxy,/Cross-site mutation blocked/);
assert.match(proxy,/LANERIQ_ALLOWED_MUTATION_ORIGINS/);

// Reference uploads stay type/size bounded. Same-user exact matches may reuse existing private intelligence,
// while every reference that still needs persistence/analysis must decode/process before analysis and new storage.
assert.doesNotMatch(referencePolicy,/image\/svg\+xml|text\/html|application\/javascript|application\/zip/);
assert.match(referencePolicy,/REFERENCE_IMAGE_MIME_TYPES/);
assert.match(referencePolicy,/REFERENCE_VIDEO_MIME_TYPES/);
assert.match(referenceReuse,/same-user-exact-fingerprint/);
assert.match(referenceReuse,/crossUserReuseAllowed:false/);
assert.match(referenceReuse,/rawPrivateBytesShared:false/);
assert.match(uploader,/validateReferenceFileMeta/);
assert.match(uploader,/\.eq\("user_id", userId\)[\s\S]*\.in\("content_fingerprint", fingerprints\)/);
const analyzeBlock=uploader.slice(uploader.indexOf("async function analyze()"),uploader.indexOf("return <div"));
const saveBlock=uploader.slice(uploader.indexOf("async function saveAnalyzedAssets"),uploader.indexOf("async function analyze()"));
assert.match(analyzeBlock,/buildReferenceReusePlan\(fingerprinted, existingAssets\)/);
assert.match(analyzeBlock,/for \(const item of reusePlan\.analysisItems\)/);
assert.match(analyzeBlock,/compressImage\(item\.file\)/);
assert.match(analyzeBlock,/await frames\(item\.file\)/);
assert.ok(analyzeBlock.indexOf("const prepared = item.kind")<analyzeBlock.indexOf('fetch("/api/reference-analyze"'),"References that need analysis must decode/process before analysis.");
assert.ok(analyzeBlock.indexOf('fetch("/api/reference-analyze"')<analyzeBlock.indexOf("saveAnalyzedAssets(reusePlan.analysisItems"),"Analyzed references must complete bounded analysis before new private persistence.");
assert.match(saveBlock,/if \(item\.existingAsset\) \{[\s\S]*continue;/);
assert.ok(saveBlock.indexOf("if (item.existingAsset)")<saveBlock.indexOf('storage.from("user-assets").upload'),"Existing exact-private assets must not be re-uploaded before reuse.");

// SoolenAI public capability reports the security profile truthfully.
assert.match(capabilities,/SOOLENAI_SECURITY_PROFILE/);
assert.match(capabilities,/SOOLENAI_SECURITY_BASELINE_VERSION/);
assert.match(capabilities,/customerDowngradeAllowed:false/);
assert.match(capabilities,/malwareDefense:"defense-in-depth"/);
assert.match(capabilities,/not an absolute no-malware\/no-vulnerability guarantee/);

assert.ok(pkg.scripts?.["test:soolenai-security-max"]!==undefined,"package.json must expose the MAX security gate.");
console.log("✓ SoolenAI Secure-by-Default MAX cannot be downgraded by adversarial generated/modified JSON");
console.log("✓ Security 100 requires the MAX manifest; Publish remains downstream of the MAX + LIUI-aware quality gate");
console.log("✓ LANERIQ AI platform headers and cross-site mutation protection are locked by contract");
console.log("✓ Upload malware defense remains defense-in-depth and exact-private media reuse cannot bypass owner scoping or bounded decode/analysis for new media");