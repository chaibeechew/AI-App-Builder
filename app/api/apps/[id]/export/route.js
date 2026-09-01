import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

export async function GET(_request,{params}){
  try{
    const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data:app}=await supabase.from("apps").select("id,name,description,created_at,updated_at,current_version_id,visibility,publish_status,owner_id").eq("id",id).eq("owner_id",user.id).single();if(!app)return NextResponse.json({error:"Project not found."},{status:404});
    const [{data:versions},{data:backend},{data:workflows},{data:assets},{data:integrations},{data:offers},{data:memory}]=await Promise.all([
      supabase.from("app_versions").select("id,version_no,specification,change_summary,created_at").eq("app_id",id).order("version_no",{ascending:true}),
      supabase.from("app_backend_models").select("schema_json,status,updated_at").eq("app_id",id).eq("owner_id",user.id).maybeSingle(),
      supabase.from("app_workflows").select("name,trigger_type,trigger_config,actions,enabled,created_at,updated_at").eq("app_id",id).eq("owner_id",user.id),
      supabase.from("project_assets").select("asset_id,suggested_page,suggested_role,placement_reason,created_at").eq("app_id",id).eq("owner_id",user.id),
      supabase.from("project_integrations").select("integration_type,display_name,enabled,config,updated_at").eq("app_id",id).eq("owner_id",user.id),
      supabase.from("monetization_offers").select("name,description,amount,currency,billing_mode,enabled,created_at").eq("app_id",id).eq("owner_id",user.id),
      supabase.from("project_memory").select("memory_json,learning_scope,updated_at").eq("app_id",id).eq("owner_id",user.id).maybeSingle()
    ]);
    const payload={format:"laneriq-ai-project-export-v1",exportedAt:new Date().toISOString(),ownership:{ownerUserId:user.id,projectId:app.id},project:{id:app.id,name:app.name,description:app.description,createdAt:app.created_at,updatedAt:app.updated_at,visibility:app.visibility,publishStatus:app.publish_status,currentVersionId:app.current_version_id},versions:versions||[],dataModel:backend||null,workflows:workflows||[],assetPlacements:assets||[],integrations:(integrations||[]).map(x=>({...x,note:"No provider secret or API key is included in exports."})),monetization:offers||[],projectLearning:memory||null};
    const safe=(app.name||"project").replace(/[^a-zA-Z0-9_-]+/g,"-").slice(0,80)||"project";
    return new NextResponse(JSON.stringify(payload,null,2),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${safe}-LANERIQ-AI-export.json"`,"Cache-Control":"no-store"}});
  }catch(error){console.error("PROJECT_EXPORT_ERROR",error);return NextResponse.json({error:"Unable to export this project."},{status:500});}
}
