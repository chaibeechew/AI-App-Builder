export const LANERIQ_LEGACY_SURFACE_MANIFEST_VERSION = "1.0.0";

export const LANERIQ_LEGACY_API_ROOTS = Object.freeze([
  Object.freeze({
    root: "capabilities",
    legacyPath: "/api/soolenai/capabilities",
    canonicalReplacement: "/api/laneriq/capabilities",
    replacementState: "canonical-route-integration-pending",
  }),
  Object.freeze({
    root: "platform",
    legacyPath: "/api/soolenai/platform",
    canonicalReplacement: "/api/laneriq/platform",
    replacementState: "canonical-route-integration-pending",
  }),
  Object.freeze({
    root: "voice",
    legacyPath: "/api/soolenai/voice",
    canonicalReplacement: "/api/laneriq/voice",
    replacementState: "planned",
  }),
]);

export const LANERIQ_LEGACY_SURFACE_POLICY = Object.freeze({
  authority: "LANERIQ AI",
  migrationMode: "ratchet-only",
  maxLegacyApiRoots: LANERIQ_LEGACY_API_ROOTS.length,
  newLegacyApiRootAllowed: false,
  legacyRuntimeRequiredForNewFeatures: false,
  compatibilityMayShrinkWithoutReplacement: false,
  retirementRequires: Object.freeze([
    "canonical replacement available",
    "supported-client dependency inventory clear",
    "Production telemetry shows no required legacy traffic",
    "rollback plan verified",
    "Production exact-SHA evidence reconciled",
  ]),
  truthBoundary: "Compatibility retirement readiness does not imply the legacy route has already been removed from Production.",
});

export function legacySurfaceStatus() {
  return Object.freeze({
    version: LANERIQ_LEGACY_SURFACE_MANIFEST_VERSION,
    authority: LANERIQ_LEGACY_SURFACE_POLICY.authority,
    migrationMode: LANERIQ_LEGACY_SURFACE_POLICY.migrationMode,
    currentBudget: LANERIQ_LEGACY_SURFACE_POLICY.maxLegacyApiRoots,
    newLegacyApiRootAllowed: LANERIQ_LEGACY_SURFACE_POLICY.newLegacyApiRootAllowed,
    surfaces: LANERIQ_LEGACY_API_ROOTS.map((item) => ({ ...item })),
    retirementRequires: [...LANERIQ_LEGACY_SURFACE_POLICY.retirementRequires],
  });
}
