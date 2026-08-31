export async function getAppBuilderAccess(supabase, userId) {
  const now = Date.now();
  const empty = {
    standard: { projectCredits: 0 },
    professional: { active: false, validFrom: null, validUntil: null, daysRemaining: 0 },
  };
  if (!supabase || !userId) return empty;

  const { data, error } = await supabase
    .from("app_builder_account_access")
    .select("standard_project_credits,pro_valid_from,pro_valid_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return empty;
  const untilMs = data.pro_valid_until ? new Date(data.pro_valid_until).getTime() : NaN;
  const active = Number.isFinite(untilMs) && untilMs > now;
  return {
    standard: { projectCredits: Math.max(0, Number(data.standard_project_credits || 0)) },
    professional: {
      active,
      validFrom: data.pro_valid_from || null,
      validUntil: data.pro_valid_until || null,
      daysRemaining: active ? Math.max(1, Math.ceil((untilMs - now) / 86400000)) : 0,
    },
  };
}
