import { NextResponse } from "next/server";
import { buildAutonomousPlan } from "../../../lib/build/orchestrator.js";
import { buildIdeaPlan,IDEA_PLANNING_LIMITS } from "../../../lib/ai/idea-planning-contract.js";

export async function POST(request){
  try{
    const contentLength=Number(request.headers.get("content-length")||0);
    if(contentLength>16000)return NextResponse.json({error:"Planning request is too large."},{status:413});
    const body=await request.json().catch(()=>({}));
    const idea=String(body?.idea||"").trim();
    if(!idea)return NextResponse.json({error:"Build idea is required."},{status:400});
    if(idea.length>IDEA_PLANNING_LIMITS.MAX_IDEA_LENGTH)return NextResponse.json({error:"Build idea is too long."},{status:413});

    const planning=buildIdeaPlan(idea,{previousPlan:body?.previousPlan||null});
    if(!planning.readyToBuild){
      return NextResponse.json({
        success:false,
        code:"IDEA_NEEDS_DETAILS",
        error:planning.questions?.[0]||"AI needs one more project detail before building.",
        questions:planning.questions,
        planning,
      },{status:422});
    }

    const plan=buildAutonomousPlan({idea:planning.normalizedIdea,assetCount:Math.max(0,Math.min(20,Number(body?.assetCount||0)||0)),createVideo:Boolean(body?.createVideo)});
    return NextResponse.json({success:true,planning,plan,gameAccess:{requiresProfessionalGate:Boolean(planning.gameIntent)}});
  }catch(error){
    console.error("AUTONOMOUS_ORCHESTRATOR_ERROR",error);
    return NextResponse.json({error:"Unable to prepare the autonomous build plan."},{status:500});
  }
}
