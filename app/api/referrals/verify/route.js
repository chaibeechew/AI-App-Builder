import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const isVerified = Boolean(
      user.confirmed_at || user.email_confirmed_at || user.phone_confirmed_at
    );

    if (!isVerified) {
      return NextResponse.json({ error: "Account verification is required." }, { status: 403 });
    }

    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .select("id, referrer_user_id, referred_user_id, status, verified_at, qualified_at")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (referralError) throw referralError;

    if (!referral) {
      return NextResponse.json({ success: true, referral: null });
    }

    if (referral.referrer_user_id === user.id) {
      return NextResponse.json({ error: "Self-referral is not allowed." }, { status: 409 });
    }

    if (referral.status === "rejected") {
      return NextResponse.json({ success: true, referral });
    }

    if (referral.status === "registered") {
      const { data: updated, error: updateError } = await supabase
        .from("referrals")
        .update({ status: "verified", verified_at: referral.verified_at || new Date().toISOString() })
        .eq("id", referral.id)
        .eq("referred_user_id", user.id)
        .select("id, referrer_user_id, referred_user_id, status, verified_at, qualified_at")
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, referral: updated });
    }

    return NextResponse.json({ success: true, referral });
  } catch (error) {
    console.error("Referral verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to update referral status." },
      { status: 500 }
    );
  }
}
