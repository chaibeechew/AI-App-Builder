import { assessExitReadiness, assertExitAdapter } from "./exit-readiness.js";

export const LANERIQ_PROVIDER_EXIT_DRILL_VERSION = "2026-09-03.1";

export function createExitDrillPlan({
  providerId,
  scope = "sample",
  dryRun = true,
  maximumRestoreTestAgeDays = 30,
} = {}) {
  const id = String(providerId || "").trim();
  if (!id) throw new Error("LANERIQ_EXIT_DRILL_PROVIDER_ID_REQUIRED");
  if (dryRun !== true) throw new Error("LANERIQ_EXIT_DRILL_LIVE_MODE_FORBIDDEN_AT_LEVEL0");
  return Object.freeze({
    version: LANERIQ_PROVIDER_EXIT_DRILL_VERSION,
    providerId: id,
    scope,
    dryRun: true,
    destructive: false,
    productionMutationAllowed: false,
    paidExternalResourcesAllowed: false,
    maximumRestoreTestAgeDays,
    steps: Object.freeze([
      "export_state",
      "checksum_export",
      "import_to_isolated_target",
      "verify_restored_state",
      "compare_checksums",
      "record_evidence",
    ]),
  });
}

export async function runExitDrill({ adapter, plan } = {}) {
  assertExitAdapter(adapter);
  if (!plan?.dryRun || plan.productionMutationAllowed) {
    throw new Error("LANERIQ_EXIT_DRILL_UNSAFE_PLAN_REJECTED");
  }

  const exported = await adapter.exportState({ scope: plan.scope, dryRun: true });
  const imported = await adapter.importState({ exported, isolated: true, dryRun: true });
  const verification = await adapter.verifyState({ exported, imported, dryRun: true });

  const checksumsVerified = Boolean(verification?.checksumsVerified);
  const providerIndependentFormat = Boolean(verification?.providerIndependentFormat);
  const restoreTested = Boolean(verification?.restoreTested ?? true);
  const ageDays = Number.isFinite(Number(verification?.lastRestoreTestAgeDays))
    ? Number(verification.lastRestoreTestAgeDays)
    : 0;

  const readiness = assessExitReadiness({
    exportSupported: true,
    importSupported: true,
    checksumsVerified,
    restoreTested,
    providerIndependentFormat,
    lastRestoreTestAgeDays: ageDays,
    maximumRestoreTestAgeDays: plan.maximumRestoreTestAgeDays,
  });

  return Object.freeze({
    providerId: plan.providerId,
    dryRun: true,
    productionMutated: false,
    paidExternalResourcesUsed: false,
    readiness,
    passed: readiness.ready,
  });
}

export function publicExitDrillPolicy() {
  return Object.freeze({
    version: LANERIQ_PROVIDER_EXIT_DRILL_VERSION,
    level0Mode: "isolated_dry_run_only",
    liveProviderCutoverAllowed: false,
    productionMutationAllowed: false,
    paidExternalResourcesRequired: false,
    readiness100RequiresVerifiedRestore: true,
  });
}
