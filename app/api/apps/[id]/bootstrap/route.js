import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { buildAutonomousPlan } from "../../../../../lib/build/orchestrator.js";

function featureText(spec){
  const pages=Array.isArray(spec?.pages)?spec.pages:[];
  const features=Array.isArray(spec?.features)?spec.features:[];
  return [spec?.name,spec?.description,...pages.flatMap(p=>[p?.name,p?.purpose,p?.description]),...features.flatMap(f=>[typeof f==="string"?f:f?.name,typeof f==="string"?"":f?.description])].filter(Boolean).join(" ").toLowerCase();
}
function entity(name,fields,note){return {name,fields,note,access:"owner-scoped by default"};}
function suggestedSchema(spec){
  const text=featureText(spec);const entities=[entity("users",["id: uuid","display_name: text","email: text","created_at: timestamptz"],"Account profile only; authentication secrets are never stored here.")];
  const add=(terms,value)=>{if(terms.some(k=>text.includes(k))&&!entities.some(e=>e.name===value.name))entities.push(value)};
  add(["customer","client","crm","lead","contact"],entity("customers",["id: uuid","owner_id: uuid","name: text","email: text","phone: text","status: text","created_at: timestamptz"],"Private customer records with explicit ownership."));
  add(["property","listing","real estate","house","unit"],entity("properties",["id: uuid","owner_id: uuid","title: text","price: numeric","status: text","location: text","created_at: timestamptz"],"Property inventory or listings."));
  add(["booking","appointment","reservation","schedule"],entity("appointments",["id: uuid","owner_id: uuid","customer_id: uuid?","starts_at: timestamptz","status: text","notes: text"],"Bookings and appointments with ownership checks."));
  add(["product","store","ecommerce","shop","inventory"],entity("products",["id: uuid","owner_id: uuid","name: text","price: numeric","stock_qty: integer","status: text"],"Product catalog with stock state."));
  add(["order","checkout","purchase"],entity("orders",["id: uuid","owner_id: uuid","customer_id: uuid?","total: numeric","status: text","created_at: timestamptz"],"Order records; payment credentials remain with payment providers."));
  add(["document","file","asset","photo","video","upload"],entity("assets",["id: uuid","owner_id: uuid","storage_path: text","mime_type: text","size_bytes: bigint","created_at: timestamptz"],"Metadata only; file bytes stay in private object storage."));
  if(entities.length===1)entities.push(entity("records",["id: uuid","owner_id: uuid","title: text","status: text","metadata: jsonb","created_at: timestamptz"],"Flexible starter record for the app's main business object."));
  return {version:1,providerHidden:true,entities,relationships:[],policies:["Private by default","Users access only rows they own unless explicitly shared","Sensitive writes require server-side validation","No API keys, passwords or payment credentials in generated tables"]};
}

export async function POST(request,{params}){
  try{
    const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data:app}=await supabase.from("apps").select("id,name,current_version_id,source_prompt").eq("id",id).eq("owner_id",user.id).single();
    if(!app?.current_version_id)return NextResponse.json({error:"Saved project required."},{status:404});
    const {data:version}=await supabase.from("app_versions").select("specification").eq("id",app.current_version_id).eq("app_id",id).single();
    const body=await request.json().catch(()=>({}));
    const plan=body?.plan&&typeof body.plan==="object"?body.plan:buildAutonomousPlan({idea:String(app.source_prompt||version?.specification?.description||app.name),assetCount:Number(body?.assetCount||0),createVideo:Boolean(body?.createVideo)});
    const results={database:null,workflows:[],video:null};

    if(plan?.modules?.database){
      const schema=suggestedSchema(version?.specification||{});
      const {data,error}=await supabase.from("app_backend_models").upsert({app_id:id,owner_id:user.id,schema_json:schema,status:"ready",updated_at:new Date().toISOString()},{onConflict:"app_id"}).select("id,status").single();
      results.database=error?{status:"failed",message:error.message}:{status:"ready",id:data.id};
    }

    if(plan?.modules?.workflows&&Array.isArray(plan.workflows)){
      const {data:existing}=await supabase.from("app_workflows").select("name").eq("app_id",id).eq("owner_id",user.id);
      const names=new Set((existing||[]).map(x=>x.name));
      for(const workflow of plan.workflows.slice(0,5)){
        if(names.has(workflow.name)){results.workflows.push({name:workflow.name,status:"existing"});continue;}
        const {data,error}=await supabase.from("app_workflows").insert({app_id:id,owner_id:user.id,name:workflow.name,trigger_type:workflow.triggerType,trigger_config:{},actions:workflow.actions,enabled:true}).select("id,name").single();
        results.workflows.push(error?{name:workflow.name,status:"failed",message:error.message}:{name:data.name,status:"ready",id:data.id});
      }
    }

    if(plan?.modules?.video){
      const {data:existingVideo}=await supabase.from("video_projects").select("id,name,status").eq("app_id",id).eq("owner_id",user.id).limit(1).maybeSingle();
      if(existingVideo)results.video={status:"existing",id:existingVideo.id};
      else{
        const style=["realistic","cartoon","mixed"].includes(plan?.video?.style)?plan.video.style:"realistic";
        const {data,error}=await supabase.from("video_projects").insert({owner_id:user.id,app_id:id,name:`${app.name} Promo Video`,style,device_class:"auto",max_duration_seconds:60,edit_json:{tracks:[],settings:{aspectRatio:"9:16",autoConnect:true,serverRender:true}},status:"draft"}).select("id,status").single();
        results.video=error?{status:"failed",message:error.message}:{status:"ready",id:data.id};
      }
    }

    return NextResponse.json({success:true,plan,results,note:"Heavy rendering and external delivery remain server-managed and only execute when the required managed integration is available."});
  }catch(error){console.error("AUTONOMOUS_BOOTSTRAP_ERROR",error);return NextResponse.json({error:error?.message||"Unable to bootstrap generated modules."},{status:500});}
}
