import { NextResponse } from "next/server";
import { runAutonomousEngine } from "../../../engine/autonomous-engine.js";
import { runSoolenAdultMode } from "../../../lib/soolen/adult-engine.js";
import { normalizeAppSpec } from "../../../lib/generator/runtime-guard.js";
import { buildAppExplanation } from "../../../lib/generator/app-explanation.js";
import { selfTestGeneratedApp } from "../../../lib/generator/self-test.js";
import { verifyGeneratedAppExecution, buildRepairInstruction } from "../../../lib/generator/execution-verifier.js";
import { createClient } from "../../../lib/supabase/server.js";

const GENERATE_CREDIT_COST=Math.max(1,Number(process.env.APP_GENERATE_CREDIT_COST||10));

function verifyGeneration(result){
  const normalized=normalizeAppSpec(result?.specification);
  const selfTest=selfTestGeneratedApp(normalized);
  const execution=verifyGeneratedAppExecution(selfTest.normalizedSpec);
  const errors=[...(selfTest.errors||[]),...(execution.errors||[])];
  return {
    passed:selfTest.ok&&execution.ok,
    selfTest,
    execution,
    errors,
    normalized:execution.normalizedSpec,
  };
}

export async function POST(request){
 let supabase=null,charged=false,chargeRequestId=null,entitlementSource=null;
 try{
  supabase=await createClient();const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)return NextResponse.json({success:false,error:"Authentication required."},{status:401});
  if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return NextResponse.json({success:false,error:"Please verify your email or phone before creating an app."},{status:403});
  const body=await request.json();const idea=String(body?.idea||body?.prompt||"").trim();const voiceTranscript=String(body?.voiceTranscript||body?.transcript||"").trim();const designBrief=String(body?.designBrief||"").trim().slice(0,6000);
  const referenceImages=Array.isArray(body?.referenceImages||body?.imageRefs)?(body.referenceImages||body.imageRefs).filter(v=>typeof v==="string"&&v.trim()).slice(0,10):[];
  const language=String(body?.language||"en").trim(),industry=String(body?.industry||"technology").trim();const terminology=Array.isArray(body?.terminology)?body.terminology:[];const createDemoVideo=Boolean(body?.createDemoVideo);
  chargeRequestId=String(body?.requestId||crypto.randomUUID()).trim();if(!idea&&!voiceTranscript)return NextResponse.json({success:false,error:"Please describe the app you want to build."},{status:400});
  const combinedInput=[idea,voiceTranscript,designBrief&&!idea.includes(designBrief)?designBrief:""].filter(Boolean).join("\n\n");if(combinedInput.length>14000)return NextResponse.json({success:false,error:"App description is too long."},{status:413});
  const {data:entitlement,error:entitlementError}=await supabase.rpc("consume_app_builder_entitlement",{p_operation:"create",p_app_id:null});if(entitlementError)throw entitlementError;
  if(!entitlement?.allowed){const {data:charge,error:chargeError}=await supabase.rpc("consume_ai_credits",{p_amount:GENERATE_CREDIT_COST,p_request_id:chargeRequestId,p_description:"AI app generation",p_metadata:{operation:"generate"}});if(chargeError){if(chargeError.message?.toLowerCase().includes("insufficient credits"))return NextResponse.json({success:false,error:"Insufficient credits.",requiredCredits:GENERATE_CREDIT_COST},{status:402});throw chargeError;}charged=charge?.charged!==false;}else entitlementSource=entitlement.source;

  const generationOptions={voiceTranscript,referenceImages,designBrief,language,industry,terminology,createDemoVideo};
  const adult=await runSoolenAdultMode({taskType:"app-build",goal:combinedInput,privateData:referenceImages.length>0,requirements:body?.requirements||{},executors:[{id:"soolen-autonomous-engine",available:true,local:false,requiresNetwork:true,baseScore:50,historicalSuccess:0.5}],permissions:{network:true,privateUpload:referenceImages.length>0}}, {
   execute:async()=>runAutonomousEngine(combinedInput,generationOptions),
   verify:async(result)=>{
     const report=verifyGeneration(result);
     return {passed:report.passed,report};
   },
   repair:async({result,review,verification})=>{
     const report=verification?.report||verifyGeneration(result);
     const criticFailures=(review?.failed||[]).map(x=>x.id);
     const instruction=buildRepairInstruction(report.execution||{});
     return runAutonomousEngine(`${combinedInput}\n\nSOOLEN AUTONOMOUS REPAIR MODE\n${instruction}\nCritic failures: ${criticFailures.join(", ")||"none"}\nSelf-test failures: ${(report.selfTest?.errors||[]).join(", ")||"none"}\nDo not remove working features. Return the full corrected specification only.`,generationOptions);
   }
  });
  if(adult.status!=="verified")throw new Error("Soolen Super Brain could not verify the generated app after autonomous repair attempts.");
  const verified=verifyGeneration(adult.result);if(!verified.passed)throw new Error(`Generated app failed final verification: ${verified.errors.join("; ")}`);const specification=verified.normalized;
  const {data:app,error:appError}=await supabase.from("apps").insert({owner_id:user.id,name:String(specification.name||"Untitled App").trim(),description:String(specification.description||"").trim(),source_prompt:combinedInput,visibility:"private",publish_status:"draft"}).select("id,name,description,created_at,updated_at,current_version_id,visibility,publish_status").single();if(appError)throw new Error(`App save failed: ${appError.message}`);
  const {data:version,error:versionError}=await supabase.from("app_versions").insert({app_id:app.id,version_no:1,specification,change_summary:"Initial Soolen Super Brain generated, repaired and verified application",created_by:user.id}).select("id,version_no,created_at").single();if(versionError)throw new Error(`App version save failed: ${versionError.message}`);
  const {data:savedApp,error:appUpdateError}=await supabase.from("apps").update({current_version_id:version.id}).eq("id",app.id).eq("owner_id",user.id).select("id,name,description,created_at,updated_at,current_version_id,visibility,publish_status").single();if(appUpdateError)throw new Error(`App version link failed: ${appUpdateError.message}`);
  const {error:referralError}=await supabase.rpc("record_first_app_referral_reward");if(referralError)console.warn("Referral qualification could not be recorded:",referralError.message);
  return NextResponse.json({success:true,...adult.result,specification,explanation:buildAppExplanation(specification),selfTest:verified.selfTest,executionVerification:verified.execution,superBrain:{mode:adult.mode,status:adult.status,specialists:adult.specialists,decision:adult.decision?.reason,repairs:Math.max(0,(adult.criticHistory?.length||1)-1),privacy:adult.privacy,checks:{selfTest:verified.selfTest.ok,buildableStructure:verified.execution.checks.buildableStructure,runtimeRoutesValid:verified.execution.checks.runtimeRoutesValid,securityPassed:verified.execution.checks.securityPassed,privacyPassed:verified.execution.checks.privacyPassed}},entitlement:{source:entitlementSource,charged},credits:{charged:charged?GENERATE_CREDIT_COST:0,requestId:chargeRequestId},app:{id:savedApp.id,name:savedApp.name,versionId:version.id,versionNo:version.version_no,visibility:savedApp.visibility,publishStatus:savedApp.publish_status}});
 }catch(error){console.error("AI App Builder error:",error);if(supabase&&charged&&chargeRequestId)await supabase.rpc("refund_ai_credits",{p_request_id:chargeRequestId,p_amount:GENERATE_CREDIT_COST,p_description:"AI generation failed - automatic refund",p_metadata:{operation:"generate"}});return NextResponse.json({success:false,error:error?.message||"Unable to generate the app. Any charged credits were automatically refunded."},{status:500});}
}
