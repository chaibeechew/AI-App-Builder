import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { resolveSoolenCapabilities } from "../../../../lib/soolen/capability-registry.js";
import { getSoolenSubscription } from "../../../../lib/soolen/user-tier.js";

function reply(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "private, no-store" } });
}

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
        currentPeriodEnd: subscription?.current_period_end || null,
      },
      ...resolved,
    });
  } catch (error) {
    console.error("SOOLEN_CAPABILITIES_ERROR:", error);
    return reply({
      success: true,
      authenticated: false,
      subscription: { tier: "free", planName: "Free", status: "unavailable", currentPeriodEnd: null },
      ...resolveSoolenCapabilities({ tier: "free" }),
    });
  }
}
