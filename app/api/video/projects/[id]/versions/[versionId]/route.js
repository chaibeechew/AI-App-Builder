import { NextResponse } from "next/server";
import { createClient } from "../../../../../../../lib/supabase/server.js";
import { checkVideoRenderStatus, getVideoRendererConfig, VideoRenderGatewayError } from "../../../../../../../lib/video/render-gateway.js";

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

export async function GET(_request,{params}){
  try{
    const {id,versionId}=await params;
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
