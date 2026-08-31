export const RELEASE_SCORE_REQUIRED = 99;
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
  "CI build passes on the exact release commit",
  "Authentication flows verified in the target environment",
  "Database migrations and rollback path reviewed",
  "Critical workflows tested including failure recovery",
  "Payment flows tested when enabled",
  "External integrations tested only when configured",
  "iPhone and Android responsive behavior checked before store release",
  "Privacy and permission disclosures reviewed",
  "Store metadata reviewed and approved by the customer",
]);

export const RELEASE_POLICY_NOTE =
  "A 99-point deterministic project score is a strict internal release gate, not a guarantee of zero bugs, security, privacy compliance, provider availability or store approval. Production promotion also requires environment-specific evidence.";
