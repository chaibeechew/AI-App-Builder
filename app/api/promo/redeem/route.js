import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    if (!user.confirmed_at && !user.email_confirmed_at && !user.phone_confirmed_at) {
      return NextResponse.json({ success: false, error: "Please verify your email or phone before redeeming a promo code." }, { status: 403 });
    }

    const body = await request.json();
    const code = String(body?.code || "").trim();
    if (code.length < 3 || code.length > 64) return NextResponse.json({ success: false, error: "Invalid promo code." }, { status: 400 });

    const { data, error } = await supabase.rpc("redeem_promo_code", { p_code: code });
    if (error) {
      console.error("PROMO_REDEEM_ERROR:", error);
      const message = error.message?.toLowerCase() || "";
      if (message.includes("already redeemed")) return NextResponse.json({ success: false, error: "This promo code has already been redeemed by your account." }, { status: 409 });
      if (message.includes("expired") || message.includes("limit reached") || message.includes("inactive") || message.includes("not active yet")) return NextResponse.json({ success: false, error: "This promo code is not available." }, { status: 400 });
      return NextResponse.json({ success: false, error: "Unable to redeem promo code." }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PROMO_REDEEM_API_ERROR:", error);
    return NextResponse.json({ success: false, error: "Unable to redeem promo code." }, { status: 500 });
  }
}
