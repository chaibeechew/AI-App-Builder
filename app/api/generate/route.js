import { NextResponse } from "next/server";
import { runAutonomousEngine } from "../../../engine/autonomous-engine.js";
import { runSoolenAdultMode } from "../../../lib/soolen/adult-engine.js";
import { normalizeAppSpec } from "../../../lib/generator/runtime-guard.js";
import { buildAppExplanation } from "../../../lib/generator/app-explanation.js";
import { selfTestGeneratedApp } from "../../../lib/generator/self-test.js";
import { verifyGeneratedAppExecution, buildRepairInstruction } from "../../../lib/generator/execution-verifier.js";
import { createClient } from "../../../lib/supabase/server.js";

const GENERATE_CREDIT_COST=Math.max(1,Number(process.env.APP_GENERATE_CREDIT_COST||10));
const HEX_COLOR=/^#[0-9a-f]{6}$/i;

function verifyGeneration(result){
  const normalized=normalizeAppSpec(result?.specification);
  const selfTest=selfTestGeneratedApp(normalized);
  const execution=verifyGeneratedAppExecution(selfTest.normalizedSpec);
  const errors=[...(selfTest.errors||[]),...(execution.errors||[])];
  return {passed:selfTest.ok&&execution.ok,selfTest,execution,errors,normalized:execution.normalizedSpec};
}

function buildBrandBrief(kit){
  if(!kit)return "";
  const rows=[kit.company_name&&`Brand/company: ${kit.company_name}`,kit.primary_color&&`Primary color: ${kit.primary_color}`,kit.secondary_color&&`Secondary color: ${kit.secondary_color}`,kit.accent_color&&`Accent color: ${kit.accent_color}`,kit.font_style&&`Typography direction: ${kit.font_style}`,kit.brand_voice&&`Brand voice: ${kit.brand_voice}`,kit.logo_url&&`Logo reference: ${kit.logo_url}`].filter(Boolean);
  if(!rows.length)return "";
  return `SAVED BRAND KIT\n${rows.join("\n")}\nUse this identity as a design system for the new App + Website. Keep the result original, readable, comfortable, natural and accessible. Do not imitate third-party branding.`;
}

function pageText(page){return `${page?.name||""} ${page?.purpose||page?.description||""}`.toLowerCase();}
function choosePlacement(asset,pages=[]){
  const name=String(asset?.file_name||"").toLowerCase();
  const category=String(asset?.category||"").toLowerCase();
  const candidates=pages.map((page,index)=>({page,index,text:pageText(page)}));
  const match=(words)=>candidates.find((item)=>words.some((word)=>item.text.includes(word)));
  let target=null,role="content",reason="Placed on the most relevant generated page.";
  if(/logo|brand|icon/.test(name)){target=match(["home","landing","about","profile"]);role="brand";reason="Detected as likely brand/logo media.";}
  else if(/property|house|home|unit|listing|room/.test(name)){target=match(["property","listing","home","gallery"]);role="gallery";reason="Filename suggests property/listing media.";}
  else if(/product|item|menu|food/.test(name)){target=match(["product","shop","store","menu","catalog"]);role="gallery";reason="Filename suggests product or catalog media.";}
  else if(category==="video"){target=match(["home","about","story","gallery","media"]);role="video";reason="Video placed where motion/story content is most useful.";}
  else {target=match(["home","gallery","about","portfolio","product","listing"]);role="content";}
  target=target||candidates[0]||null;
  return {suggested_page:target?.page?.name||"Main",suggested_role:role,placement_reason:reason};
}
function safeColor(value){const v=String(value||"").trim();return HEX_COLOR.test(v)?v:"";}

export async function POST(request){
 let supabase=null,charged=false,chargeRequestId=null,entitlementSource=null,entitlementReserved=false,createdAppId=null,accessBound=false;
 try{
  supabase=await createClient();const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)return NextResponse.json({success:false,error:"Authentication required."},{status:401});
  if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return NextResponse.json({success:false,error:"Please verify your email or phone before creating an app."},{status:403});
  const body=await request.json();const idea=String(body?.idea||body?.prompt||"").trim();const voiceTranscript=String(body?.voiceTranscript||body?.transcript||"").trim();
  const requestedName=String(body?.requestedName||"").trim().slice(0,200);
  const assetIds=Array.isArray(body?.assetIds)?[...new Set(body.assetIds.filter((value)=>typeof value==="string"&&value.trim()).map((value)=>value.trim()))].slice(0,20):[];
  const referenceImages=Array.isArray(body?.referenceImages||body?.imageRefs)?(body.referenceImages||body.imageRefs).filter(v=>typeof v==="string"&&v.trim()).slice(0,10):[];
  const language=String(body?.language||"en").trim(),industry=String(body?.industry||"technology").trim();const terminology=Array.isArray(body?.terminology)?body.terminology:[];const createDemoVideo=Boolean(body?.createDemoVideo);
  const themeMode=["auto","preset","custom"].includes(body?.themeMode)?body.themeMode:"auto";
  const themePreset=String(body?.themePreset||"auto").trim().slice(0,60);
  const primaryColor=safeColor(body?.primaryColor),accentColor=safeColor(body?.accentColor),backgroundColor=safeColor(body?.backgroundColor);
  const styleRequest=String(body?.styleRequest||"").trim().slice(0,500);
  chargeRequestId=String(body?.requestId||crypto.randomUUID()).trim();if(!idea&&!voiceTranscript)return NextResponse.json({success:false,error:"Please describe the app you want to build."},{status:400});
  const combinedInput=[requestedName?`CUSTOMER-CHOSEN APP NAME: ${requestedName}`:"",idea,voiceTranscript].filter(Boolean).join("\n\n");if(combinedInput.length>8000)return NextResponse.json({success:false,error:"App description is too long."},{status:413});

  const {data:brandKit}=await supabase.from("brand_kits").select("company_name,logo_url,primary_color,secondary_color,accent_color,font_style,brand_voice").eq("user_id",user.id).maybeSingle();
  const brandBrief=buildBrandBrief(brandKit);const buildInput=[combinedInput,brandBrief].filter(Boolean).join("\n\n");

  const {data:entitlement,error:entitlementError}=await supabase.rpc("consume_app_builder_entitlement",{p_operation:"create",p_app_id:null,p_request_id:chargeRequestId});if(entitlementError)throw entitlementError;
  if(!entitlement?.allowed){const {data:charge,error:chargeError}=await supabase.rpc("consume_ai_credits",{p_amount:GENERATE_CREDIT_COST,p_request_id:chargeRequestId,p_description:"AI app generation",p_metadata:{operation:"generate"}});if(chargeError){if(chargeError.message?.toLowerCase().includes("insufficient credits"))return NextResponse.json({success:false,error:"Insufficient credits.",requiredCredits:GENERATE_CREDIT_COST},{status:402});throw chargeError;}charged=charge?.charged!==false;}else {entitlementSource=entitlement.source;entitlementReserved=true;}

  const generationOptions={voiceTranscript,referenceImages,language,industry,terminology,createDemoVideo,brandKit:brandKit||null,themeMode,themePreset,primaryColor,accentColor,backgroundColor,styleRequest};
  const adult=await runSoolenAdultMode({taskType:"app-build",goal:buildInput,privateData:referenceImages.length>0||assetIds.length>0,requirements:{...(body?.requirements||{}),brandKit:brandKit||undefined,requestedName:requestedName||undefined,themeMode,themePreset,primaryColor,accentColor,backgroundColor,styleRequest},executors:[{id:"soolen-autonomous-engine",available:true,local:false,requiresNetwork:true,baseScore:50,historicalSuccess:0.5}],permissions:{network:true,privateUpload:referenceImages.length>0||assetIds.length>0}}, {
   execute:async()=>runAutonomousEngine(buildInput,generationOptions),
   verify:async(result)=>{const report=verifyGeneration(result);return {passed:report.passed,report};},
   repair:async({result,review,verification})=>{const report=verification?.report||verifyGeneration(result);const criticFailures=(review?.failed||[]).map(x=>x.id);const instruction=buildRepairInstruction(report.execution||{});return runAutonomousEngine(`${buildInput}\n\nSOOLEN AUTONOMOUS REPAIR MODE\n${instruction}\nCritic failures: ${criticFailures.join(", ")||"none"}\nSelf-test failures: ${(report.selfTest?.errors||[]).join(", ")||"none"}\nDo not remove working features. Preserve the saved Brand Kit and customer-selected color/theme direction unless it conflicts with accessibility or safety. Preserve the customer's chosen app name. Return the full corrected specification only.`,generationOptions);}
  });
  if(adult.status!=="verified")throw new Error("Soolen Super Brain could not verify the generated app after autonomous repair attempts.");
  const verified=verifyGeneration(adult.result);if(!verified.passed)throw new Error(`Generated app failed final verification: ${verified.errors.join("; ")}`);
  const specification={...verified.normalized,name:requestedName||verified.normalized.name};
  const {data:app,error:appError}=await supabase.from("apps").insert({owner_id:user.id,name:String(specification.name||"Untitled App").trim(),description:String(specification.description||"").trim(),source_prompt:combinedInput,visibility:"private",publish_status:"draft"}).select("id,name,description,created_at,updated_at,current_version_id,visibility,publish_status").single();if(appError)throw new Error(`App save failed: ${appError.message}`);createdAppId=app.id;
  const {data:version,error:versionError}=await supabase.from("app_versions").insert({app_id:app.id,version_no:1,specification,change_summary:brandBrief?"Initial verified build with saved Brand Kit":"Initial Soolen Super Brain generated, repaired and verified application",created_by:user.id}).select("id,version_no,created_at").single();if(versionError)throw new Error(`App version save failed: ${versionError.message}`);
  const {data:savedApp,error:appUpdateError}=await supabase.from("apps").update({current_version_id:version.id}).eq("id",app.id).eq("owner_id",user.id).select("id,name,description,created_at,updated_at,current_version_id,visibility,publish_status").single();if(appUpdateError)throw new Error(`App version link failed: ${appUpdateError.message}`);

  if(entitlementReserved){const {data:binding,error:bindingError}=await supabase.rpc("bind_app_builder_project_access",{p_app_id:app.id,p_request_id:chargeRequestId});if(bindingError)throw new Error(`Project access binding failed: ${bindingError.message}`);accessBound=Boolean(binding?.bound||binding?.replayed);}

  let mediaAssignments=[];
  if(assetIds.length){
    const {data:ownedAssets,error:assetError}=await supabase.from("asset_library").select("id,file_name,mime_type,category").eq("user_id",user.id).in("id",assetIds);
    if(assetError)console.warn("CUSTOMER_MEDIA_LOOKUP_ERROR:",assetError.message);
    const pages=Array.isArray(specification.pages)?specification.pages:[];
    mediaAssignments=(ownedAssets||[]).map((asset)=>({app_id:app.id,asset_id:asset.id,owner_id:user.id,...choosePlacement(asset,pages)}));
    if(mediaAssignments.length){const {error:mapError}=await supabase.from("project_assets").upsert(mediaAssignments,{onConflict:"app_id,asset_id"});if(mapError)console.warn("PROJECT_MEDIA_MAP_ERROR:",mapError.message);}
  }

  const memoryPayload={requested_name:requestedName||specification.name,learning_scope:body?.innovationLearningConsent?"anonymized-patterns-opt-in":"project-only",visual_preferences:{themeMode,themePreset,primaryColor,accentColor,backgroundColor,styleRequest},media_preferences:mediaAssignments.map((item)=>({assetId:item.asset_id,page:item.suggested_page,role:item.suggested_role})),last_build_at:new Date().toISOString()};
  const {error:memoryError}=await supabase.from("project_memory").upsert({app_id:app.id,owner_id:user.id,memory_json:memoryPayload,updated_at:new Date().toISOString()},{onConflict:"app_id"});if(memoryError)console.warn("PROJECT_MEMORY_SAVE_ERROR:",memoryError.message);

  const {error:referralError}=await supabase.rpc("record_first_app_referral_reward");if(referralError)console.warn("Referral qualification could not be recorded:",referralError.message);
  return NextResponse.json({success:true,...adult.result,specification,explanation:buildAppExplanation(specification),selfTest:verified.selfTest,executionVerification:verified.execution,brandKit:{applied:Boolean(brandBrief),companyName:brandKit?.company_name||null},theme:{mode:themeMode,preset:themePreset,primaryColor,accentColor,backgroundColor},media:{attached:mediaAssignments.length,assignments:mediaAssignments.map((item)=>({assetId:item.asset_id,page:item.suggested_page,role:item.suggested_role,reason:item.placement_reason}))},projectLearning:{scope:memoryPayload.learning_scope,saved:true},superBrain:{mode:adult.mode,status:adult.status,specialists:adult.specialists,decision:adult.decision?.reason,repairs:Math.max(0,(adult.criticHistory?.length||1)-1),privacy:adult.privacy,checks:{selfTest:verified.selfTest.ok,buildableStructure:verified.execution.checks.buildableStructure,runtimeRoutesValid:verified.execution.checks.runtimeRoutesValid,securityPassed:verified.execution.checks.securityPassed,privacyPassed:verified.execution.checks.privacyPassed}},entitlement:{source:entitlementSource,charged,projectAccessBound:accessBound},credits:{charged:charged?GENERATE_CREDIT_COST:0,requestId:chargeRequestId},app:{id:savedApp.id,name:savedApp.name,versionId:version.id,versionNo:version.version_no,visibility:savedApp.visibility,publishStatus:savedApp.publish_status}});
 }catch(error){
  console.error("AI BUILD APP & WEB error:",error);
  if(supabase&&createdAppId&&!accessBound){try{await supabase.from("apps").delete().eq("id",createdAppId);}catch{}}
  if(supabase&&entitlementReserved&&!accessBound&&chargeRequestId){try{await supabase.rpc("restore_failed_app_builder_create",{p_request_id:chargeRequestId});}catch{}}
  if(supabase&&charged&&chargeRequestId)await supabase.rpc("refund_ai_credits",{p_request_id:chargeRequestId,p_amount:GENERATE_CREDIT_COST,p_description:"AI generation failed - automatic refund",p_metadata:{operation:"generate"}});
  return NextResponse.json({success:false,error:error?.message||"Unable to generate the app. Any charged credits were automatically refunded."},{status:500});
 }
}
