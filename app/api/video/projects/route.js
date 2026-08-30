import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { getVideoComputePolicy, normalizeDeviceClass } from "../../../../lib/video/compute-policy.js";

function cleanName(value){return String(value||"Untitled Video").trim().slice(0,160)||"Untitled Video";}
function cleanStyle(value){return ["realistic","cartoon","mixed"].includes(value)?value:"realistic";}

export async function GET(){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data,error}=await supabase.from("video_projects").select("id,app_id,name,style,device_class,max_duration_seconds,status,created_at,updated_at").eq("owner_id",user.id).order("updated_at",{ascending:false});
    if(error)throw error;
    return NextResponse.json({success:true,projects:data||[]});
  }catch(error){console.error("VIDEO_PROJECTS_GET_ERROR",error);return NextResponse.json({error:"Unable to load video projects."},{status:500});}
}

export async function POST(request){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const body=await request.json().catch(()=>({}));
    const deviceClass=normalizeDeviceClass(body?.deviceClass);
    const policy=getVideoComputePolicy(deviceClass,body?.signals||{});
    const style=cleanStyle(body?.style);
    let appId=null;
    if(body?.appId){
      const {data:app}=await supabase.from("apps").select("id").eq("id",body.appId).eq("owner_id",user.id).maybeSingle();
      appId=app?.id||null;
    }
    const editJson={tracks:[],settings:{aspectRatio:body?.aspectRatio||"9:16",autoConnect:true,serverRender:true}};
    const {data,error}=await supabase.from("video_projects").insert({owner_id:user.id,app_id:appId,name:cleanName(body?.name),style,device_class:deviceClass,max_duration_seconds:policy.maxProjectSeconds,edit_json:editJson,status:"draft"}).select("id,app_id,name,style,device_class,max_duration_seconds,status,created_at,updated_at").single();
    if(error)throw error;
    return NextResponse.json({success:true,project:data,experience:{mode:policy.label,maxClipSeconds:policy.maxClipSeconds,maxProjectSeconds:policy.maxProjectSeconds,note:"SoolenAI automatically optimizes processing for this device."}});
  }catch(error){console.error("VIDEO_PROJECTS_POST_ERROR",error);return NextResponse.json({error:error?.message||"Unable to create video project."},{status:500});}
}
