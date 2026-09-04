import { NextResponse } from "next/server";
import { providerRouterProductionTruth, runZeroCostProviderRouterCanary } from "../../../../../lib/ai/provider-router-truth.js";

export const dynamic = "force-dynamic";

function headers() {
  return {
    "Cache-Control": "no-store, private, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const runCanary = url.searchParams.get("canary") === "1";
    const truthBefore = providerRouterProductionTruth();
    const runtimeCanary = runCanary ? await runZeroCostProviderRouterCanary() : null;
    const truthAfter = providerRouterProductionTruth();
    const launchModeLive = Boolean(
      runtimeCanary?.success &&
      runtimeCanary?.evidenceLevel === "PRODUCTION_ZERO_COST_ROUTER_CANARY" &&
      truthAfter.zeroCostLaunchMode &&
      truthAfter.exactReleaseIdentity
    );

    return NextResponse.json({
      success: true,
      service: "laneriq-provider-router",
      contract: "prtr1",
      releaseSha: truthAfter.releaseSha,
      releaseEnvironment: truthAfter.releaseEnvironment,
      exactReleaseIdentity: truthAfter.exactReleaseIdentity,
      costMode: truthAfter.costMode,
      zeroCostLaunchMode: truthAfter.zeroCostLaunchMode,
      externalSpendCap: truthAfter.externalSpendCap,
      configuredProviderCount: truthAfter.configuredProviderCount,
      configuredLocalProviderCount: truthAfter.configuredLocalProviderCount,
      configuredRemoteProviderCount: truthAfter.configuredRemoteProviderCount,
      coolingDownProviderCount: truthAfter.coolingDownProviderCount,
      quotaGuardedProviderCount: truthAfter.quotaGuardedProviderCount,
      runtimeRequestsBeforeCanary: truthBefore.runtimeRequests,
      runtimeRequests: truthAfter.runtimeRequests,
      runtimeSuccesses: truthAfter.runtimeSuccesses,
      runtimeFailovers: truthAfter.runtimeFailovers,
      proactiveQuotaSwitches: truthAfter.proactiveQuotaSwitches,
      blockedByCost: truthAfter.blockedByCost,
      codeCapabilities: truthAfter.codeCapabilities,
      providerIdentityInternalOnly: true,
      runtimeCanary,
      launchModeLive,
      externalProvidersLiveVerified: false,
      externalProviderEvidenceLevel: "EVIDENCE_REQUIRED",
      evidenceLevel: launchModeLive ? "PRODUCTION_ZERO_COST_ROUTER_CANARY" : "CODE_READY",
    }, { headers: headers() });
  } catch (error) {
    console.error("PROVIDER_ROUTER_STATUS_ERROR", error?.code || error?.name || "unknown");
    return NextResponse.json({
      success: false,
      service: "laneriq-provider-router",
      contract: "prtr1",
      launchModeLive: false,
      externalProvidersLiveVerified: false,
      externalProviderEvidenceLevel: "EVIDENCE_REQUIRED",
      evidenceLevel: "RUNTIME_CANARY_FAILED",
      error: "PROVIDER_ROUTER_STATUS_FAILED",
    }, { status: 503, headers: headers() });
  }
}
