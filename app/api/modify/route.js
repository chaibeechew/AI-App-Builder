import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";
import { normalizeAppSpec } from "../../../lib/generator/runtime-guard.js";
import { buildAppExplanation } from "../../../lib/generator/app-explanation.js";
import { selfTestGeneratedApp } from "../../../lib/generator/self-test.js";
import { assessBuildQuality, GENERATION_QUALITY_RULES } from "../../../lib/buildStandards.js";
import { evaluateReleaseReadiness } from "../../../lib/release-readiness.js";
import { generateWithFallback } from "../../../engine/ai-provider.js";
import { buildProjectMemoryBrief, mergeProjectMemory } from "../../../lib/project-memory.js";

const MODIFY_CREDIT_COST = Math.max(1, Number(process.env.APP_MODIFY_CREDIT_COST || 5));

function extractJson(text) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) { try { return JSON.parse(raw.slice(start, end + 1)); } catch {} }
  throw new Error("AI returned invalid JSON.");
}

function normalizeAndTest(raw) {
  const normalized=normalizeAppSpec(raw);
  const selfTest=selfTestGeneratedApp(normalized);
  if(!selfTest.ok)throw new Error(`Modified app failed self-test: ${selfTest.errors.join("; ")}`);
  const specification=selfTest.normalizedSpec;
  return { specification, selfTest, quality: assessBuildQuality(specification) };
}

function qualityRegressed(before,after){
  if(!before||!after)return true;
  if(Number(after.overall||0)<Number(before.overall||0))return true;
  const oldMap=Object.fromEntries((before.dimensions||[]).map(x=>[x.id,Number(x.score||0)]));
  return (after.dimensions||[]).some(x=>Number(x.score||0)<Number(oldMap[x.id]||0));
}

export async function POST(request) {
  let supabase=null, charged=false, chargeRequestId=null;
  try {
    supabase=await createClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return NextResponse.json({error:"Authentication required."},{status:401});
    if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return NextResponse.json({error:"Please verify your email or phone before modifying an app."},{status:403});
    const body=await request.json();
    const instruction=String(body?.instruction||"").trim();
    const specification=body?.specification; const appId=body?.appId||null;
    chargeRequestId=String(body?.requestId||crypto.randomUUID()).trim();
    if(!instruction)return NextResponse.json({error:"Modification instruction is required."},{status:400});
    if(instruction.length>4000)return NextResponse.json({error:"Modification instruction is too long."},{status:413});
    if(!specification)return NextResponse.json({error:"App specification is required."},{status:400});

    let memoryRow=null;
    if(appId){
      const {data:owned,error:e}=await supabase.from("apps").select("id").eq("id",appId).eq("owner_id",user.id).single();
      if(e||!owned)return NextResponse.json({error:"App not found or access denied."},{status:404});
      const {data:memory}=await supabase.from("project_memory").select("memory_json,learning_scope").eq("app_id",appId).eq("owner_id",user.id).maybeSingle();
      memoryRow=memory||null;
    }

    const {data:entitlement,error:entitlementError}=await supabase.rpc("consume_app_builder_entitlement",{p_operation:"modify",p_app_id:appId});
    if(entitlementError)throw entitlementError;
    const entitlementSource=entitlement?.allowed?entitlement.source:null;
    let charge=null;
    if(!entitlement?.allowed){
      const {data:c,error:chargeError}=await supabase.rpc("consume_ai_credits",{p_amount:MODIFY_CREDIT_COST,p_request_id:chargeRequestId,p_description:"AI app modification",p_metadata:{operation:"modify",appId}});
      if(chargeError){if(chargeError.message?.toLowerCase().includes("insufficient credits"))return NextResponse.json({error:"Insufficient credits.",requiredCredits:MODIFY_CREDIT_COST},{status:402});throw chargeError;}
      charge=c;charged=c?.charged!==false;
    }

    const memoryBrief=buildProjectMemoryBrief(memoryRow);
    const currentQuality=assessBuildQuality(normalizeAppSpec(specification));
    const prompt=`You are the modification engine for SoolenAI AI App & Web Creator. Modify the existing app according to this instruction:\n"${instruction}"\n${memoryBrief?`\n${memoryBrief}\n`:""}\n\nNON-NEGOTIABLE QUALITY STANDARD:\n${GENERATION_QUALITY_RULES}\n\nCurrent specification:\n${JSON.stringify(specification,null,2)}\nReturn ONLY valid JSON with name, description, designSystem, pages, features, dataModels and actions. Preserve existing functionality and remembered project preferences unless the customer's current instruction explicitly changes them. Do not silently remove authentication, permissions, privacy, validation, loading/error states, responsive behavior or accessibility protections. Never reuse private assets across customers. No markdown.`;
    const ai = await generateWithFallback(prompt);
    let candidate=normalizeAndTest(extractJson(ai.result));
    let qualityRepairApplied=false;

    if(qualityRegressed(currentQuality,candidate.quality)){
      const repairPrompt=`You are SoolenAI Quality Repair. The requested edit is valid, but the candidate version reduced deterministic release quality compared with the previous saved specification. Repair the candidate while preserving the customer's requested change and every working feature.\n\nCUSTOMER REQUEST:\n${instruction}\n\nQUALITY STANDARD:\n${GENERATION_QUALITY_RULES}\n\nPREVIOUS QUALITY:\n${JSON.stringify(currentQuality)}\n\nCANDIDATE QUALITY:\n${JSON.stringify(candidate.quality)}\n\nCANDIDATE SPECIFICATION:\n${JSON.stringify(candidate.specification)}\n\nReturn ONLY the complete repaired JSON specification. Do not invent compliance claims or remove functionality.`;
      const repairedAI=await generateWithFallback(repairPrompt);
      const repaired=normalizeAndTest(extractJson(repairedAI.result));
      if(qualityRegressed(currentQuality,repaired.quality)){
        throw new Error("AI edit was not saved because it would reduce the project's release quality. Try a more specific change.");
      }
      candidate=repaired;
      qualityRepairApplied=true;
    }

    const finalSpec=candidate.specification;
    const test=candidate.selfTest;
    const finalQuality=candidate.quality;
    const finalReadiness=evaluateReleaseReadiness(finalQuality);
    let savedVersion=null;
    if(appId){
      const {data:latest,error:latestError}=await supabase.from("app_versions").select("version_no").eq("app_id",appId).order("version_no",{ascending:false}).limit(1).maybeSingle();
      if(latestError)throw latestError;
      const nextVersion=(latest?.version_no||0)+1;
      const {data:version,error:versionError}=await supabase.from("app_versions").insert({app_id:appId,version_no:nextVersion,specification:finalSpec,change_summary:instruction,created_by:user.id}).select("id,version_no,created_at").single();
      if(versionError)throw versionError; savedVersion=version;
      const {error:updateError}=await supabase.from("apps").update({name:String(finalSpec.name||"Untitled App"),description:String(finalSpec.description||""),current_version_id:version.id}).eq("id",appId).eq("owner_id",user.id);
      if(updateError)throw updateError;
      const nextMemory=mergeProjectMemory(memoryRow?.memory_json,{requestedName:finalSpec.name,lastModificationAt:new Date().toISOString(),lastModificationInstruction:instruction});
      const {error:memoryError}=await supabase.from("project_memory").upsert({app_id:appId,owner_id:user.id,memory_json:nextMemory,learning_scope:memoryRow?.learning_scope||"project_only",updated_at:new Date().toISOString()},{onConflict:"app_id"});
      if(memoryError)console.warn("PROJECT_MEMORY_MODIFY_SAVE_ERROR",memoryError.message);
    }
    return NextResponse.json({success:true,provider:ai.provider,specification:finalSpec,appId,version:savedVersion,projectMemory:{applied:Boolean(memoryBrief),updated:Boolean(appId)},explanation:buildAppExplanation(finalSpec),selfTest:test,quality:{before:currentQuality,after:finalQuality,repairApplied:qualityRepairApplied,releaseReadiness:finalReadiness},entitlement:{source:entitlementSource,charged},credits:{charged:charged?MODIFY_CREDIT_COST:0,requestId:chargeRequestId,balance:charge?.balance??null}});
  }catch(error){
    console.error("Modify API error:",error);
    if(supabase&&charged&&chargeRequestId)await supabase.rpc("refund_ai_credits",{p_request_id:chargeRequestId,p_amount:MODIFY_CREDIT_COST,p_description:"AI modification failed - automatic refund",p_metadata:{operation:"modify"}});
    const message=String(error?.message||"");
    if(message.includes("would reduce the project's release quality"))return NextResponse.json({error:message},{status:409});
    return NextResponse.json({error:"Unable to modify the app. Any charged credits were automatically refunded."},{status:500});
  }
}
