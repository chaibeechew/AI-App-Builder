import { NextResponse } from "next/server";
import { createClient } from "../../../../../../lib/supabase/server.js";
import { getVideoComputePolicy } from "../../../../../../lib/video/compute-policy.js";

function sanitizeClip(value,index){
  return {
    id:String(value?.id||`clip-${index+1}`).slice(0,120),
    assetId:value?.assetId||null,
    sourceUrl:typeof value?.sourceUrl==="string"?value.sourceUrl.slice(0,2000):null,
    durationSeconds:Math.max(0.1,Math.min(20,Number(value?.durationSeconds)||1)),
    trimStartSeconds:Math.max(0,Number(value?.trimStartSeconds)||0),
    trimEndSeconds:value?.trimEndSeconds==null?null:Math.max(0,Number(value.trimEndSeconds)||0),
    transition:["cut","fade","crossfade","slide"].includes(value?.transition)?value.transition:"cut",
    style:["realistic","cartoon","mixed"].includes(value?.style)?value.style:"mixed",
    caption:String(value?.caption||"").slice(0,1000),
  };
}

export async function POST(request,{params}){
  try{
    const {id}=await params;
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data:project}=await supabase.from("video_projects").select("id,owner_id,name,device_class,max_duration_seconds,style").eq("id",id).eq("owner_id",user.id).single();
    if(!project)return NextResponse.json({error:"Video project not found."},{status:404});

    const body=await request.json().catch(()=>({}));
    const clips=Array.isArray(body?.clips)?body.clips.slice(0,40).map(sanitizeClip):[];
    if(!clips.length)return NextResponse.json({error:"At least one video clip is required."},{status:400});
    for(const clip of clips){const end=clip.trimEndSeconds??clip.durationSeconds;if(clip.trimStartSeconds>=end)return NextResponse.json({error:`Clip ${clip.id} has an invalid trim range.`},{status:400});}
    const total=clips.reduce((sum,clip)=>sum+Math.max(0.1,(clip.trimEndSeconds??clip.durationSeconds)-clip.trimStartSeconds),0);
    if(total>project.max_duration_seconds+0.01)return NextResponse.json({error:`This project is limited to ${project.max_duration_seconds} seconds on the current experience mode.`},{status:400});

    const policy=getVideoComputePolicy(project.device_class);
    const rendererConfigured=Boolean(String(process.env.VIDEO_RENDER_PROVIDER||"").trim()&&String(process.env.VIDEO_RENDER_ENDPOINT||"").trim());
    const {data:last}=await supabase.from("video_versions").select("version_no").eq("project_id",id).eq("owner_id",user.id).order("version_no",{ascending:false}).limit(1).maybeSingle();
    const versionNo=(last?.version_no||0)+1;
    const editJson={version:1,autoConnected:Boolean(body?.autoConnect!==false),aspectRatio:["9:16","16:9","1:1"].includes(body?.aspectRatio)?body.aspectRatio:"9:16",clips:clips.map((clip,index)=>({...clip,order:index})),audio:{musicAssetId:body?.musicAssetId||null,voiceOverAssetId:body?.voiceOverAssetId||null,normalize:true},branding:{logoAssetId:body?.logoAssetId||null},render:{location:"server",quality:body?.quality==="best"?"best":"balanced",devicePreviewOnly:true,rendererConfigured}};
    const renderStatus=rendererConfigured?"queued":"draft";
    const {data:version,error}=await supabase.from("video_versions").insert({project_id:id,owner_id:user.id,version_no:versionNo,edit_json:editJson,duration_seconds:total,render_status:renderStatus}).select("id,version_no,duration_seconds,render_status,created_at").single();
    if(error)throw error;
    await supabase.from("video_projects").update({edit_json:editJson,status:rendererConfigured?"rendering":"draft",updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id);
    return NextResponse.json({success:true,version,renderPlan:{serverRender:true,rendererConfigured,renderStarted:false,autoConnect:editJson.autoConnected,clipCount:clips.length,durationSeconds:Number(total.toFixed(2)),aspectRatio:editJson.aspectRatio,experience:policy.label,note:rendererConfigured?"Edit version is queued for the configured server renderer. A separate render worker must claim and complete the job before an MP4 can be reported as ready.":"Edit version is saved safely as a draft. No final video renderer is connected yet, so SoolenAI will not claim that an MP4 is rendering or complete."}});
  }catch(error){console.error("VIDEO_COMPILE_ERROR",error);return NextResponse.json({error:error?.message||"Unable to compile video version."},{status:500});}
}
