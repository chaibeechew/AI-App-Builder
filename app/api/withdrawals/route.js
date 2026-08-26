import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    const payoutAccountId = String(body?.payoutAccountId || "").trim();
    const amount = Number(body?.amount);
    if (!payoutAccountId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Valid payout account and amount are required." }, { status: 400 });
    }
    if (amount > 1000000) return NextResponse.json({ success: false, error: "Withdrawal amount exceeds the per-request limit." }, { status: 400 });

    const { data, error } = await supabase.rpc("request_withdrawal", {
      p_payout_account_id: payoutAccountId,
      p_amount: amount.toFixed(2),
    });
    if (error) {
      console.error("WITHDRAWAL_REQUEST_ERROR:", error);
      const message = error.message?.toLowerCase() || "";
      if (message.includes("insufficient") || message.includes("minimum") || message.includes("cooling") || message.includes("verified payout")) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: "Unable to create withdrawal request." }, { status: 500 });
    }
    return NextResponse.json({ success: true, withdrawal: data });
  } catch (error) {
    console.error("WITHDRAWAL_API_ERROR:", error);
    return NextResponse.json({ success: false, error: "Unable to create withdrawal request." }, { status: 500 });
  }
}
