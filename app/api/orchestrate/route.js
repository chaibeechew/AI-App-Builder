import { NextResponse } from "next/server";
import { buildAutonomousPlan } from "../../../lib/build/orchestrator.js";
import { buildIdeaPlan,IDEA_PLANNING_LIMITS } from "../../../lib/ai/idea-planning-contract.js";
import { resolveTemplateGenerationGuidance, templatePlanningBrief } from "../../../lib/build/template-generation-guidance.js";

export async function POST(request){
  try{
    const contentLength=Number(request.headers.get("content-length")||0);
    if(contentLength>16000)return NextResponse.json({error:"Planning request is too large."},{status:413});
    const body=await request.json().catch(()=>({}));
    const idea=String(body?.idea||"").trim();
    if(!idea)return NextResponse.json({error:"Build idea is required."},{status:400});
    if(idea.length>IDEA_PLANNING_LIMITS.MAX_IDEA_LENGTH)return NextResponse.json({error:"Build idea is too long."},{status:413});

    // Readiness is recomputed from the current customer message. Client-supplied plan history cannot self-authorize a build.
    const planning=buildIdeaPlan(idea);
    if(!planning.readyToBuild){
      return NextResponse.json({
        success:false,
        code:"IDEA_NEEDS_DETAILS",
        error:planning.questions?.[0]||"AI needs one more project detail before building.",
        questions:planning.questions,
        planning,
      },{status:422});
    }

    // Template context is re-resolved server-side against LANERIQ's canonical 3,000-template catalog.
    // The client cannot promote a copied brand/layout or arbitrary template payload into trusted generation guidance.
    const templateGuidance=resolveTemplateGenerationGuidance(idea);
    const orchestrationIdea=[planning.normalizedIdea,templatePlanningBrief(templateGuidance)].filter(Boolean).join("\n\n");
    const plan=buildAutonomousPlan({idea:orchestrationIdea,assetCount:Math.max(0,Math.min(20,Number(body?.assetCount||0)||0)),createVideo:Boolean(body?.createVideo)});
    const resolvedPlan=templateGuidance?{...plan,templateGuidance}:plan;
    return NextResponse.json({success:true,planning,plan:resolvedPlan,templateGuidance:templateGuidance||null,gameAccess:{requiresProfessionalGate:Boolean(planning.gameIntent)}});
  }catch(error){
    console.error("AUTONOMOUS_ORCHESTRATOR_ERROR",error);
    return NextResponse.json({error:"Unable to prepare the autonomous build plan."},{status:500});
  }
}
