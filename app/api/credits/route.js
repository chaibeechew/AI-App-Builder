import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: account, error: accountError } = await supabase
      .from("credit_accounts")
      .select("user_id,balance,currency,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (accountError) {
      console.error("CREDITS_ACCOUNT_ERROR:", accountError);
      return NextResponse.json({ error: "Unable to load credits." }, { status: 500 });
    }

    const { data: transactions, error: ledgerError } = await supabase
      .from("credit_transactions")
      .select("id,type,amount,description,metadata,request_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (ledgerError) {
      console.error("CREDITS_LEDGER_ERROR:", ledgerError);
      return NextResponse.json({ error: "Unable to load credit history." }, { status: 500 });
    }

    const ledger=(transactions||[]).map((item)=>({
      id:item.id,
      type:item.type,
      amount:Number(item.amount||0),
      description:item.description||"Credit activity",
      metadata:item.metadata||{},
      requestId:item.request_id||null,
      created_at:item.created_at,
    }));

    return NextResponse.json({
      balance: Number(account?.balance || 0),
      currency: account?.currency || "CREDIT",
      updatedAt: account?.updated_at || null,
      ledger,
    });
  } catch (error) {
    console.error("CREDITS_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to load credits." }, { status: 500 });
  }
}
