import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../lib/supabase/admin.js";
import { getVideoComputePolicy, normalizeDeviceClass } from "../../../../lib/video/compute-policy.js";

const MAX_REQUEST_BYTES=16*1024;
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
function cleanName(value){return String(value||"Untitled Video").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,160)||"Untitled Video";}
function cleanStyle(value){return ["realistic","cartoon","mixed"].includes(value)?value:"realistic";}
function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function hashRequest(value){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
function publicProject(row){return{id:row?.id,app_id:row?.app_id||null,name:row?.name,style:row?.style,device_class:row?.device_class,max_duration_seconds:row?.max_duration_seconds,status:row?.status,created_at:row?.created_at,updated_at:row?.updated_at};}

export async function GET(){
  try{
    const supabase=await createClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return noStore({error:"Authentication required."},401);
    const {data,error}=await supabase.from("video_projects").select("id,app_id,name,style,device_class,max_duration_seconds,status,created_at,updated_at").eq("owner_id",user.id).order("updated_at",{ascending:false}).limit(100);
    if(error)throw error;
    return noStore({success:true,projects:data||[]});
  }catch(error){console.error("VIDEO_PROJECTS_GET_ERROR",error?.name||"unknown");return noStore({error:"Unable to load video projects."},500);}
}

export async function POST(request){
  try{
    const contentLength=Number(request.headers.get("content-length")||0);if(contentLength>MAX_REQUEST_BYTES)return noStore({error:"Video project request is too large."},413);
    const supabase=await createClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return noStore({error:"Authentication required."},401);
    if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return noStore({error:"Account verification is required."},403);
    const body=await request.json().catch(()=>null);if(!body)return noStore({error:"Invalid video project request."},400);if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_REQUEST_BYTES)return noStore({error:"Video project request is too large."},413);
    const requestId=String(body?.requestId||"").trim();if(!REQUEST_ID.test(requestId))return noStore({error:"A stable video project request ID is required."},400);
    const deviceClass=normalizeDeviceClass(body?.deviceClass);
    const signals=body?.signals&&typeof body.signals==="object"&&!Array.isArray(body.signals)?body.signals:{};
    const policy=getVideoComputePolicy(deviceClass,signals);
    const style=cleanStyle(String(body?.style||"").toLowerCase());
    let appId=null;
    if(body?.appId){
      const requestedAppId=String(body.appId).trim().slice(0,80);const {data:app}=await supabase.from("apps").select("id").eq("id",requestedAppId).eq("owner_id",user.id).maybeSingle();
      if(!app)return noStore({error:"Project not found or access denied."},404);appId=app.id;
    }
    const aspectRatio=["9:16","16:9","1:1"].includes(body?.aspectRatio)?body.aspectRatio:"9:16";const name=cleanName(body?.name);const editJson={version:2,tracks:[],settings:{aspectRatio,autoConnect:true,serverRender:true}};const requestHash=hashRequest({appId,name,style,deviceClass,maxProjectSeconds:policy.maxProjectSeconds,aspectRatio});
    const admin=createAdminClient();const{data,error}=await admin.rpc("server_create_video_project_v2",{p_user_id:user.id,p_request_id:requestId,p_request_hash:requestHash,p_app_id:appId,p_name:name,p_style:style,p_device_class:deviceClass,p_max_duration_seconds:policy.maxProjectSeconds,p_edit_json:editJson});
    if(error){if(String(error.message||"").includes("video_project_request_conflict"))return noStore({error:"This video project request ID was already used for different settings.",code:"VIDEO_PROJECT_REQUEST_CONFLICT"},409);throw error;}
    if(!data?.id)throw new Error("VIDEO_PROJECT_CREATE_FAILED");
    return noStore({success:true,replayed:Boolean(data.replayed),project:publicProject(data),experience:{mode:policy.label,maxClipSeconds:policy.maxClipSeconds,maxProjectSeconds:policy.maxProjectSeconds,note:"SoolenAI automatically keeps phone work lightweight and reserves heavy final rendering for the authorized server path."}});
  }catch(error){console.error("VIDEO_PROJECTS_POST_ERROR",error?.name||"unknown");return noStore({error:"Unable to create video project."},500);}
}
