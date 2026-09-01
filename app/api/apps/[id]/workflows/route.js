import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

const SECRET_KEY_PATTERN=/(token|secret|password|api.?key|credential|authorization|auth)/i;
const SAFE_TRIGGERS=new Set(["form_submitted","appointment_created","order_created"]);
const SAFE_ACTIONS=new Set(["save_crm","save_order","notify_team","send_email","send_sms","send_whatsapp","calendar"]);

function sanitizeObject(value,depth=0){
  if(depth>4)return null;
  if(Array.isArray(value))return value.slice(0,20).map(v=>sanitizeObject(v,depth+1));
  if(value&&typeof value==="object"){
    const out={};
    for(const [key,val] of Object.entries(value).slice(0,40)){
      if(SECRET_KEY_PATTERN.test(String(key)))continue;
      out[String(key).slice(0,100)]=sanitizeObject(val,depth+1);
    }
    return out;
  }
  if(typeof value==="string")return value.slice(0,2000);
  if(typeof value==="number"||typeof value==="boolean"||value===null)return value;
  return null;
}
function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"no-store"}});}
async function ownedApp(supabase,id,userId){const {data}=await supabase.from("apps").select("id,name,owner_id").eq("id",id).eq("owner_id",userId).single();return data;}

export async function GET(_request,{params}){
  try{
    const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return json({error:"Authentication required."},401);
    const app=await ownedApp(supabase,id,user.id);if(!app)return json({error:"Project not found."},404);
    const {data,error}=await supabase.from("app_workflows").select("id,name,trigger_type,trigger_config,actions,enabled,created_at,updated_at").eq("app_id",id).eq("owner_id",user.id).order("created_at",{ascending:true});
    if(error)throw error;
    return json({success:true,app:{id:app.id,name:app.name},workflows:data||[]});
  }catch(error){console.error("WORKFLOWS_GET_ERROR",error);return json({error:"Unable to load workflows."},500);}
}

export async function POST(request,{params}){
  try{
    const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return json({error:"Authentication required."},401);
    const app=await ownedApp(supabase,id,user.id);if(!app)return json({error:"Project not found."},404);
    const body=await request.json().catch(()=>({}));
    const name=String(body?.name||"").trim().slice(0,120),triggerType=String(body?.triggerType||"").trim().slice(0,80),actions=Array.isArray(body?.actions)?body.actions.slice(0,12):[];
    if(!name||!triggerType||!actions.length)return json({error:"Workflow name, trigger and at least one action are required."},400);
    if(!SAFE_TRIGGERS.has(triggerType))return json({error:"Unsupported workflow trigger."},400);
    if(actions.some(action=>!SAFE_ACTIONS.has(String(action?.type||""))))return json({error:"Unsupported workflow action."},400);
    const safeActions=actions.map(a=>({type:String(a?.type||"").slice(0,80),label:String(a?.label||"").slice(0,180),config:sanitizeObject(a?.config&&typeof a.config==="object"?a.config:{})||{}}));
    const triggerConfig=sanitizeObject(body?.triggerConfig&&typeof body.triggerConfig==="object"?body.triggerConfig:{})||{};
    const {data,error}=await supabase.from("app_workflows").insert({app_id:id,owner_id:user.id,name,trigger_type:triggerType,trigger_config:triggerConfig,actions:safeActions,enabled:body?.enabled!==false}).select("id,name,trigger_type,trigger_config,actions,enabled,created_at,updated_at").single();
    if(error)throw error;
    return json({success:true,workflow:data,note:"Only supported triggers/actions are saved. Credential-like fields are removed from workflow configuration."});
  }catch(error){console.error("WORKFLOWS_POST_ERROR",error);return json({error:"Unable to save workflow."},500);}
}
