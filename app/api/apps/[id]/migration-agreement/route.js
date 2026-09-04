import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}

export async function GET(_request,{params}){
  try{
    const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return json({error:"Authentication required."},401);
    const {data,error}=await supabase.rpc("get_project_migration_agreement",{p_app_id:id});
    if(error){if(String(error.message||"").toLowerCase().includes("not found"))return json({error:"Project not found."},404);throw error;}
    return json(data);
  }catch(error){console.error("MIGRATION_AGREEMENT_GET_ERROR",error?.code||error?.message||"unknown");return json({error:"Unable to load migration agreement."},500);}
}

export async function POST(request,{params}){
  try{
    const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return json({error:"Authentication required."},401);
    const body=await request.json().catch(()=>({}));
    if(body?.acknowledge10Percent!==true||body?.acknowledgeContinuingShare!==true||body?.acknowledgeCustomerOwnership!==true)return json({error:"All migration agreement acknowledgements are required."},400);
    const termsVersion=String(body?.termsVersion||"LANERIQ-PORTABILITY-10PCT-v1").trim();
    const {data,error}=await supabase.rpc("sign_project_migration_agreement",{p_app_id:id,p_terms_version:termsVersion,p_acknowledge_10_percent:true});
    if(error){const m=String(error.message||"").toLowerCase();if(m.includes("after publish")||m.includes("not found"))return json({error:error.message},409);throw error;}
    return json({...data,notice:"You keep ownership and may migrate the project externally. The signed 10% project software revenue-share obligation continues after migration."});
  }catch(error){console.error("MIGRATION_AGREEMENT_POST_ERROR",error?.code||error?.message||"unknown");return json({error:"Unable to sign migration agreement."},500);}
}
