import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}

export async function GET(){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return json({authenticated:false,showButton:false},401);
    const {data,error}=await supabase.rpc("get_creator_support_status");
    if(error)throw error;
    const showButton=Boolean(data?.freeAccessUsed&&data?.hasUnfinishedProject);
    return json({...data,showButton});
  }catch(error){
    console.error("CREATOR_SUPPORT_STATUS_ERROR",error?.code||error?.message||"unknown");
    return json({error:"Unable to load Creator Support status."},500);
  }
}

export async function POST(request){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return json({error:"Authentication required."},401);
    const body=await request.json().catch(()=>({}));
    const action=String(body?.action||"");
    if(action==="request"){
      const reason=String(body?.reason||"").trim().slice(0,800);
      const individualAttested=body?.individualAttested===true;
      const {data,error}=await supabase.rpc("request_creator_support",{p_reason:reason||null,p_individual_attested:individualAttested});
      if(error){
        const m=String(error.message||"").toLowerCase();
        if(m.includes("individual")||m.includes("unfinished")||m.includes("already")||m.includes("first free"))return json({error:error.message},409);
        throw error;
      }
      return json(data);
    }
    if(action==="redeem"){
      const code=String(body?.code||"").trim().toUpperCase();
      if(!/^CREATOR-[A-F0-9]{12}$/.test(code))return json({error:"Invalid Creator Support code."},400);
      const {data,error}=await supabase.rpc("redeem_creator_support_code",{p_code:code});
      if(error){
        const m=String(error.message||"").toLowerCase();
        if(m.includes("invalid")||m.includes("expired")||m.includes("revoked")||m.includes("already"))return json({error:error.message},409);
        throw error;
      }
      return json(data);
    }
    return json({error:"Unsupported Creator Support action."},400);
  }catch(error){
    console.error("CREATOR_SUPPORT_ACTION_ERROR",error?.code||error?.message||"unknown");
    return json({error:"Unable to complete Creator Support action."},500);
  }
}
