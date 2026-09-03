import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { resolveSoolenCapabilities } from "../../../../lib/soolen/capability-registry.js";
import { publicPlatformStatus } from "../../../../lib/soolen/platform-operator.js";
import { getSoolenSubscription } from "../../../../lib/soolen/user-tier.js";
import { getImageGenerationConfig } from "../../../../lib/ai/image-generation-gateway.js";
import { getVideoRendererConfig } from "../../../../lib/video/render-gateway.js";
import { getMultiplayerProviderConfig } from "../../../../lib/game/multiplayer-provider-gateway.js";
import { GAME_RUNTIME_V1 } from "../../../../lib/game/runtime-v1.js";
import { SOOLENAI_SECURITY_PROFILE, SOOLENAI_SECURITY_BASELINE_VERSION, SOOLENAI_MAX_SECURITY_CONTROLS } from "../../../../lib/ai/soolenai-max-security.js";

function reply(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options":"nosniff" } });
}
function securityCapability(){return{
  profile:SOOLENAI_SECURITY_PROFILE,
  baselineVersion:SOOLENAI_SECURITY_BASELINE_VERSION,
  secureByDefault:true,
  customerDowngradeAllowed:false,
  defaultProjectState:"private/draft",
  releaseFailClosed:true,
  malwareDefense:"defense-in-depth",
  antivirusClaim:"A real malware scanner clean result is only claimed when hash-bound scanner evidence exists; this profile is not an absolute no-malware/no-vulnerability guarantee.",
  controls:SOOLENAI_MAX_SECURITY_CONTROLS,
};}
function publicResolved(resolved){
  const {providers={}, ...safe}=resolved||{};
  return {
    ...safe,
    providers:{
      count:Number(providers.count||0),
      premiumRouting:Boolean(providers.premiumRouting),
      costMode:String(providers.costMode||"zero"),
      providerNamesHidden:true,
    },
  };
}
function creatorRuntimeReadiness(){
  const image=getImageGenerationConfig(),video=getVideoRendererConfig(),multiplayer=getMultiplayerProviderConfig();
  return{
    providerNamesHidden:true,
    avatar:{externalProviderConnected:Boolean(image.connected),externalProviderAllowed:Boolean(image.configured),blockedByCostPolicy:Boolean(image.blockedByCostPolicy),durablePrivateCapture:true,idempotentReplay:true,liveProviderEvidenceVerified:false},
    video:{externalRendererConnected:Boolean(video.connected),externalRendererAllowed:Boolean(video.configured),blockedByCostPolicy:Boolean(video.blockedByCostPolicy),durablePrivateMp4Required:true,idempotentRendererSubmission:true,liveProviderEvidenceVerified:false},
    gameRuntime:{localPlayableRuntime:Boolean(GAME_RUNTIME_V1.playable),runtimeVersion:GAME_RUNTIME_V1.version,generatedProductionProjectVerified:false,realDeviceEvidenceVerified:false},
    multiplayer:{externalProviderConnected:Boolean(multiplayer.connected),externalProviderAllowed:Boolean(multiplayer.configured),blockedByCostPolicy:Boolean(multiplayer.blockedByCostPolicy),replaySafeMatchmaking:true,authoritativeRuntimeReady:true,liveProviderEvidenceVerified:false},
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const subscription = user ? await getSoolenSubscription(supabase, user.id) : { tier:"free", planName:"Free", status:"none", currentPeriodEnd:null };
    const tier = subscription.tier;
    const resolved = publicResolved(resolveSoolenCapabilities({ tier }));

    return reply({
      success: true,
      authenticated: Boolean(user),
      subscription: {
        tier,
        planName: subscription.planName,
        status: subscription?.status || "none",
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
      },
      ...resolved,
      creatorRuntimeReadiness:creatorRuntimeReadiness(),
      platform:publicPlatformStatus(),
      security:securityCapability(),
    });
  } catch (error) {
    console.error("SOOLEN_CAPABILITIES_ERROR:", error?.code||error?.name||"unknown");
    return reply({
      success: true,
      authenticated: false,
      subscription: { tier: "free", planName: "Free", status: "unavailable", currentPeriodEnd: null },
      ...publicResolved(resolveSoolenCapabilities({ tier: "free" })),
      creatorRuntimeReadiness:creatorRuntimeReadiness(),
      platform:publicPlatformStatus(),
      security:securityCapability(),
    });
  }
}
