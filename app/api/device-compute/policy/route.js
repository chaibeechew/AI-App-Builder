import { NextResponse } from "next/server";
import { publicDeviceComputePolicy } from "../../../../lib/device-compute/policy.js";
import { publicBillionScaleFreeAiPolicy } from "../../../../lib/offline/billion-scale-free-ai.js";
import { zeroCostPolicy } from "../../../../lib/soolen/cost-policy.js";

export async function GET() {
  const device = publicDeviceComputePolicy();
  const freeAi = publicBillionScaleFreeAiPolicy();
  const cost = zeroCostPolicy();
  return NextResponse.json({
    success: true,
    device,
    freeAi,
    cost: {
      mode: cost.mode,
      deviceFirst: cost.deviceFirst,
      localFirst: cost.localFirst,
      offlineFirst: cost.offlineFirst,
      cloudOptionalWherePossible: cost.cloudOptionalWherePossible,
      privacyByDefault: cost.privacyByDefault,
      syncOnlyWhatIsNecessary: cost.syncOnlyWhatIsNecessary,
      localProjectStorageFirst: cost.localProjectStorageFirst,
      deltaSyncPreferred: cost.deltaSyncPreferred,
      ownDeviceMeshBeforeRemote: cost.ownDeviceMeshBeforeRemote,
      storeAndForwardOfflineJobs: cost.storeAndForwardOfflineJobs,
      freeModeManagedPaidFallbackAllowed: cost.freeModeManagedPaidFallbackAllowed,
      zeroModeManagedPaidFallbackAllowed: cost.zeroModeManagedPaidFallbackAllowed,
      privateTelemetryContentUploadDefault: cost.privateTelemetryContentUploadDefault,
      invisibleCostGovernor: cost.invisibleCostGovernor,
      userFacingCreditsRequired: cost.userFacingCreditsRequired,
      backgroundComputeDefault: cost.backgroundComputeDefault,
      ownDesktopFallbackPreferred: cost.ownDesktopFallbackPreferred,
      crossUserComputeAllowed: cost.crossUserComputeAllowed,
      thermalGuardianRequired: cost.thermalGuardianRequired,
      externalSpendCap: cost.externalSpendCap,
    },
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
