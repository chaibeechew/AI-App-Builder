import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../lib/supabase/admin.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json();
    const listingId = String(body?.listingId || "").trim();
    if (!listingId) return NextResponse.json({ error: "listingId is required." }, { status: 400 });

    const { data: listing } = await supabase.from("store_listings").select("id,app_id,version_id,customer_approved_at").eq("id", listingId).maybeSingle();
    if (!listing) return NextResponse.json({ error: "Store listing not found." }, { status: 404 });
    const { data: app } = await supabase.from("apps").select("id,current_version_id").eq("id", listing.app_id).eq("owner_id", user.id).maybeSingle();
    if (!app) return NextResponse.json({ error: "Store listing not found or access denied." }, { status: 404 });
    if (!listing.version_id || app.current_version_id !== listing.version_id) return NextResponse.json({ error: "Only the current project version can be approved for store preparation." }, { status: 409 });

    const approvedAt=listing.customer_approved_at||new Date().toISOString();
    const admin=createAdminClient();
    const { data, error } = await admin.from("store_listings").update({customer_approved_at:approvedAt,updated_at:new Date().toISOString()}).eq("id",listingId).eq("app_id",app.id).eq("version_id",app.current_version_id).select("*").single();
    if (error || !data) return NextResponse.json({ error: "Unable to approve store listing." }, { status: 500 });
    return NextResponse.json({ success: true, listing: data });
  } catch (error) {
    console.error("STORE_LISTING_APPROVE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to approve store listing." }, { status: 500 });
  }
}
