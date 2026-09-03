import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../lib/supabase/admin.js";
import { STORE_METADATA_APPROVAL_MAX_BYTES, isStoreUuid, readBoundedStoreJson } from "../../../../lib/publishing/store-metadata-safety.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function verified(user){return Boolean(user?.confirmed_at||user?.email_confirmed_at||user?.phone_confirmed_at);}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Authentication required." }, 401);
    if(!verified(user))return json({error:"Account verification is required."},403);

    const parsed=await readBoundedStoreJson(request,STORE_METADATA_APPROVAL_MAX_BYTES);
    if(!parsed.ok)return json({error:parsed.status===413?"Store approval request is too large.":"Invalid store approval request."},parsed.status);
    const listingId = String(parsed.value?.listingId || "").trim();
    if (!isStoreUuid(listingId)) return json({ error: "A valid listingId is required." }, 400);

    const { data: listing } = await supabase.from("store_listings").select("id,app_id,version_id,customer_approved_at").eq("id", listingId).maybeSingle();
    if (!listing) return json({ error: "Store listing not found." }, 404);
    const { data: app } = await supabase.from("apps").select("id,current_version_id").eq("id", listing.app_id).eq("owner_id", user.id).maybeSingle();
    if (!app) return json({ error: "Store listing not found or access denied." }, 404);
    if (!listing.version_id || app.current_version_id !== listing.version_id) return json({ error: "Only the exact current project version can be approved for store preparation." }, 409);

    const approvedAt=listing.customer_approved_at||new Date().toISOString();
    const admin=createAdminClient();
    const { data, error } = await admin.from("store_listings").update({customer_approved_at:approvedAt,updated_at:new Date().toISOString()}).eq("id",listingId).eq("app_id",app.id).eq("version_id",app.current_version_id).select("id,app_id,version_id,language,apple,google_play,checklist,customer_approved_at,updated_at").single();
    if (error || !data) return json({ error: "Unable to approve store listing." }, 500);
    return json({ success: true, listing: data, replayed:Boolean(listing.customer_approved_at), readyForOfficialSubmission:false, message:"Customer approval recorded for this exact project version. Official Apple/Google submission is still external and unverified." });
  } catch (error) {
    console.error("STORE_LISTING_APPROVE_API_ERROR:", error?.code||error?.name||"unknown");
    return json({ error: "Unable to approve store listing." }, 500);
  }
}
