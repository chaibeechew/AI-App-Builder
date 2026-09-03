import { NextResponse } from "next/server";
import { STORE_METADATA_SAVE_MAX_BYTES, isStoreUuid, readBoundedStoreJson, sanitizeStoreListingPayload } from "../../../../lib/publishing/store-metadata-safety.js";
import { getBuilderPrincipal,saveBuilderStoreListing } from "../../../../lib/cloud/builder-projects.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}

export async function POST(request) {
  try {
    const principal=await getBuilderPrincipal({requireVerified:true});
    if(!principal.ok){
      if(principal.code==="ACCOUNT_VERIFICATION_REQUIRED")return json({error:"Account verification is required."},403);
      return json({error:"Authentication required."},401);
    }

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

    const saved=await saveBuilderStoreListing({appId,versionId,language,normalized});
    if(!saved.ok){
      if(saved.code==="PROJECT_NOT_FOUND")return json({error:"App not found."},404);
      if(saved.code==="STALE_STORE_VERSION")return json({error:"Store metadata can only be saved for the exact current project version."},409);
      if(saved.code==="PROJECT_VERSION_NOT_FOUND")return json({error:"Version not found."},404);
      return json({error:"Unable to save store listing."},500);
    }
    return json({ success: true, listing: saved.listing, approvalReset: true, readyForOfficialSubmission:false, message: "Store listing saved. Customer approval is required again after any metadata change; nothing was submitted to Apple or Google." });
  } catch (error) {
    console.error("STORE_LISTING_SAVE_API_ERROR:", error?.code||error?.name||"unknown");
    return json({ error: "Unable to save store listing." }, 500);
  }
}