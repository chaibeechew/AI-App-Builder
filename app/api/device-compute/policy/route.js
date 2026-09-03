import { NextResponse } from "next/server";
import { publicDeviceComputePolicy } from "../../../../lib/device-compute/policy.js";
import { zeroCostPolicy } from "../../../../lib/soolen/cost-policy.js";

export async function GET() {
  const device = publicDeviceComputePolicy();
  const cost = zeroCostPolicy();
  return NextResponse.json({
    success: true,
    device,
    cost: {
      mode: cost.mode,
      deviceFirst: cost.deviceFirst,
      localProjectStorageFirst: cost.localProjectStorageFirst,
      deltaSyncPreferred: cost.deltaSyncPreferred,
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
