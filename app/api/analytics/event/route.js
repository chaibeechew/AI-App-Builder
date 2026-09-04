import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin.js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE_EVENTS=new Set(["app_view","website_view","page_view","cta_click","share","install_prompt","record_saved","workflow_started","workflow_completed","game_view"]);
const GAME_RUNTIME_EVENT=/^(?:moba|air_combat|rpg|puzzle|action|strategy|racing|simulation|card|sports|rhythm|survival|shooter|platformer|tower_defense|idle|party|educational|game)_runtime_view$/;
const CHANNELS=new Set(["app","website","game"]);
const FORBIDDEN_FIELDS=["sessionId","session_id","metadata","userId","user_id","deviceId","device_id","ip","path","referrer"];

function normalizeEventName(value){
  const eventName=String(value||"").trim();
  if(BASE_EVENTS.has(eventName))return eventName;
  if(GAME_RUNTIME_EVENT.test(eventName))return "game_view";
  return "";
}

export async function POST(request){
  try{
    const body=await request.json().catch(()=>({}));
    if(FORBIDDEN_FIELDS.some(key=>Object.prototype.hasOwnProperty.call(body,key)))return NextResponse.json({error:"Identifying analytics fields are not accepted."},{status:400});
    const appId=String(body?.appId||"").trim();
    const eventName=normalizeEventName(body?.eventName);
    const requestedChannel=String(body?.channel||"app").trim();
    const channel=CHANNELS.has(requestedChannel)?requestedChannel:"app";
    if(!UUID.test(appId)||!eventName)return NextResponse.json({error:"Invalid analytics event."},{status:400});
    const admin=createAdminClient();
    const {error}=await admin.rpc("server_record_anonymous_analytics_event",{p_app_id:appId,p_event_name:eventName,p_channel:channel});
    if(error)return NextResponse.json({error:"Aggregate event was not accepted."},{status:403});
    return NextResponse.json({success:true,privacy:"anonymous-aggregate-only"});
  }catch(error){
    console.error("ANALYTICS_AGGREGATE_ERROR",error?.code||error?.message||"unknown");
    return NextResponse.json({error:"Unable to record aggregate event."},{status:500});
  }
}
