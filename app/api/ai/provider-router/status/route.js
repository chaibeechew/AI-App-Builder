import { NextResponse } from "next/server";
import { resolveLaneriqAdminRequest } from "../../../../../lib/auth/admin-authority.js";
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
    localSuccessesObservedInInstance: truth.localSuccessesObservedInInstance,
    remoteSuccessesObservedInInstance: truth.remoteSuccessesObservedInInstance,
    computeFabricTelemetry: truth.computeFabricTelemetry,
    zeroCostAdmission: truth.zeroCostAdmission,
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

function authErrorPayload(code, error) {
  return {
    success: false,
    service: "laneriq-provider-router",
    contract: "prtr1",
    error,
    code,
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

export async function POST(request) {
  try {
    const access = await resolveLaneriqAdminRequest(request);
    if (!access.ok) return json(authErrorPayload(access.code, access.error), access.status);

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
      canarySessionAuthority: access.sessionAuthority,
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
