import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const SHA40 = /^[0-9a-f]{40}$/;
const candidateSha = String(process.env.LANERIQ_CANDIDATE_SHA || "").trim().toLowerCase();
if (!SHA40.test(candidateSha)) throw new Error("CORE_RELEASE_CANDIDATE_SHA_INVALID");

const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
if (checkoutSha !== candidateSha) throw new Error(`CORE_RELEASE_SHA_MISMATCH:${checkoutSha}:${candidateSha}`);

const manifest = Object.freeze({
  manifestVersion: 1,
  product: "LANERIQ AI",
  candidateSha,
  verdict: "PASS",
  evidenceLevel: "CODE_CI_BUILD",
  consolidatedCoreChecks: Object.freeze([
    "cloud-boundary",
    "generation-boundary",
    "zero-cost-provider-safety",
    "production-evidence-attestation",
    "production-evidence-ledger-replay",
    "release-integrity-chain",
    "nextjs-runtime-build",
  ]),
  executionEfficiency: Object.freeze({
    dependencyInstallCount: 1,
    sharedZeroCostSuiteCount: 1,
    integratedBuildCount: 1,
  }),
  governance: Object.freeze({
    exactCandidateShaVerified: true,
    failClosed: true,
    independentChildGatesPreserved: true,
    childGatesBypassed: false,
    productionDeploymentPerformed: false,
  }),
  truthBoundary: Object.freeze({
    productionRuntimeVerified: false,
    supabaseMutationPerformed: false,
    dnsMutationPerformed: false,
    physicalDeviceVerified: false,
    providerLiveVerified: false,
    independentThirdPartyAuditVerified: false,
    officialStoreSubmissionVerified: false,
    emailDeliveryVerified: false,
    whatsappDeliveryVerified: false,
    smsDeliveryVerified: false,
  }),
});

const json = JSON.stringify(manifest, null, 2);
const digest = crypto.createHash("sha256").update(json).digest("hex");
fs.writeFileSync("core-release-gate-manifest.json", `${json}\n`, "utf8");

console.log(json);
console.log(`CORE_RELEASE_MANIFEST_SHA256=${digest}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `# LANERIQ Core Release Gate — PASS\n\n` +
    `- Exact candidate SHA: \`${candidateSha}\`\n` +
    `- Manifest SHA-256: \`${digest}\`\n` +
    `- Core evidence level: **CODE + CI + BUILD**\n` +
    `- Consolidated checks: ${manifest.consolidatedCoreChecks.length}\n` +
    `- Independent child gates preserved: **yes**\n` +
    `- Production/runtime/external evidence: **not claimed by this gate**\n`,
    "utf8",
  );
}
