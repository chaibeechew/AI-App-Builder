import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../lib/supabase/admin.js";
import { STORE_METADATA_SAVE_MAX_BYTES, isStoreUuid, readBoundedStoreJson, sanitizeStoreListingPayload } from "../../../../lib/publishing/store-metadata-safety.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function verified(user){return Boolean(user?.confirmed_at||user?.email_confirmed_at||user?.phone_confirmed_at);}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Authentication required." }, 401);
    if(!verified(user))return json({error:"Account verification is required."},403);

    const parsed=await readBoundedStoreJson(request,STORE_METADATA_SAVE_MAX_BYTES);
    if(!parsed.ok)return json({error:parsed.status===413?"Store listing request is too large.":"Invalid store listing request."},parsed.status);
    const body=parsed.value;
    const appId = String(body?.appId || "").trim();
    const versionId = String(body?.versionId || "").trim();
    const language = String(body?.language || "en").trim().slice(0, 12) || "en";
    if(!isStoreUuid(appId)||!isStoreUuid(versionId))return json({error:"Valid appId and versionId are required."},400);
    if(!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(language))return json({error:"A valid listing language is required."},400);

    let normalized;
    try{normalized=sanitizeStoreListingPayload({apple:body?.apple,googlePlay:body?.googlePlay,checklist:body?.checklist});}
    catch(error){if(error?.message==="STORE_LISTING_TOO_LARGE")return json({error:"Store listing metadata is too large."},413);throw error;}

    const { data: app } = await supabase.from("apps").select("id,current_version_id").eq("id", appId).eq("owner_id", user.id).maybeSingle();
    if (!app) return json({ error: "App not found." }, 404);
    if(!app.current_version_id||app.current_version_id!==versionId)return json({error:"Store metadata can only be saved for the exact current project version."},409);
    const { data: version } = await supabase.from("app_versions").select("id").eq("id", versionId).eq("app_id", appId).maybeSingle();
    if (!version) return json({ error: "Version not found." }, 404);

    const admin=createAdminClient();
    const { data, error } = await admin.from("store_listings").upsert({
      app_id: appId,
      version_id: versionId,
      language,
      apple: normalized.apple,
      google_play: normalized.googlePlay,
      checklist: normalized.checklist,
      customer_approved_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "app_id,version_id,language" }).select("id,app_id,version_id,language,apple,google_play,checklist,customer_approved_at,updated_at").single();
    if (error) return json({ error: "Unable to save store listing." }, 500);
    return json({ success: true, listing: data, approvalReset: true, readyForOfficialSubmission:false, message: "Store listing saved. Customer approval is required again after any metadata change; nothing was submitted to Apple or Google." });
  } catch (error) {
    console.error("STORE_LISTING_SAVE_API_ERROR:", error?.code||error?.name||"unknown");
    return json({ error: "Unable to save store listing." }, 500);
  }
}
