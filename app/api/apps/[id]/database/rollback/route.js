import { NextResponse } from "next/server";
import { createClient } from "../../../../../../lib/supabase/server.js";

function stripHistory(schema){const value=schema&&typeof schema==="object"&&!Array.isArray(schema)?schema:{};const {_history,...rest}=value;return rest;}

export async function POST(request,{params}){
  try{
    const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data:app}=await supabase.from("apps").select("id").eq("id",id).eq("owner_id",user.id).single();if(!app)return NextResponse.json({error:"Project not found."},{status:404});
    const body=await request.json().catch(()=>({}));const targetVersion=Number(body?.version);if(!Number.isInteger(targetVersion)||targetVersion<1)return NextResponse.json({error:"A valid data-model version is required."},{status:400});
    const {data:model}=await supabase.from("app_backend_models").select("id,schema_json").eq("app_id",id).eq("owner_id",user.id).maybeSingle();if(!model?.schema_json)return NextResponse.json({error:"No saved data model is available."},{status:404});
    const current=model.schema_json;const history=Array.isArray(current._history)?current._history:[];const target=history.find(x=>Number(x?.version)===targetVersion&&x?.schema&&typeof x.schema==="object");if(!target)return NextResponse.json({error:"That data-model version is no longer available for rollback."},{status:404});
    const nextVersion=Math.max(Number(current.version)||1,...history.map(x=>Number(x?.version)||0))+1;
    const remaining=history.filter(x=>Number(x?.version)!==targetVersion).slice(-7);
    const nextHistory=[...remaining,{version:Number(current.version)||1,savedAt:new Date().toISOString(),schema:stripHistory(current)}].slice(-8);
    const restored={...stripHistory(target.schema),version:nextVersion,providerHidden:true,_history:nextHistory};
    const {data:updated,error}=await supabase.from("app_backend_models").update({schema_json:restored,status:"ready",updated_at:new Date().toISOString()}).eq("id",model.id).eq("app_id",id).eq("owner_id",user.id).select("id,app_id,schema_json,status,updated_at").single();if(error||!updated)throw error||new Error("Unable to restore data model.");
    return NextResponse.json({success:true,model:updated,restoredFrom:targetVersion,newVersion:nextVersion,message:"Data model restored as a new version. The previous current version remains available in rollback history."});
  }catch(error){console.error("DATABASE_ROLLBACK_ERROR",error);return NextResponse.json({error:"Unable to rollback the data model safely."},{status:500});}
}
