import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    const listingId = String(body?.listingId || "").trim();
    if (!listingId) return NextResponse.json({ error: "listingId is required." }, { status: 400 });

    const { data, error } = await supabase.rpc("approve_store_listing", { p_listing_id: listingId });
    if (error) {
      console.error("STORE_LISTING_APPROVE_ERROR:", error);
      return NextResponse.json({ error: "Unable to approve store listing." }, { status: 500 });
    }
    return NextResponse.json({ success: true, listing: data });
  } catch (error) {
    console.error("STORE_LISTING_APPROVE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to approve store listing." }, { status: 500 });
  }
}
