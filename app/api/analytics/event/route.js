import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

const ALLOWED=new Set(["app_view","website_view","page_view","cta_click","share","install_prompt","record_saved","workflow_started","workflow_completed"]);
function cleanMetadata(value){
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  const out={};for(const [key,val] of Object.entries(value).slice(0,20)){if(typeof val==="string")out[String(key).slice(0,60)]=val.slice(0,500);else if(typeof val==="number"||typeof val==="boolean")out[String(key).slice(0,60)]=val;}return out;
}

export async function POST(request){
  try{
    const body=await request.json().catch(()=>({}));const appId=String(body?.appId||"").trim();const eventName=String(body?.eventName||"").trim();const channel=body?.channel==="website"?"website":"app";
    if(!appId||!ALLOWED.has(eventName))return NextResponse.json({error:"Invalid analytics event."},{status:400});
    const supabase=await createClient();
    const sessionId=String(body?.sessionId||"").trim().slice(0,100)||null;
    const {error}=await supabase.from("analytics_events").insert({app_id:appId,event_name:eventName,channel,session_id:sessionId,metadata:cleanMetadata(body?.metadata)});
    if(error)return NextResponse.json({error:"Event was not accepted."},{status:403});
    return NextResponse.json({success:true});
  }catch(error){console.error("ANALYTICS_EVENT_ERROR",error);return NextResponse.json({error:"Unable to record event."},{status:500});}
}
