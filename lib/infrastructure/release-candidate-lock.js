import crypto from "node:crypto";
import { verifyReleaseEvidenceBundle } from "./release-evidence-bundle.js";
import {
  PROMOTION_DECISION,
  verifyPromotionDecisionLedger,
} from "./promotion-decision-ledger.js";

export const LANERIQ_RELEASE_CANDIDATE_LOCK_VERSION = "2026-09-04.1";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, canonical(nested)]));
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`;
}

function iso(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("LANERIQ_RELEASE_CANDIDATE_LOCK_TIMESTAMP_INVALID");
  return date.toISOString();
}

function latestDecisionRecord(ledger) {
  return Array.isArray(ledger?.records) && ledger.records.length ? ledger.records[ledger.records.length - 1] : null;
}

function decisionEligible(record) {
  return record?.decision === PROMOTION_DECISION.ELIGIBLE_FOR_PRODUCTION_REVIEW
    || record?.decision === PROMOTION_DECISION.APPROVED_FOR_LIVE_EXECUTOR_REVIEW;
}

export function createReleaseCandidateLock({
  evidenceBundle,
  decisionLedger,
  lockedAt,
} = {}) {
  const evidenceVerification = verifyReleaseEvidenceBundle(evidenceBundle);
  if (!evidenceVerification.verified) throw new Error("LANERIQ_RELEASE_CANDIDATE_LOCK_EVIDENCE_INVALID");
  if (evidenceBundle.promotionGate?.evidenceReady !== true) throw new Error("LANERIQ_RELEASE_CANDIDATE_LOCK_EVIDENCE_NOT_READY");

  const ledgerVerification = verifyPromotionDecisionLedger(decisionLedger);
  if (!ledgerVerification.verified) throw new Error("LANERIQ_RELEASE_CANDIDATE_LOCK_LEDGER_INVALID");
  const decision = latestDecisionRecord(decisionLedger);
  if (!decision) throw new Error("LANERIQ_RELEASE_CANDIDATE_LOCK_DECISION_REQUIRED");
  if (decision.evidenceDigest !== evidenceBundle.evidenceDigest) throw new Error("LANERIQ_RELEASE_CANDIDATE_LOCK_DECISION_EVIDENCE_MISMATCH");
  if (!decisionEligible(decision)) throw new Error(`LANERIQ_RELEASE_CANDIDATE_LOCK_DECISION_NOT_ELIGIBLE:${decision.decision}`);

  const payload = Object.freeze({
    schema: "laneriq.release-candidate-lock",
    version: LANERIQ_RELEASE_CANDIDATE_LOCK_VERSION,
    projectId: evidenceBundle.projectId,
    versionId: evidenceBundle.versionId,
    sourceSha: evidenceBundle.sourceSha || null,
    bundleDigest: evidenceBundle.bundleDigest,
    materializationReceiptDigest: evidenceBundle.materializationReceiptDigest,
    deploymentReceiptDigest: evidenceBundle.deploymentReceiptDigest,
    evidenceDigest: evidenceBundle.evidenceDigest,
    decisionRecordDigest: decision.recordDigest,
    decision: decision.decision,
    deploymentId: evidenceBundle.preview?.deploymentId || null,
    artifactId: evidenceBundle.artifactId,
    artifactDigest: evidenceBundle.artifactDigest,
    lockedAt: iso(lockedAt),
  });

  return Object.freeze({
    ...payload,
    candidateDigest: digest(payload),
    immutableCandidate: true,
    evidenceDriftAllowed: false,
    artifactSubstitutionAllowed: false,
    deploymentSubstitutionAllowed: false,
    productionMutationAllowed: false,
    dnsMutationAllowed: false,
    separateLiveExecutorRequired: true,
    providerCredentialsEmbedded: false,
  });
}

export function verifyReleaseCandidateLock(lock, {
  evidenceBundle = null,
  decisionLedger = null,
} = {}) {
  if (!lock || lock.schema !== "laneriq.release-candidate-lock") return Object.freeze({ verified: false, reason: "lock_invalid" });
  const payload = {
    schema: lock.schema,
    version: lock.version,
    projectId: lock.projectId,
    versionId: lock.versionId,
    sourceSha: lock.sourceSha || null,
    bundleDigest: lock.bundleDigest,
    materializationReceiptDigest: lock.materializationReceiptDigest,
    deploymentReceiptDigest: lock.deploymentReceiptDigest,
    evidenceDigest: lock.evidenceDigest,
    decisionRecordDigest: lock.decisionRecordDigest,
    decision: lock.decision,
    deploymentId: lock.deploymentId || null,
    artifactId: lock.artifactId,
    artifactDigest: lock.artifactDigest,
    lockedAt: lock.lockedAt,
  };
  const observedCandidateDigest = digest(payload);
  const checks = {
    candidateDigest: observedCandidateDigest === lock.candidateDigest,
    supportedVersion: lock.version === LANERIQ_RELEASE_CANDIDATE_LOCK_VERSION,
    immutableCandidate: lock.immutableCandidate === true,
    evidenceDriftBlocked: lock.evidenceDriftAllowed === false,
    artifactSubstitutionBlocked: lock.artifactSubstitutionAllowed === false,
    deploymentSubstitutionBlocked: lock.deploymentSubstitutionAllowed === false,
    productionMutationBlocked: lock.productionMutationAllowed === false,
    dnsMutationBlocked: lock.dnsMutationAllowed === false,
    liveExecutorSeparated: lock.separateLiveExecutorRequired === true,
  };

  if (evidenceBundle) {
    const evidenceVerification = verifyReleaseEvidenceBundle(evidenceBundle);
    checks.evidence = evidenceVerification.verified === true
      && evidenceBundle.evidenceDigest === lock.evidenceDigest
      && (evidenceBundle.sourceSha || null) === (lock.sourceSha || null)
      && evidenceBundle.bundleDigest === lock.bundleDigest
      && evidenceBundle.materializationReceiptDigest === lock.materializationReceiptDigest
      && evidenceBundle.deploymentReceiptDigest === lock.deploymentReceiptDigest
      && evidenceBundle.artifactId === lock.artifactId
      && evidenceBundle.artifactDigest === lock.artifactDigest
      && (evidenceBundle.preview?.deploymentId || null) === lock.deploymentId;
  }

  if (decisionLedger) {
    const ledgerVerification = verifyPromotionDecisionLedger(decisionLedger);
    const decision = latestDecisionRecord(decisionLedger);
    checks.decisionLedger = ledgerVerification.verified === true
      && Boolean(decision)
      && decision.recordDigest === lock.decisionRecordDigest
      && decision.evidenceDigest === lock.evidenceDigest
      && decision.decision === lock.decision
      && decisionEligible(decision);
  }

  return Object.freeze({
    verified: Object.values(checks).every(Boolean),
    checks: Object.freeze(checks),
    expectedCandidateDigest: lock.candidateDigest,
    observedCandidateDigest,
  });
}

export function publicReleaseCandidateLockPolicy() {
  return Object.freeze({
    version: LANERIQ_RELEASE_CANDIDATE_LOCK_VERSION,
    protectsAgainstTimeOfCheckTimeOfUseDrift: true,
    bindsExactEvidenceDigest: true,
    bindsExactDecisionRecord: true,
    bindsExactArtifactAndDeployment: true,
    artifactSubstitutionAllowed: false,
    deploymentSubstitutionAllowed: false,
    evidenceDriftAllowed: false,
    productionMutationAllowed: false,
    dnsMutationAllowed: false,
    separateLiveExecutorRequired: true,
    externalLockServiceRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
