import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

async function ownedApp(supabase,id,userId){
  const {data}=await supabase.from("apps").select("id,name,owner_id").eq("id",id).eq("owner_id",userId).single();
  return data;
}

export async function GET(_request,{params}){
  try{
    const {id}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const app=await ownedApp(supabase,id,user.id); if(!app)return NextResponse.json({error:"Project not found."},{status:404});
    const {data,error}=await supabase.from("app_workflows").select("id,name,trigger_type,trigger_config,actions,enabled,created_at,updated_at").eq("app_id",id).eq("owner_id",user.id).order("created_at",{ascending:true});
    if(error)throw error;
    return NextResponse.json({success:true,app:{id:app.id,name:app.name},workflows:data||[]});
  }catch(error){console.error("WORKFLOWS_GET_ERROR",error);return NextResponse.json({error:"Unable to load workflows."},{status:500});}
}

export async function POST(request,{params}){
  try{
    const {id}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const app=await ownedApp(supabase,id,user.id); if(!app)return NextResponse.json({error:"Project not found."},{status:404});
    const body=await request.json().catch(()=>({}));
    const name=String(body?.name||"").trim().slice(0,120); const triggerType=String(body?.triggerType||"").trim().slice(0,80); const actions=Array.isArray(body?.actions)?body.actions.slice(0,12):[];
    if(!name||!triggerType||!actions.length)return NextResponse.json({error:"Workflow name, trigger and at least one action are required."},{status:400});
    const safeActions=actions.map((a)=>({type:String(a?.type||"").slice(0,80),label:String(a?.label||"").slice(0,180),config:a?.config&&typeof a.config==="object"?a.config:{}})).filter(a=>a.type);
    const {data,error}=await supabase.from("app_workflows").insert({app_id:id,owner_id:user.id,name,trigger_type:triggerType,trigger_config:body?.triggerConfig&&typeof body.triggerConfig==="object"?body.triggerConfig:{},actions:safeActions,enabled:body?.enabled!==false}).select("id,name,trigger_type,trigger_config,actions,enabled,created_at,updated_at").single();
    if(error)throw error;
    return NextResponse.json({success:true,workflow:data});
  }catch(error){console.error("WORKFLOWS_POST_ERROR",error);return NextResponse.json({error:"Unable to save workflow."},{status:500});}
}
