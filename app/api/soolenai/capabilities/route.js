import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { planTier, resolveSoolenCapabilities } from "../../../../lib/soolen/capability-registry.js";

function reply(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let subscription = null;

    if (user) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status,current_period_end,subscription_plans(code,name)")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error) subscription = data;
    }

    const plan = Array.isArray(subscription?.subscription_plans)
      ? subscription.subscription_plans[0]
      : subscription?.subscription_plans;
    const tier = planTier(plan?.code, subscription?.status);
    const resolved = resolveSoolenCapabilities({ tier });

    return reply({
      success: true,
      authenticated: Boolean(user),
      subscription: {
        tier,
        planName: plan?.name || (tier === "free" ? "Free" : "Paid"),
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
