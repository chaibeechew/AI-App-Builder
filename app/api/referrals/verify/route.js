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

    const { data: referral, error: referralError } = await supabase.rpc(
      "verify_referral_for_current_user"
    );

    if (referralError) {
      const status = referralError.message?.includes("Self-referral") ? 409 : 400;
      return NextResponse.json({ error: referralError.message }, { status });
    }

    return NextResponse.json({ success: true, referral: referral || null });
  } catch (error) {
    console.error("Referral verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to update referral status." },
      { status: 500 }
    );
  }
}
