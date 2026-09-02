import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { resolveSoolenCapabilities } from "../../../../lib/soolen/capability-registry.js";
import { getSoolenSubscription } from "../../../../lib/soolen/user-tier.js";
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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const subscription = user ? await getSoolenSubscription(supabase, user.id) : { tier:"free", planName:"Free", status:"none", currentPeriodEnd:null };
    const tier = subscription.tier;
    const resolved = resolveSoolenCapabilities({ tier });

    return reply({
      success: true,
      authenticated: Boolean(user),
      subscription: {
        tier,
        planName: subscription.planName,
        status: subscription?.status || "none",
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
      },
      security:securityCapability(),
      ...resolved,
    });
  } catch (error) {
    console.error("SOOLEN_CAPABILITIES_ERROR:", error?.code||error?.name||"unknown");
    return reply({
      success: true,
      authenticated: false,
      subscription: { tier: "free", planName: "Free", status: "unavailable", currentPeriodEnd: null },
      security:securityCapability(),
      ...resolveSoolenCapabilities({ tier: "free" }),
    });
  }
}
