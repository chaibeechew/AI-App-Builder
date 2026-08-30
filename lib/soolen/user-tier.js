import { planTier } from "./capability-registry.js";

export async function getSoolenSubscription(supabase, userId) {
  if (!supabase || !userId) return { tier:"free", status:"none", planCode:null, planName:"Free", currentPeriodEnd:null };
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status,current_period_end,subscription_plans(code,name)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return { tier:"free", status:"none", planCode:null, planName:"Free", currentPeriodEnd:null };
  const plan = Array.isArray(data.subscription_plans) ? data.subscription_plans[0] : data.subscription_plans;
  const tier = planTier(plan?.code, data.status);
  return {
    tier,
    status: data.status,
    planCode: plan?.code || null,
    planName: plan?.name || (tier === "free" ? "Free" : "Paid"),
    currentPeriodEnd: data.current_period_end || null,
  };
}

export function requirePaidTier(subscription) {
  return subscription?.tier === "pro" || subscription?.tier === "business";
}
