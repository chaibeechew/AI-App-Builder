import { NextResponse } from "next/server";
import { createClient } from "../../../../../../lib/supabase/server.js";
import { getVideoComputePolicy } from "../../../../../../lib/video/compute-policy.js";
import { checkVideoRenderStatus, getVideoRendererConfig, startVideoRender, VideoRenderGatewayError } from "../../../../../../lib/video/render-gateway.js";

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

function publicVersion(row){
  const render=row?.edit_json?.render||{};
  return {
    id:row?.id,
    version_no:row?.version_no,
    duration_seconds:row?.duration_seconds,
    render_status:row?.render_status,
    output_path:row?.output_path||null,
    provider:render.provider||null,
    jobId:render.jobId||null,
    created_at:row?.created_at,
  };
}

export async function GET(request,{params}){
  try{
    const {id}=await params;
    const versionId=String(new URL(request.url).searchParams.get("versionId")||"").trim();
    if(!versionId)return NextResponse.json({error:"Video version id is required."},{status:400});
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data:project}=await supabase.from("video_projects").select("id,status").eq("id",id).eq("owner_id",user.id).maybeSingle();
    if(!project)return NextResponse.json({error:"Video project not found."},{status:404});
    const {data:version,error}=await supabase.from("video_versions").select("id,project_id,owner_id,version_no,duration_seconds,render_status,output_path,edit_json,created_at").eq("id",versionId).eq("project_id",id).eq("owner_id",user.id).maybeSingle();
    if(error)throw error;
    if(!version)return NextResponse.json({error:"Video version not found."},{status:404});

    if(["completed","failed","draft"].includes(version.render_status))return NextResponse.json({success:true,checked:false,version:publicVersion(version)});
    const render=version.edit_json?.render||{};
    const renderer=getVideoRendererConfig();
    if(!renderer.configured||!renderer.statusEndpoint||!render.jobId)return NextResponse.json({success:true,checked:false,version:publicVersion(version),note:"This renderer has not provided a status-check connection yet."});

    const checked=await checkVideoRenderStatus({jobId:render.jobId});
    if(!checked.checked)return NextResponse.json({success:true,checked:false,version:publicVersion(version)});
    const nextStatus=checked.status||version.render_status;
    const nextOutput=checked.outputPath||version.output_path||null;
    const nextJson={...version.edit_json,render:{...render,status:nextStatus,outputPath:nextOutput,lastCheckedAt:new Date().toISOString(),completedAt:nextStatus==="completed"?new Date().toISOString():render.completedAt||null}};
    const {data:updated,error:updateError}=await supabase.from("video_versions").update({render_status:nextStatus,output_path:nextOutput,edit_json:nextJson}).eq("id",version.id).eq("project_id",id).eq("owner_id",user.id).select("id,version_no,duration_seconds,render_status,output_path,edit_json,created_at").single();
    if(updateError)throw updateError;
    const projectStatus=nextStatus==="completed"?"completed":nextStatus==="failed"?"failed":"rendering";
    await supabase.from("video_projects").update({status:projectStatus,edit_json:nextJson,updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id);
    return NextResponse.json({success:true,checked:true,version:publicVersion(updated)});
  }catch(error){
    console.error("VIDEO_RENDER_STATUS_ERROR",error?.code||error?.name||"unknown");
    if(error instanceof VideoRenderGatewayError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});
    return NextResponse.json({error:"Unable to check this video render."},{status:500});
  }
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
    const renderer=getVideoRendererConfig();
    const rendererConfigured=renderer.configured;
    const {data:last}=await supabase.from("video_versions").select("version_no").eq("project_id",id).eq("owner_id",user.id).order("version_no",{ascending:false}).limit(1).maybeSingle();
    const versionNo=(last?.version_no||0)+1;
    let editJson={version:1,autoConnected:Boolean(body?.autoConnect!==false),aspectRatio:["9:16","16:9","1:1"].includes(body?.aspectRatio)?body.aspectRatio:"9:16",clips:clips.map((clip,index)=>({...clip,order:index})),audio:{musicAssetId:body?.musicAssetId||null,voiceOverAssetId:body?.voiceOverAssetId||null,normalize:true},branding:{logoAssetId:body?.logoAssetId||null},render:{location:"server",quality:body?.quality==="best"?"best":"balanced",devicePreviewOnly:true,rendererConfigured,provider:rendererConfigured?renderer.provider:null,jobId:null,status:rendererConfigured?"queued":"draft",outputPath:null}};
    const initialRenderStatus=rendererConfigured?"queued":"draft";
    const {data:version,error}=await supabase.from("video_versions").insert({project_id:id,owner_id:user.id,version_no:versionNo,edit_json:editJson,duration_seconds:total,render_status:initialRenderStatus}).select("id,version_no,duration_seconds,render_status,created_at").single();
    if(error)throw error;

    if(!rendererConfigured){
      await supabase.from("video_projects").update({edit_json:editJson,status:"draft",updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id);
      return NextResponse.json({success:true,version,renderPlan:{serverRender:true,rendererConfigured:false,renderStarted:false,provider:null,jobId:null,outputPath:null,status:"draft",autoConnect:editJson.autoConnected,clipCount:clips.length,durationSeconds:Number(total.toFixed(2)),aspectRatio:editJson.aspectRatio,experience:policy.label,note:"Edit version is saved safely as a draft. No final video renderer is connected yet, so LANERIQ AI will not claim that an MP4 is rendering or complete."}});
    }

    try{
      const render=await startVideoRender({project,version,editJson});
      editJson={...editJson,render:{...editJson.render,provider:render.provider,jobId:render.jobId,status:render.status,outputPath:render.outputPath,startedAt:new Date().toISOString()}};
      const projectStatus=render.status==="completed"?"completed":render.status==="failed"?"failed":"rendering";
      const {error:versionUpdateError}=await supabase.from("video_versions").update({edit_json:editJson,render_status:render.status,output_path:render.outputPath}).eq("id",version.id).eq("project_id",id).eq("owner_id",user.id);
      if(versionUpdateError)throw versionUpdateError;
      await supabase.from("video_projects").update({edit_json:editJson,status:projectStatus,updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id);
      return NextResponse.json({success:true,version:{...version,render_status:render.status,output_path:render.outputPath},renderPlan:{serverRender:true,rendererConfigured:true,renderStarted:true,provider:render.provider,jobId:render.jobId,outputPath:render.outputPath,status:render.status,autoConnect:editJson.autoConnected,clipCount:clips.length,durationSeconds:Number(total.toFixed(2)),aspectRatio:editJson.aspectRatio,experience:policy.label,note:render.status==="completed"?"Final MP4 output is ready.":"The configured server renderer accepted this version and returned a real render job. Status can now be checked until the MP4 is complete."}});
    }catch(renderError){
      const failedJson={...editJson,render:{...editJson.render,status:"failed",failedAt:new Date().toISOString(),errorCode:renderError?.code||"VIDEO_RENDER_FAILED"}};
      await supabase.from("video_versions").update({edit_json:failedJson,render_status:"failed"}).eq("id",version.id).eq("project_id",id).eq("owner_id",user.id);
      await supabase.from("video_projects").update({edit_json:failedJson,status:"failed",updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id);
      const status=renderError instanceof VideoRenderGatewayError?renderError.status:502;
      return NextResponse.json({success:false,error:renderError?.message||"The video edit was saved, but the configured renderer could not start.",code:renderError?.code||"VIDEO_RENDER_FAILED",version:{...version,render_status:"failed"},renderPlan:{serverRender:true,rendererConfigured:true,renderStarted:false,provider:renderer.provider,status:"failed",autoConnect:editJson.autoConnected,clipCount:clips.length,durationSeconds:Number(total.toFixed(2)),aspectRatio:editJson.aspectRatio,experience:policy.label,note:"The edit version is preserved, but final rendering failed to start. No MP4 is reported as ready."}},{status});
    }
  }catch(error){console.error("VIDEO_COMPILE_ERROR",error);return NextResponse.json({error:error?.message||"Unable to compile video version."},{status:500});}
}
