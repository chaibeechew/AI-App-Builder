import { NextResponse } from "next/server";
import { buildAutonomousPlan } from "../../../lib/build/orchestrator.js";

export async function POST(request){
  try{
    const body=await request.json().catch(()=>({}));
    const idea=String(body?.idea||"").trim();
    if(!idea)return NextResponse.json({error:"Build idea is required."},{status:400});
    if(idea.length>9000)return NextResponse.json({error:"Build idea is too long."},{status:413});
    const plan=buildAutonomousPlan({idea,assetCount:Number(body?.assetCount||0),createVideo:Boolean(body?.createVideo)});
    return NextResponse.json({success:true,plan});
  }catch(error){
    console.error("AUTONOMOUS_ORCHESTRATOR_ERROR",error);
    return NextResponse.json({error:"Unable to prepare the autonomous build plan."},{status:500});
  }
}
