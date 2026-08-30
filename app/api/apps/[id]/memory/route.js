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
    const {data:memory}=await supabase.from("project_memory").select("id,memory_json,learning_scope,updated_at").eq("app_id",id).eq("owner_id",user.id).maybeSingle();
    return NextResponse.json({success:true,app:{id:app.id,name:app.name},memory:memory||null});
  }catch(error){console.error("PROJECT_MEMORY_GET_ERROR",error);return NextResponse.json({error:"Unable to load project memory."},{status:500});}
}

export async function POST(request,{params}){
  try{
    const {id}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const app=await ownedApp(supabase,id,user.id); if(!app)return NextResponse.json({error:"Project not found."},{status:404});
    const body=await request.json().catch(()=>({}));
    const memory={brandPreferences:body?.memory?.brandPreferences||{},userPreferences:body?.memory?.userPreferences||{},workflowPreferences:body?.memory?.workflowPreferences||{},contentGuidance:String(body?.memory?.contentGuidance||"").slice(0,6000),learnedFrom:["customer instructions","approved project changes","customer-owned references"],rawPrivateAssetsReusableAcrossCustomers:false};
    const scope=body?.learningScope==="anonymized_patterns"?"anonymized_patterns":"project_only";
    const {data,error}=await supabase.from("project_memory").upsert({app_id:id,owner_id:user.id,memory_json:memory,learning_scope:scope,updated_at:new Date().toISOString()},{onConflict:"app_id"}).select("id,memory_json,learning_scope,updated_at").single();
    if(error)throw error;
    return NextResponse.json({success:true,memory:data});
  }catch(error){console.error("PROJECT_MEMORY_POST_ERROR",error);return NextResponse.json({error:"Unable to save project memory."},{status:500});}
}
