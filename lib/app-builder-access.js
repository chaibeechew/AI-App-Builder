export async function getAppBuilderAccess(supabase, userId) {
  const now = Date.now();
  const empty = {
    standard: { projectCredits: 0 },
    professional: {
      active: false,
      validFrom: null,
      validUntil: null,
      daysRemaining: 0,
      gameAccessPlan: "professional",
      gameCooldownLevel: 0,
      gameCooldownUntil: null,
      gameCooldownActive: false,
    },
    creatorSupport: {
      active: false,
      validFrom: null,
      validUntil: null,
      daysRemaining: 0,
      extensionCount: 0,
      allFeatures: true,
      individualOnly: true,
    },
    creatorOpportunity: {
      active: false,
      bonusSharePercent: 0,
      approvedAt: null,
      approvedBy: null,
      individualOnly: true,
    },
  };
  if (!supabase || !userId) return empty;

  const { data, error } = await supabase
    .from("app_builder_account_access")
    .select("standard_project_credits,pro_valid_from,pro_valid_until,game_access_plan,game_cooldown_level,game_cooldown_until,creator_support_valid_from,creator_support_valid_until,creator_support_extension_count,creator_opportunity_active,creator_opportunity_bonus_share_percent,creator_opportunity_approved_at,creator_opportunity_approved_by")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return empty;
  const untilMs = data.pro_valid_until ? new Date(data.pro_valid_until).getTime() : NaN;
  const supportUntilMs = data.creator_support_valid_until ? new Date(data.creator_support_valid_until).getTime() : NaN;
  const cooldownUntilMs = data.game_cooldown_until ? new Date(data.game_cooldown_until).getTime() : NaN;
  const active = Number.isFinite(untilMs) && untilMs > now;
  const creatorSupportActive = Number.isFinite(supportUntilMs) && supportUntilMs > now;
  const creatorOpportunityActive = data.creator_opportunity_active === true;
  const gameAccessPlan = creatorSupportActive || creatorOpportunityActive || data.game_access_plan === "full" ? "full" : "professional";
  return {
    standard: { projectCredits: Math.max(0, Number(data.standard_project_credits || 0)) },
    professional: {
      active,
      validFrom: data.pro_valid_from || null,
      validUntil: data.pro_valid_until || null,
      daysRemaining: active ? Math.max(1, Math.ceil((untilMs - now) / 86400000)) : 0,
      gameAccessPlan,
      gameCooldownLevel: Math.max(0, Math.min(5, Number(data.game_cooldown_level || 0))),
      gameCooldownUntil: data.game_cooldown_until || null,
      gameCooldownActive: !creatorSupportActive && !creatorOpportunityActive && gameAccessPlan === "professional" && Number.isFinite(cooldownUntilMs) && cooldownUntilMs > now,
    },
    creatorSupport: {
      active: creatorSupportActive,
      validFrom: data.creator_support_valid_from || null,
      validUntil: data.creator_support_valid_until || null,
      daysRemaining: creatorSupportActive ? Math.max(1, Math.ceil((supportUntilMs - now) / 86400000)) : 0,
      extensionCount: Math.max(0, Number(data.creator_support_extension_count || 0)),
      allFeatures: true,
      individualOnly: true,
    },
    creatorOpportunity: {
      active: creatorOpportunityActive,
      bonusSharePercent: creatorOpportunityActive ? Number(data.creator_opportunity_bonus_share_percent || 5) : 0,
      approvedAt: data.creator_opportunity_approved_at || null,
      approvedBy: data.creator_opportunity_approved_by || null,
      individualOnly: true,
    },
  };
}
