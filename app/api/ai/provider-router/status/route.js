import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase/server.js";
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

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: headers() });
}

function publicStatusPayload(truth) {
  return {
    success: true,
    service: "laneriq-provider-router",
    contract: "prtr1",
    releaseSha: truth.releaseSha,
    releaseEnvironment: truth.releaseEnvironment,
    exactReleaseIdentity: truth.exactReleaseIdentity,
    costMode: truth.costMode,
    zeroCostLaunchMode: truth.zeroCostLaunchMode,
    externalSpendCap: truth.externalSpendCap,
    configuredProviderCount: truth.configuredProviderCount,
    configuredLocalProviderCount: truth.configuredLocalProviderCount,
    configuredRemoteProviderCount: truth.configuredRemoteProviderCount,
    coolingDownProviderCount: truth.coolingDownProviderCount,
    quotaGuardedProviderCount: truth.quotaGuardedProviderCount,
    runtimeRequests: truth.runtimeRequests,
    runtimeSuccesses: truth.runtimeSuccesses,
    runtimeFailovers: truth.runtimeFailovers,
    proactiveQuotaSwitches: truth.proactiveQuotaSwitches,
    blockedByCost: truth.blockedByCost,
    codeCapabilities: truth.codeCapabilities,
    providerIdentityInternalOnly: true,
    runtimeCanary: null,
    canaryExecutionMethod: "ADMIN_POST_ONLY",
    canaryRequiresAdmin: true,
    launchModeLive: false,
    externalProvidersLiveVerified: false,
    externalProviderEvidenceLevel: "EVIDENCE_REQUIRED",
    evidenceLevel: "CODE_READY",
  };
}

export async function GET() {
  try {
    return json(publicStatusPayload(providerRouterProductionTruth()));
  } catch (error) {
    console.error("PROVIDER_ROUTER_STATUS_ERROR", error?.code || error?.name || "unknown");
    return json({
      success: false,
      service: "laneriq-provider-router",
      contract: "prtr1",
      launchModeLive: false,
      externalProvidersLiveVerified: false,
      externalProviderEvidenceLevel: "EVIDENCE_REQUIRED",
      evidenceLevel: "STATUS_READ_FAILED",
      error: "PROVIDER_ROUTER_STATUS_FAILED",
    }, 503);
  }
}

export async function POST() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({
        success: false,
        service: "laneriq-provider-router",
        contract: "prtr1",
        error: "Authentication required.",
        code: "AUTHENTICATION_REQUIRED",
      }, 401);
    }

    const role = String(user.app_metadata?.role || "").trim().toLowerCase();
    if (role !== "admin") {
      return json({
        success: false,
        service: "laneriq-provider-router",
        contract: "prtr1",
        error: "Admin permission required.",
        code: "ADMIN_PERMISSION_REQUIRED",
      }, 403);
    }

    const truthBefore = providerRouterProductionTruth();
    if (!truthBefore.zeroCostLaunchMode) {
      return json({
        success: false,
        service: "laneriq-provider-router",
        contract: "prtr1",
        releaseSha: truthBefore.releaseSha,
        releaseEnvironment: truthBefore.releaseEnvironment,
        exactReleaseIdentity: truthBefore.exactReleaseIdentity,
        costMode: truthBefore.costMode,
        zeroCostLaunchMode: false,
        launchModeLive: false,
        externalProvidersLiveVerified: false,
        externalProviderEvidenceLevel: "EVIDENCE_REQUIRED",
        evidenceLevel: "CANARY_NOT_APPLICABLE",
        error: "Zero-cost Provider Router canary requires zero-cost launch mode.",
        code: "ZERO_COST_CANARY_REQUIRES_ZERO_MODE",
      }, 409);
    }

    const runtimeCanary = await runZeroCostProviderRouterCanary();
    const truthAfter = providerRouterProductionTruth();
    const launchModeLive = Boolean(
      runtimeCanary?.success &&
      runtimeCanary?.evidenceLevel === "PRODUCTION_ZERO_COST_ROUTER_CANARY" &&
      truthAfter.zeroCostLaunchMode &&
      truthAfter.exactReleaseIdentity
    );

    return json({
      ...publicStatusPayload(truthAfter),
      runtimeRequestsBeforeCanary: truthBefore.runtimeRequests,
      runtimeCanary,
      canaryExecutionMethod: "ADMIN_POST_ONLY",
      canaryRequiresAdmin: true,
      launchModeLive,
      evidenceLevel: launchModeLive ? "PRODUCTION_ZERO_COST_ROUTER_CANARY" : "RUNTIME_ZERO_COST_ROUTER_CANARY",
    });
  } catch (error) {
    console.error("PROVIDER_ROUTER_CANARY_ERROR", error?.code || error?.name || "unknown");
    return json({
      success: false,
      service: "laneriq-provider-router",
      contract: "prtr1",
      launchModeLive: false,
      externalProvidersLiveVerified: false,
      externalProviderEvidenceLevel: "EVIDENCE_REQUIRED",
      evidenceLevel: "RUNTIME_CANARY_FAILED",
      error: "PROVIDER_ROUTER_CANARY_FAILED",
    }, 503);
  }
}
