import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../../lib/supabase/admin.js";
import { assessBuildQuality } from "../../../../../lib/buildStandards.js";
import { evaluateReleaseReadiness, RELEASE_POLICY_NOTE } from "../../../../../lib/release-readiness.js";

const MAX_REQUEST_BYTES=16*1024;
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}

export async function POST(request,{params}) {
  try {
    const length=Number(request.headers.get("content-length")||0);if(length>MAX_REQUEST_BYTES)return json({error:"Publish request is too large."},413);
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user },error:userError } = await supabase.auth.getUser();
    if (userError||!user) return json({ error: "Authentication required." },401);
    if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return json({error:"Account verification is required."},403);
    const body=await request.json().catch(()=>null);if(!body)return json({error:"Invalid publish request."},400);if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_REQUEST_BYTES)return json({error:"Publish request is too large."},413);
    const requestId=String(body?.requestId||"").trim(),expectedVersionId=String(body?.expectedVersionId||"").trim(),action=body?.action==="unpublish"?"unpublish":"publish";
    if(!REQUEST_ID.test(requestId))return json({error:"A stable Web Publish request ID is required."},400);
    if(!UUID.test(expectedVersionId))return json({error:"The exact reviewed version is required for Web Publish."},400);

    const { data: app } = await supabase.from("apps").select("id,owner_id,current_version_id,published_version_id,name,visibility,publish_status").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!app?.current_version_id) return json({ error: "App and Website are not ready to publish." },409);
    if(app.current_version_id!==expectedVersionId)return json({error:"The project changed since this publish screen was loaded. Review the current version before publishing.",code:"STALE_PUBLISH_VERSION"},409);
    const { data: version, error: versionError } = await supabase.from("app_versions").select("id,version_no,specification").eq("id",expectedVersionId).eq("app_id",id).maybeSingle();
    if (versionError || !version) return json({ error: "Current project version could not be verified." },409);

    let quality=null,readiness=null;
    if(action==="publish"){
      quality = assessBuildQuality(version.specification || {});
      readiness = evaluateReleaseReadiness(quality);
      if (!readiness.releaseReady) return json({error:`Publishing is locked until the project reaches ${readiness.requiredScore}/100 overall and in every quality dimension.`,quality,target:readiness.requiredScore,releaseReady:false,belowTarget:readiness.belowTarget,missingDimensions:readiness.missing,note:RELEASE_POLICY_NOTE,next:`/release/${id}`},409);
    }

    const admin=createAdminClient();
    const{data:result,error:publishError}=await admin.rpc("server_publish_web_project",{p_user_id:user.id,p_app_id:id,p_expected_version_id:expectedVersionId,p_request_id:requestId,p_action:action});
    if(publishError){const message=String(publishError?.message||"");if(message.includes("STALE_PUBLISH_VERSION"))return json({error:"The project changed during publishing. Nothing was published; review the newest version and retry.",code:"STALE_PUBLISH_VERSION"},409);console.error("PROJECT_PUBLISH_RPC_ERROR",publishError?.code||"unknown");return json({error:action==="publish"?"Unable to publish the App and Website.":"Unable to unpublish the App and Website."},500);}
    const publishedVersionId=result?.published_version_id||null;
    if(action==="publish"&&publishedVersionId!==expectedVersionId)return json({error:"Publish completed without an exact version pin. Public access remains unverified.",code:"PUBLISHED_VERSION_PIN_MISMATCH"},500);
    if(action==="unpublish"&&publishedVersionId)return json({error:"Unpublish completed without clearing the public version pin.",code:"PUBLISHED_VERSION_PIN_NOT_CLEARED"},500);
    return json({success:true,replayed:Boolean(result?.replayed),app:{id,name:app.name,visibility:result?.visibility||app.visibility,publish_status:result?.publish_status||app.publish_status,published_version_id:publishedVersionId},version:{id:version.id,version_no:version.version_no,published:action==="publish"&&publishedVersionId===version.id},quality,target:readiness?.requiredScore??null,releaseReady:action==="publish",note:action==="publish"?RELEASE_POLICY_NOTE:"The public App and Website routes were disabled for this project.",path:`/a/${id}`,appPath:`/a/${id}`,websitePath:`/website/${id}`,action});
  } catch (error) {
    console.error("PROJECT_PUBLISH_API_ERROR",error?.code||error?.name||"unknown");
    return json({ error: "Unable to update Web Publish status right now." },500);
  }
}
