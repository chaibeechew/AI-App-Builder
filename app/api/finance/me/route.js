import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const [cash, withdrawals, refunds, payoutAccounts] = await Promise.all([
      supabase.from("cash_accounts").select("available_amount,reserved_amount,pending_amount").eq("user_id", user.id).maybeSingle(),
      supabase.from("withdrawals").select("id,amount,status,requested_at").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(50),
      supabase.from("refund_requests").select("id,amount,status,requested_at,eligible_until").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(50),
      supabase.from("payout_accounts").select("id,account_reference,status,cooling_until,provider").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    const firstError = [cash, withdrawals, refunds, payoutAccounts].find((x) => x.error)?.error;
    if (firstError) { console.error("FINANCE_ME_ERROR:", firstError); return NextResponse.json({ error: "Unable to load finance data." }, { status: 500 }); }

    return NextResponse.json({
      cash: { available: cash.data?.available_amount || 0, reserved: cash.data?.reserved_amount || 0, pending: cash.data?.pending_amount || 0 },
      withdrawals: withdrawals.data || [],
      refunds: (refunds.data || []).map((r) => ({ ...r, created_at: r.requested_at })),
      payoutAccounts: (payoutAccounts.data || []).map((a) => ({ ...a, label: `${a.provider}: ${a.account_reference}` }))
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("FINANCE_ME_API_ERROR:", e);
    return NextResponse.json({ error: "Unable to load finance data." }, { status: 500 });
  }
}
