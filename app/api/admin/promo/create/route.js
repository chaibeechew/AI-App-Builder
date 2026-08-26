import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const body = await request.json();
    const description = String(body?.description || "").trim().slice(0, 500) || null;
    const freeDays = Number.isInteger(body?.freeDays) ? body.freeDays : 0;
    const bonusCredits = Number.isInteger(body?.bonusCredits) ? body.bonusCredits : 0;
    const maxRedemptions = Number.isInteger(body?.maxRedemptions) ? body.maxRedemptions : 1;
    const startsAt = body?.startsAt ? new Date(body.startsAt).toISOString() : null;
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt).toISOString() : null;

    if (freeDays < 0 || freeDays > 3650 || bonusCredits < 0 || bonusCredits > 1000000000 || maxRedemptions < 1 || maxRedemptions > 10000000) {
      return NextResponse.json({ error: "Invalid promo settings." }, { status: 400 });
    }
    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) return NextResponse.json({ error: "Invalid promo dates." }, { status: 400 });

    const { data, error } = await supabase.rpc("generate_promo_code", {
      p_description: description,
      p_free_days: freeDays,
      p_bonus_credits: bonusCredits,
      p_max_redemptions: maxRedemptions,
      p_starts_at: startsAt,
      p_expires_at: expiresAt,
    });

    if (error) {
      console.error("ADMIN_PROMO_CREATE_ERROR:", error);
      return NextResponse.json({ error: "Unable to create promo code." }, { status: 500 });
    }
    return NextResponse.json({ success: true, promo: data });
  } catch (error) {
    console.error("ADMIN_PROMO_CREATE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to create promo code." }, { status: 500 });
  }
}
