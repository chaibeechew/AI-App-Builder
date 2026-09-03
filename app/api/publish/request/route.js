import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../lib/supabase/admin.js";
import { assessBuildQuality } from "../../../../lib/buildStandards.js";
import { evaluateReleaseReadiness, RELEASE_POLICY_NOTE } from "../../../../lib/release-readiness.js";
import { buildStoreReadiness } from "../../../../lib/publishing/store-readiness-policy.js";

const MAX_REQUEST_BYTES=24*1024;
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function safeObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function present(value){return String(value??"").trim().length>0;}

async function evaluateAuthoritativeStoreReadiness({supabase,userId,appId,version,listing,platform}){
  const [{data:projectAssets},{data:memoryRow}]=await Promise.all([
    supabase.from("project_assets").select("asset_id,suggested_role,placement_reason").eq("app_id",appId).eq("owner_id",userId),
    supabase.from("project_memory").select("memory_json").eq("app_id",appId).eq("owner_id",userId).maybeSingle(),
  ]);
  const assetIds=(projectAssets||[]).map(item=>item.asset_id).filter(Boolean);
  let library=[];
  if(assetIds.length){
    const {data}=await supabase.from("asset_library").select("id,file_name,mime_type,category").eq("user_id",userId).in("id",assetIds);
    library=data||[];
  }
  const libraryById=new Map(library.map(item=>[item.id,item]));
  const assets=(projectAssets||[]).map(item=>({...item,...(libraryById.get(item.asset_id)||{})}));
  const apple=safeObject(listing?.apple);
  const google=safeObject(listing?.google_play);
  const inferredAnswers={
    supportEmail:google.contactEmail||"",
    privacyPolicyUrl:apple.privacyUrl||google.privacyPolicyUrl||"",
    supportUrl:apple.supportUrl||"",
    websiteUrl:apple.marketingUrl||google.developerWebsite||"",
    targetAudience:google.audienceSummary||"",
    loginRequired:/authenticated areas|provide review\/demo access/i.test(String(apple.reviewNotes||"")),
  };
  const customerDeclarations=safeObject(memoryRow?.memory_json?.storePublishingDeclarations);
  const readiness=buildStoreReadiness({specification:version?.specification||{},listing,assets,inferredAnswers,customerDeclarations});
  const targetMetadataReady=platform==="apple"
    ? present(apple.name)&&present(apple.description)
    : present(google.title)&&present(google.fullDescription);
  return {readiness,targetMetadataReady};
}

export async function POST(request) {
  try {
    const length=Number(request.headers.get("content-length")||0);if(length>MAX_REQUEST_BYTES)return json({error:"Store preparation request is too large."},413);
    const supabase = await createClient();
    const { data: { user },error:userError } = await supabase.auth.getUser();
    if (userError||!user) return json({ error: "Authentication required." },401);
    if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return json({error:"Account verification is required."},403);
    const body = await request.json().catch(() => null);if(!body)return json({error:"Invalid store preparation request."},400);if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_REQUEST_BYTES)return json({error:"Store preparation request is too large."},413);
    const appId = String(body?.appId || "").trim();
    const versionId = String(body?.versionId || "").trim();
    const platform = String(body?.platform || "").trim();
    const listingId = String(body?.listingId || "").trim();
    const requestId=String(body?.requestId||"").trim();
    if (!UUID.test(appId)||!UUID.test(versionId)||!UUID.test(listingId)||!["apple", "google_play"].includes(platform)||!REQUEST_ID.test(requestId)) return json({ error: "appId, versionId, listingId, stable requestId and a valid platform are required." },400);

    const { data: app } = await supabase.from("apps").select("id,current_version_id").eq("id", appId).eq("owner_id", user.id).maybeSingle();
    if (!app) return json({ error: "App not found." },404);
    if (app.current_version_id !== versionId) return json({ error: "Store publishing must use the current reviewed project version. Review or rollback first, then prepare the store listing again.",code:"STALE_STORE_VERSION" },409);

    const { data: version } = await supabase.from("app_versions").select("id,specification").eq("id", versionId).eq("app_id", appId).maybeSingle();
    if (!version) return json({ error: "Publish version not found." },404);
    const quality = assessBuildQuality(version.specification || {});
    const readiness = evaluateReleaseReadiness(quality);
    if (!readiness.releaseReady) return json({ error: `Store publishing is locked until the current version reaches ${readiness.requiredScore}/100 overall and in every quality dimension.`, releaseReady: false, quality, belowTarget: readiness.belowTarget, missingDimensions: readiness.missing, note: RELEASE_POLICY_NOTE },409);

    const { data: listing } = await supabase.from("store_listings").select("id,app_id,version_id,apple,google_play,checklist,customer_approved_at").eq("id", listingId).eq("app_id", appId).maybeSingle();
    if (!listing) return json({ error: "Store listing not found." },404);
    if (!listing.customer_approved_at) return json({ error: "Customer approval is required before publishing." },409);
    if (!listing.version_id || listing.version_id !== versionId) return json({ error: "The approved store listing must match the exact current project version." },409);

    // Final server-side gate: never trust the UI's readiness state or customer_approved_at alone.
    // Re-evaluate the exact current specification, linked icon/screenshots and customer declarations
    // immediately before creating the preparation request.
    const store=await evaluateAuthoritativeStoreReadiness({supabase,userId:user.id,appId,version,listing,platform});
    if(!store.targetMetadataReady)return json({error:`${platform==="apple"?"Apple App Store":"Google Play"} metadata is incomplete for this exact version. Review the generated listing before preparing submission.`,code:"STORE_PLATFORM_METADATA_INCOMPLETE",readyForOfficialSubmission:false},409);
    if(!store.readiness.readyForCustomerReview)return json({
      error:"Store preparation is not ready for customer review yet. Complete the required listing assets and customer declarations first.",
      code:"STORE_REVIEW_NOT_READY",
      readyForCustomerReview:false,
      readyForOfficialSubmission:false,
      customerRequired:store.readiness.customerRequired.map(item=>({key:item.key,label:item.label})),
      preparable:store.readiness.preparable.map(item=>({key:item.key,label:item.label})),
    },409);

    const admin=createAdminClient();
    const { data, error } = await admin.rpc("server_create_store_publish_request",{p_user_id:user.id,p_app_id:appId,p_version_id:versionId,p_listing_id:listingId,p_platform:platform,p_request_id:requestId});
    if(error){const message=String(error?.message||"");if(message.includes("STALE_STORE_VERSION"))return json({error:"The project changed during store preparation. Nothing was submitted; review the newest version and retry.",code:"STALE_STORE_VERSION"},409);console.error("STORE_PUBLISH_REQUEST_RPC_ERROR",error?.code||"unknown");return json({error:"Unable to create publish request."},500);}
    return json({
      success:true,
      request:{id:data?.id,app_id:data?.app_id,version_id:data?.version_id,platform:data?.platform,status:data?.status,created_at:data?.created_at},
      duplicate:Boolean(data?.replayed),
      releaseReady:true,
      readyForCustomerReview:true,
      readyForOfficialSubmission:false,
      externalSubmission:{officialSubmissionConfirmed:false,externalSigningVerified:false,providerReference:null,storeReviewVerified:false},
      note:"Store preparation is recorded safely. Nothing has been submitted to Apple or Google yet; store accounts, signing, platform declarations, review and approval remain external steps."
    });
  } catch (error) {
    console.error("PUBLISH_REQUEST_API_ERROR",error?.code||error?.name||"unknown");
    return json({ error: "Unable to create publish request." },500);
  }
}