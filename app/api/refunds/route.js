import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    const subscriptionId = String(body?.subscriptionId || "").trim();
    const reason = String(body?.reason || "").trim().slice(0, 1000);
    if (!subscriptionId) return NextResponse.json({ success: false, error: "Subscription ID is required." }, { status: 400 });

    const { data, error } = await supabase.rpc("request_subscription_refund", {
      p_subscription_id: subscriptionId,
      p_reason: reason || null,
    });
    if (error) {
      console.error("REFUND_REQUEST_ERROR:", error);
      const message = error.message?.toLowerCase() || "";
      if (message.includes("expired") || message.includes("already requested") || message.includes("not found")) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: "Unable to submit refund request." }, { status: 500 });
    }
    return NextResponse.json({ success: true, refund: data });
  } catch (error) {
    console.error("REFUND_API_ERROR:", error);
    return NextResponse.json({ success: false, error: "Unable to submit refund request." }, { status: 500 });
  }
}
