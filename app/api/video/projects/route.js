import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { getVideoComputePolicy, normalizeDeviceClass } from "../../../../lib/video/compute-policy.js";

const MAX_REQUEST_BYTES=16*1024;
function cleanName(value){return String(value||"Untitled Video").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,160)||"Untitled Video";}
function cleanStyle(value){return ["realistic","cartoon","mixed"].includes(value)?value:"realistic";}
function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache"}});}

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
    const deviceClass=normalizeDeviceClass(body?.deviceClass);
    const signals=body?.signals&&typeof body.signals==="object"&&!Array.isArray(body.signals)?body.signals:{};
    const policy=getVideoComputePolicy(deviceClass,signals);
    const style=cleanStyle(String(body?.style||"").toLowerCase());
    let appId=null;
    if(body?.appId){
      const requestedAppId=String(body.appId).trim().slice(0,80);const {data:app}=await supabase.from("apps").select("id").eq("id",requestedAppId).eq("owner_id",user.id).maybeSingle();
      if(!app)return noStore({error:"Project not found or access denied."},404);appId=app.id;
    }
    const aspectRatio=["9:16","16:9","1:1"].includes(body?.aspectRatio)?body.aspectRatio:"9:16";
    const editJson={version:1,tracks:[],settings:{aspectRatio,autoConnect:true,serverRender:true}};
    const {data,error}=await supabase.from("video_projects").insert({owner_id:user.id,app_id:appId,name:cleanName(body?.name),style,device_class:deviceClass,max_duration_seconds:policy.maxProjectSeconds,edit_json:editJson,status:"draft"}).select("id,app_id,name,style,device_class,max_duration_seconds,status,created_at,updated_at").single();
    if(error)throw error;
    return noStore({success:true,project:data,experience:{mode:policy.label,maxClipSeconds:policy.maxClipSeconds,maxProjectSeconds:policy.maxProjectSeconds,note:"SoolenAI automatically keeps phone work lightweight and reserves heavy final rendering for the authorized server path."}});
  }catch(error){console.error("VIDEO_PROJECTS_POST_ERROR",error?.name||"unknown");return noStore({error:"Unable to create video project."},500);}
}
