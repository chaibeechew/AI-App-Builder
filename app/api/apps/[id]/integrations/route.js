import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { integrationStatus } from "../../../../../lib/integrations/server.js";

const SECRET_KEY_PATTERN=/(token|secret|password|api.?key|credential|authorization|auth)/i;
function sanitizeConfig(value,depth=0){
  if(depth>4)return null;
  if(Array.isArray(value))return value.slice(0,20).map(v=>sanitizeConfig(v,depth+1)).filter(v=>v!==undefined);
  if(value&&typeof value==="object"){
    const out={};
    for(const [key,val] of Object.entries(value).slice(0,40)){if(SECRET_KEY_PATTERN.test(String(key)))continue;const safe=sanitizeConfig(val,depth+1);if(safe!==undefined)out[String(key).slice(0,100)]=safe;}
    return out;
  }
  if(typeof value==="string")return value.slice(0,2000);
  if(typeof value==="number"||typeof value==="boolean"||value===null)return value;
  return undefined;
}

export async function GET(_request,{params}){
  try{const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});const {data:app}=await supabase.from("apps").select("id,name,owner_id").eq("id",id).eq("owner_id",user.id).single();if(!app)return NextResponse.json({error:"Project not found."},{status:404});const {data:saved}=await supabase.from("project_integrations").select("id,integration_type,display_name,enabled,config,updated_at").eq("app_id",id).eq("owner_id",user.id);return NextResponse.json({success:true,app:{id:app.id,name:app.name},managed:integrationStatus(),project:(saved||[]).filter(item=>item.integration_type!=="sms")});}catch(error){console.error("INTEGRATIONS_GET_ERROR",error);return NextResponse.json({error:"Unable to load integrations."},{status:500});}
}

export async function POST(request,{params}){
  try{const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});const {data:app}=await supabase.from("apps").select("id,owner_id").eq("id",id).eq("owner_id",user.id).single();if(!app)return NextResponse.json({error:"Project not found."},{status:404});const body=await request.json().catch(()=>({}));const type=String(body?.type||"").trim().slice(0,80);if(!["email","calendar","payments","maps","whatsapp"].includes(type))return NextResponse.json({error:"Unsupported integration type."},{status:400});const display={email:"Email Delivery",calendar:"Calendar",payments:"Payments",maps:"Maps",whatsapp:"WhatsApp"}[type];const safeConfig=sanitizeConfig(body?.config&&typeof body.config==="object"?body.config:{});const {data,error}=await supabase.from("project_integrations").upsert({app_id:id,owner_id:user.id,integration_type:type,display_name:display,enabled:body?.enabled!==false,config:safeConfig||{},updated_at:new Date().toISOString()},{onConflict:"app_id,integration_type"}).select("id,integration_type,display_name,enabled,config,updated_at").single();if(error)throw error;return NextResponse.json({success:true,integration:data,note:"Secrets and credential-like fields are recursively removed from project-visible integration config."});}catch(error){console.error("INTEGRATIONS_POST_ERROR",error);return NextResponse.json({error:"Unable to save integration settings."},{status:500});}
}