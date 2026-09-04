import { NextResponse } from "next/server";
import {
  laneriqSecurityCapability,
  publicLaneriqPlatformStatus,
  resolveLaneriqAccountContext,
} from "../../../../lib/laneriq/legacy-runtime-adapter.js";
import { getImageGenerationConfig } from "../../../../lib/ai/image-generation-gateway.js";
import { getVideoRendererConfig } from "../../../../lib/video/render-gateway.js";
import { getMultiplayerProviderConfig } from "../../../../lib/game/multiplayer-provider-gateway.js";
import { GAME_RUNTIME_V1 } from "../../../../lib/game/runtime-v1.js";

function reply(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-LANERIQ-Authority": "laneriq",
    },
  });
}

function publicResolved(resolved) {
  const { providers = {}, ...safe } = resolved || {};
  return {
    ...safe,
    providers: {
      count: Number(providers.count || 0),
      premiumRouting: Boolean(providers.premiumRouting),
      costMode: String(providers.costMode || "zero"),
      providerNamesHidden: true,
    },
  };
}

function creatorRuntimeReadiness() {
  const image = getImageGenerationConfig();
  const video = getVideoRendererConfig();
  const multiplayer = getMultiplayerProviderConfig();
  return {
    providerNamesHidden: true,
    avatar: {
      externalProviderConnected: Boolean(image.connected),
      externalProviderAllowed: Boolean(image.configured),
      blockedByCostPolicy: Boolean(image.blockedByCostPolicy),
      durablePrivateCapture: true,
      idempotentReplay: true,
      liveProviderEvidenceVerified: false,
    },
    video: {
      externalRendererConnected: Boolean(video.connected),
      externalRendererAllowed: Boolean(video.configured),
      blockedByCostPolicy: Boolean(video.blockedByCostPolicy),
      durablePrivateMp4Required: true,
      idempotentRendererSubmission: true,
      liveProviderEvidenceVerified: false,
    },
    gameRuntime: {
      localPlayableRuntime: Boolean(GAME_RUNTIME_V1.playable),
      runtimeVersion: GAME_RUNTIME_V1.version,
      generatedProductionProjectVerified: false,
      realDeviceEvidenceVerified: false,
    },
    multiplayer: {
      externalProviderConnected: Boolean(multiplayer.connected),
      externalProviderAllowed: Boolean(multiplayer.configured),
      blockedByCostPolicy: Boolean(multiplayer.blockedByCostPolicy),
      replaySafeMatchmaking: true,
      authoritativeRuntimeReady: true,
      liveProviderEvidenceVerified: false,
    },
  };
}

async function payload(context) {
  return {
    success: true,
    authority: "laneriq",
    canonicalNamespace: "/api/laneriq",
    authenticated: Boolean(context.authenticated),
    subscription: context.subscription,
    ...publicResolved(context.resolved),
    creatorRuntimeReadiness: creatorRuntimeReadiness(),
    platform: publicLaneriqPlatformStatus(),
    security: laneriqSecurityCapability(),
    compatibility: {
      legacyApiAvailable: true,
      legacyRuntimeRequired: false,
    },
  };
}

export async function GET() {
  try {
    return reply(await payload(await resolveLaneriqAccountContext()));
  } catch (error) {
    console.error("LANERIQ_CAPABILITIES_ERROR:", error?.code || error?.name || "unknown");
    return reply(await payload(await resolveLaneriqAccountContext({ anonymousOnly: true })));
  }
}
