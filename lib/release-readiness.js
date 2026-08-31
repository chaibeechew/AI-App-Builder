export const RELEASE_SCORE_REQUIRED = 100;
export const RELEASE_DIMENSIONS_REQUIRED = Object.freeze([
  "stability",
  "security",
  "privacy",
  "comfort",
  "beauty",
  "naturalness",
]);

export function evaluateReleaseReadiness(report) {
  const dimensions = Array.isArray(report?.dimensions) ? report.dimensions : [];
  const byId = Object.fromEntries(dimensions.map((item) => [item.id, Number(item.score || 0)]));
  const missing = RELEASE_DIMENSIONS_REQUIRED.filter((id) => !(id in byId));
  const belowTarget = RELEASE_DIMENSIONS_REQUIRED.filter((id) => Number(byId[id] || 0) < RELEASE_SCORE_REQUIRED);
  const overall = Number(report?.overall || 0);
  const releaseReady = missing.length === 0 && belowTarget.length === 0 && overall >= RELEASE_SCORE_REQUIRED;
  return {
    releaseReady,
    requiredScore: RELEASE_SCORE_REQUIRED,
    overall,
    dimensions: byId,
    missing,
    belowTarget,
  };
}

export const PRODUCTION_EVIDENCE_REQUIREMENTS = Object.freeze([
  "ci_exact_commit",
  "authentication_target_environment",
  "database_migration_and_rollback",
  "critical_workflow_failure_recovery",
  "payment_when_enabled",
  "external_integrations_when_configured",
  "iphone_android_responsive_check",
  "privacy_permission_disclosures",
  "customer_store_metadata_approval",
]);

export const PRODUCTION_EVIDENCE_LABELS = Object.freeze({
  ci_exact_commit: "CI build passes on the exact release commit",
  authentication_target_environment: "Authentication flows verified in the target environment",
  database_migration_and_rollback: "Database migrations and rollback path reviewed",
  critical_workflow_failure_recovery: "Critical workflows tested including failure recovery",
  payment_when_enabled: "Payment flows tested when enabled",
  external_integrations_when_configured: "External integrations tested when configured",
  iphone_android_responsive_check: "iPhone and Android responsive behavior checked before store release",
  privacy_permission_disclosures: "Privacy and permission disclosures reviewed",
  customer_store_metadata_approval: "Store metadata reviewed and approved by the customer",
});

export function evaluateProductionEvidence(evidence = {}) {
  const normalized = Object.fromEntries(
    PRODUCTION_EVIDENCE_REQUIREMENTS.map((key) => [key, evidence?.[key] === true || evidence?.[key] === "not_applicable"])
  );
  const missing = PRODUCTION_EVIDENCE_REQUIREMENTS.filter((key) => !normalized[key]);
  return {
    ready: missing.length === 0,
    evidence: normalized,
    missing,
    labels: PRODUCTION_EVIDENCE_LABELS,
  };
}

export const RELEASE_POLICY_NOTE =
  "A 100-point deterministic project score is a strict internal release gate, not a guarantee of zero bugs, absolute security, privacy or legal compliance, provider availability or store approval. Production promotion also requires environment-specific evidence.";
