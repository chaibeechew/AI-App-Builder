import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: account, error: accountError } = await supabase
      .from("credit_accounts")
      .select("user_id, balance, currency, updated_at")
      .eq("user_id", user.id)
      .single();

    if (accountError) {
      console.error("CREDITS_ACCOUNT_ERROR:", accountError);
      return NextResponse.json({ error: "Unable to load credits." }, { status: 500 });
    }

    const { data: ledger, error: ledgerError } = await supabase
      .from("credit_ledger")
      .select("id, entry_type, amount, balance_after, description, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (ledgerError) {
      console.error("CREDITS_LEDGER_ERROR:", ledgerError);
      return NextResponse.json({ error: "Unable to load credit history." }, { status: 500 });
    }

    return NextResponse.json({
      balance: Number(account?.balance || 0),
      currency: account?.currency || "CREDIT",
      updatedAt: account?.updated_at || null,
      ledger: ledger || [],
    });
  } catch (error) {
    console.error("CREDITS_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to load credits." }, { status: 500 });
  }
}
