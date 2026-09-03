import crypto from "node:crypto";
import { verifyReleaseEvidenceBundle } from "./release-evidence-bundle.js";

export const LANERIQ_PROMOTION_DECISION_LEDGER_VERSION = "2026-09-04.1";
export const PROMOTION_DECISION = Object.freeze({
  BLOCKED: "blocked",
  ELIGIBLE_FOR_PRODUCTION_REVIEW: "eligible_for_production_review",
  APPROVED_FOR_LIVE_EXECUTOR_REVIEW: "approved_for_live_executor_review",
});

const ALLOWED_DECISIONS = new Set(Object.values(PROMOTION_DECISION));

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
  if (!Number.isFinite(date.getTime())) throw new Error("LANERIQ_PROMOTION_LEDGER_TIMESTAMP_INVALID");
  return date.toISOString();
}

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_PROMOTION_LEDGER_${name}_REQUIRED`);
  return normalized;
}

export function createPromotionDecisionLedger() {
  return Object.freeze({
    schema: "laneriq.promotion-decision-ledger",
    version: LANERIQ_PROMOTION_DECISION_LEDGER_VERSION,
    records: Object.freeze([]),
    recordCount: 0,
    headDigest: null,
    appendOnly: true,
    providerCredentialsEmbedded: false,
  });
}

export function appendPromotionDecision({
  ledger,
  evidenceBundle,
  decision,
  manualApproval = false,
  actor = "laneriq-policy-engine",
  reason = null,
  recordedAt,
} = {}) {
  const ledgerVerification = verifyPromotionDecisionLedger(ledger);
  if (!ledgerVerification.verified) throw new Error("LANERIQ_PROMOTION_LEDGER_INVALID");
  const evidenceVerification = verifyReleaseEvidenceBundle(evidenceBundle);
  if (!evidenceVerification.verified) throw new Error("LANERIQ_PROMOTION_LEDGER_EVIDENCE_INVALID");
  const normalizedDecision = String(decision || "").trim().toLowerCase();
  if (!ALLOWED_DECISIONS.has(normalizedDecision)) throw new Error(`LANERIQ_PROMOTION_LEDGER_DECISION_INVALID:${normalizedDecision || "missing"}`);
  const evidenceReady = evidenceBundle.promotionGate?.evidenceReady === true;
  if (!evidenceReady && normalizedDecision !== PROMOTION_DECISION.BLOCKED) {
    throw new Error("LANERIQ_PROMOTION_LEDGER_CANNOT_APPROVE_INCOMPLETE_EVIDENCE");
  }
  if (normalizedDecision === PROMOTION_DECISION.APPROVED_FOR_LIVE_EXECUTOR_REVIEW && manualApproval !== true) {
    throw new Error("LANERIQ_PROMOTION_LEDGER_MANUAL_APPROVAL_REQUIRED");
  }

  const sequence = ledger.records.length + 1;
  const payload = Object.freeze({
    schema: "laneriq.promotion-decision-record",
    version: LANERIQ_PROMOTION_DECISION_LEDGER_VERSION,
    sequence,
    previousDigest: ledger.headDigest,
    evidenceDigest: evidenceBundle.evidenceDigest,
    sourceSha: evidenceBundle.sourceSha || null,
    bundleDigest: evidenceBundle.bundleDigest,
    deploymentId: evidenceBundle.preview?.deploymentId || null,
    decision: normalizedDecision,
    manualApprovalRecorded: manualApproval === true,
    actor: required(actor, "ACTOR"),
    reason: reason ? String(reason) : (evidenceReady ? "release_evidence_complete" : "release_evidence_incomplete"),
    recordedAt: iso(recordedAt),
    productionMutationAllowed: false,
    dnsMutationAllowed: false,
  });
  const record = Object.freeze({ ...payload, recordDigest: digest(payload) });
  const records = Object.freeze([...ledger.records, record]);
  return Object.freeze({
    schema: ledger.schema,
    version: ledger.version,
    records,
    recordCount: records.length,
    headDigest: record.recordDigest,
    appendOnly: true,
    providerCredentialsEmbedded: false,
  });
}

export function verifyPromotionDecisionLedger(ledger) {
  if (!ledger || ledger.schema !== "laneriq.promotion-decision-ledger" || !Array.isArray(ledger.records)) {
    return Object.freeze({ verified: false, reason: "ledger_invalid" });
  }
  let previousDigest = null;
  let verified = ledger.version === LANERIQ_PROMOTION_DECISION_LEDGER_VERSION;
  for (let index = 0; index < ledger.records.length; index += 1) {
    const record = ledger.records[index];
    const payload = {
      schema: record.schema,
      version: record.version,
      sequence: record.sequence,
      previousDigest: record.previousDigest,
      evidenceDigest: record.evidenceDigest,
      sourceSha: record.sourceSha || null,
      bundleDigest: record.bundleDigest,
      deploymentId: record.deploymentId || null,
      decision: record.decision,
      manualApprovalRecorded: record.manualApprovalRecorded === true,
      actor: record.actor,
      reason: record.reason,
      recordedAt: record.recordedAt,
      productionMutationAllowed: record.productionMutationAllowed === true,
      dnsMutationAllowed: record.dnsMutationAllowed === true,
    };
    const observed = digest(payload);
    verified = verified
      && record.schema === "laneriq.promotion-decision-record"
      && record.version === ledger.version
      && record.sequence === index + 1
      && record.previousDigest === previousDigest
      && observed === record.recordDigest
      && ALLOWED_DECISIONS.has(record.decision)
      && record.productionMutationAllowed === false
      && record.dnsMutationAllowed === false;
    previousDigest = record.recordDigest;
  }
  verified = verified
    && ledger.recordCount === ledger.records.length
    && ledger.headDigest === (ledger.records.length ? previousDigest : null)
    && ledger.appendOnly === true;
  return Object.freeze({ verified, recordCount: ledger.records.length, observedHeadDigest: previousDigest, expectedHeadDigest: ledger.headDigest });
}

export function publicPromotionDecisionLedgerPolicy() {
  return Object.freeze({
    version: LANERIQ_PROMOTION_DECISION_LEDGER_VERSION,
    appendOnlyHashChain: true,
    evidenceDigestBoundPerDecision: true,
    manualApprovalExplicitlyRecorded: true,
    incompleteEvidenceCannotBeApproved: true,
    productionMutationAllowed: false,
    dnsMutationAllowed: false,
    providerCredentialsAllowed: false,
    externalLedgerServiceRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
