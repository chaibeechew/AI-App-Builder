import { NextResponse } from "next/server";
import { normalizeAppSpec } from "../../../lib/generator/runtime-guard.js";
import { buildAppExplanation } from "../../../lib/generator/app-explanation.js";
import { selfTestGeneratedApp } from "../../../lib/generator/self-test.js";
import { assessBuildQuality,GENERATION_QUALITY_RULES } from "../../../lib/buildStandards.js";
import { evaluateReleaseReadiness } from "../../../lib/release-readiness.js";
import { generateWithFallback } from "../../../engine/ai-provider.js";
import { buildProjectMemoryBrief,mergeProjectMemory } from "../../../lib/project-memory.js";
import { PRODUCT_BRAND,PREMIUM_VISUAL_AI_INSTRUCTION } from "../../../lib/ai/premium-visual-policy.js";
import { buildPreciseEditInstruction } from "../../../lib/editor/precise-edit-policy.js";
import { inspectProjectSpecification,buildSelfHealInstruction } from "../../../lib/ai/project-self-heal-policy.js";
import { consumeAppBuilderEntitlement,consumeAiCredits,refundAiCredits } from "../../../lib/app-builder-finance.js";
import { getBuilderPrincipal,loadBuilderModificationContext,saveBuilderModification } from "../../../lib/cloud/builder-projects.js";

export const maxDuration=120;

const MODIFY_CREDIT_COST=Math.max(1,Number(process.env.APP_MODIFY_CREDIT_COST||5));
const PRIMARY_AI_TIMEOUT_MS=Math.min(50000,Math.max(15000,Number(process.env.MODIFY_PRIMARY_AI_TIMEOUT_MS||40000)));
const REPAIR_AI_TIMEOUT_MS=Math.min(40000,Math.max(10000,Number(process.env.MODIFY_REPAIR_AI_TIMEOUT_MS||30000)));
const REQUEST_ID_PATTERN=/^[a-zA-Z0-9._:-]{1,160}$/;

function extractJson(text){const raw=String(text||"").trim();try{return JSON.parse(raw)}catch{}const fenced=raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);if(fenced){try{return JSON.parse(fenced[1])}catch{}}const start=raw.indexOf("{"),end=raw.lastIndexOf("}");if(start>=0&&end>start){try{return JSON.parse(raw.slice(start,end+1))}catch{}}throw new Error("AI returned invalid JSON.");}
function normalizeAndTest(raw){const normalized=normalizeAppSpec(raw),selfTest=selfTestGeneratedApp(normalized);if(!selfTest.ok)throw new Error(`Modified app failed self-test: ${selfTest.errors.join("; ")}`);const specification=selfTest.normalizedSpec;return{specification,selfTest,quality:assessBuildQuality(specification),selfHeal:inspectProjectSpecification(specification)};}
function qualityRegressed(before,after){if(!before||!after)return true;if(Number(after.overall||0)<Number(before.overall||0))return true;const oldMap=Object.fromEntries((before.dimensions||[]).map(x=>[x.id,Number(x.score||0)]));return(after.dimensions||[]).some(x=>Number(x.score||0)<Number(oldMap[x.id]||0));}
function visualMemory(spec){const d=spec?.designSystem||{};return{themeMode:d.themeMode||"auto",colorPreference:d.colorPreference||"",primaryColor:d.primaryColor||"",secondaryColor:d.secondaryColor||"",accentColor:d.accentColor||"",backgroundColor:d.backgroundColor||"",surfaceColor:d.surfaceColor||"",textColor:d.textColor||"",wallpaperMode:d.wallpaperMode||"random",wallpaperPreset:d.wallpaperPreset||"",visualDirection:d.visualDirection||"",imageStyle:d.imageStyle||"",cardStyle:d.cardStyle||""};}
async function withTimeout(promise,ms,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timed out after ${ms}ms`)),ms)})])}finally{clearTimeout(timer)}}
function preciseTargetFrom(body){const target=body?.preciseTarget;if(!target||typeof target!=="object"||Array.isArray(target))return null;return{pageName:String(target.pageName||"").trim().slice(0,160),pageIndex:Number.isInteger(target.pageIndex)?target.pageIndex:null,sectionName:String(target.sectionName||"").trim().slice(0,160),sectionIndex:Number.isInteger(target.sectionIndex)?target.sectionIndex:null,lineNumber:Number.isInteger(target.lineNumber)&&target.lineNumber>0?Math.min(target.lineNumber,100000):null,elementType:String(target.elementType||"").trim().slice(0,40),position:String(target.position||"").trim().slice(0,160)};}
function replayPayload({appId,version,specification,requestId}){const normalized=normalizeAppSpec(specification),selfTest=selfTestGeneratedApp(normalized),finalSpec=selfTest.normalizedSpec,quality=assessBuildQuality(finalSpec),selfHeal=inspectProjectSpecification(finalSpec);return{success:true,replayed:true,provider:null,specification:finalSpec,appId,version:{id:version.id,version_no:version.version_no,created_at:version.created_at,replayed:true},preciseEdit:{applied:false,target:null},selfHeal:{applied:false,report:selfHeal},projectMemory:{applied:true,updated:false,visualPreferences:visualMemory(finalSpec)},explanation:buildAppExplanation(finalSpec),selfTest,quality:{before:quality,after:quality,repairApplied:false,releaseReadiness:evaluateReleaseReadiness(quality)},entitlement:{source:"replay",charged:false},credits:{charged:0,requestId,balance:null}};}

export async function POST(request){
 let userId=null,charged=false,chargeRequestId=null,charge=null;
 try{
  const principal=await getBuilderPrincipal({requireVerified:true});
  if(!principal.ok){
    if(principal.code==="ACCOUNT_VERIFICATION_REQUIRED")return NextResponse.json({error:"Please verify your email or phone before modifying an app."},{status:403});
    return NextResponse.json({error:"Authentication required."},{status:401});
  }
  userId=principal.principal.principalId;

  const body=await request.json();
  const instruction=String(body?.instruction||"").trim();
  const appId=String(body?.appId||"").trim();
  const expectedVersionId=String(body?.expectedVersionId||"").trim()||null;
  const preciseTarget=preciseTargetFrom(body);
  chargeRequestId=String(body?.requestId||"").trim();
  if(!appId)return NextResponse.json({error:"A saved project is required for AI Modify."},{status:400});
  if(!chargeRequestId)return NextResponse.json({error:"A stable modification request ID is required."},{status:400});
  if(!REQUEST_ID_PATTERN.test(chargeRequestId))return NextResponse.json({error:"Modification request ID is invalid."},{status:400});
  if(!instruction)return NextResponse.json({error:"Modification instruction is required."},{status:400});
  if(instruction.length>4000)return NextResponse.json({error:"Modification instruction is too long."},{status:413});

  const context=await loadBuilderModificationContext({appId,requestId:chargeRequestId});
  if(!context.ok){
    if(context.code==="PROJECT_NOT_FOUND")return NextResponse.json({error:"App not found or access denied."},{status:404});
    if(context.code==="MODIFICATION_REPLAY_CHECK_FAILED")throw new Error("Modification replay state could not be checked safely.");
    throw new Error(`Modification context unavailable: ${context.code}`);
  }
  const replayVersion=context.replayVersion;
  if(replayVersion?.specification)return NextResponse.json(replayPayload({appId,version:replayVersion,specification:replayVersion.specification,requestId:chargeRequestId}));

  const owned=context.project;
  if(!owned.current_version_id)return NextResponse.json({error:"This project has no current saved version yet."},{status:409});
  if(expectedVersionId&&expectedVersionId!==owned.current_version_id)return NextResponse.json({error:"This project changed after the editor loaded. Refresh the project before applying this precise edit."},{status:409});
  const baseVersionId=owned.current_version_id;
  const currentVersion=context.currentVersion;
  if(!currentVersion?.specification)return NextResponse.json({error:"Current project version could not be loaded safely."},{status:409});
  const effectiveSpecification=currentVersion.specification;
  const memoryRow=context.memory||null;

  const entitlement=await consumeAppBuilderEntitlement(userId,{operation:"modify",appId,requestId:chargeRequestId});
  const entitlementSource=entitlement?.allowed?entitlement.source:null;
  if(!entitlement?.allowed){charge=await consumeAiCredits(userId,{amount:MODIFY_CREDIT_COST,requestId:chargeRequestId,description:"AI app modification",metadata:{operation:"modify",appId}});charged=Boolean(charge?.charged);}
  const memoryBrief=buildProjectMemoryBrief(memoryRow),currentQuality=assessBuildQuality(normalizeAppSpec(effectiveSpecification));
  const effectiveInstruction=preciseTarget?buildPreciseEditInstruction({...preciseTarget,instruction}):instruction;
  const prompt=`You are the modification engine for ${PRODUCT_BRAND.name}, powered by SoolenAI. Modify the existing App + Website according to this instruction:\n"${effectiveInstruction}"\n${memoryBrief?`\n${memoryBrief}\n`:""}\n\nNON-NEGOTIABLE QUALITY STANDARD:\n${GENERATION_QUALITY_RULES}\n\nPREMIUM VISUAL IDEAL:\n${PREMIUM_VISUAL_AI_INSTRUCTION}\n\nCurrent specification:\n${JSON.stringify(effectiveSpecification)}\nReturn ONLY valid JSON with name, description, designSystem, visualAssets, qualityPlan, pages, features, data, dataModels, actions and navigation. Preserve and improve the existing qualityPlan with at least 3 concrete implementation decisions for every quality dimension. A current customer request about color, theme, style or wallpaper overrides older visual preferences and must coordinate the entire visual system. Preserve existing functionality and remembered project preferences unless the customer's current instruction explicitly changes them. Do not silently remove authentication, permissions, privacy, validation, loading/error states, responsive behavior or accessibility protections. Never reuse private assets across customers. No markdown.`;
  const ai=await withTimeout(generateWithFallback(prompt),PRIMARY_AI_TIMEOUT_MS,"Primary AI modification"),finalProviderStart=ai.provider;
  let finalProvider=finalProviderStart,candidate=normalizeAndTest(extractJson(ai.result)),qualityRepairApplied=false,selfHealApplied=false;

  if(qualityRegressed(currentQuality,candidate.quality)){
    const repairPrompt=`You are SoolenAI Quality Repair for ${PRODUCT_BRAND.name}. The requested edit is valid, but the candidate version reduced deterministic release quality compared with the previous saved specification. Repair the candidate while preserving the customer's requested change, color/theme/wallpaper direction and every working feature.\n\nCUSTOMER REQUEST:\n${effectiveInstruction}\n\nQUALITY STANDARD:\n${GENERATION_QUALITY_RULES}\n\nPREVIOUS QUALITY:\n${JSON.stringify(currentQuality)}\n\nCANDIDATE QUALITY:\n${JSON.stringify(candidate.quality)}\n\nCANDIDATE SPECIFICATION:\n${JSON.stringify(candidate.specification)}\n\nReturn ONLY the complete repaired JSON specification, including a complete qualityPlan. Do not invent compliance claims or remove functionality.`;
    const repairedAI=await withTimeout(generateWithFallback(repairPrompt),REPAIR_AI_TIMEOUT_MS,"AI quality repair"),repaired=normalizeAndTest(extractJson(repairedAI.result));
    if(qualityRegressed(currentQuality,repaired.quality))throw new Error("AI edit was not saved because it would reduce the project's release quality. Try a more specific change.");
    candidate=repaired;finalProvider=repairedAI.provider;qualityRepairApplied=true;
  }
  if(!candidate.selfHeal.passed){
    const selfHealPrompt=`You are SoolenAI Self-Heal for ${PRODUCT_BRAND.name}. Repair only the verified structural/runtime-readiness problems in the candidate below while preserving the customer's requested edit.\n\n${buildSelfHealInstruction({specification:candidate.specification})}\n\nCUSTOMER REQUEST:\n${effectiveInstruction}\n\nPREVIOUS KNOWN-GOOD SPECIFICATION:\n${JSON.stringify(effectiveSpecification)}\n\nCANDIDATE SPECIFICATION:\n${JSON.stringify(candidate.specification)}\n\nReturn ONLY the full corrected JSON specification. Keep the previous version as the safety baseline. Do not invent external-provider success.`;
    const healedAI=await withTimeout(generateWithFallback(selfHealPrompt),REPAIR_AI_TIMEOUT_MS,"AI self-heal"),healed=normalizeAndTest(extractJson(healedAI.result));
    if(!healed.selfHeal.passed)throw new Error("AI edit was not saved because self-heal could not produce a safe validated version.");
    if(qualityRegressed(currentQuality,healed.quality))throw new Error("AI edit was not saved because self-heal reduced the project's release quality.");
    candidate=healed;finalProvider=healedAI.provider;selfHealApplied=true;
  }

  const finalSpec=candidate.specification,test=candidate.selfTest,finalQuality=candidate.quality,finalReadiness=evaluateReleaseReadiness(finalQuality);
  const nextMemory=mergeProjectMemory(memoryRow?.memory_json,{requestedName:finalSpec.name,visualPreferences:visualMemory(finalSpec),lastModificationAt:new Date().toISOString(),lastModificationInstruction:instruction,lastPreciseTarget:preciseTarget||undefined,lastSelfHealApplied:selfHealApplied});
  const save=await saveBuilderModification({appId,expectedVersionId:baseVersionId,requestId:chargeRequestId,specification:finalSpec,changeSummary:instruction,memoryJson:nextMemory,learningScope:memoryRow?.learning_scope||"project_only"});
  if(!save.ok){
    if(save.code==="PROJECT_CHANGED_DURING_MODIFICATION")throw new Error("Project changed during modification");
    if(save.code==="MODIFICATION_REPLAY_LOAD_FAILED")throw new Error("Saved replay version could not be loaded safely.");
    throw new Error(save.detail||`Modification save failed: ${save.code}`);
  }

  if(save.replayed){
    const persisted=save.version;
    if(!persisted?.specification)throw new Error("Saved replay version could not be loaded safely.");
    return NextResponse.json(replayPayload({appId,version:persisted,specification:persisted.specification,requestId:chargeRequestId}));
  }

  const savedVersion=save.version;
  return NextResponse.json({success:true,replayed:false,provider:finalProvider,specification:finalSpec,appId,version:savedVersion,preciseEdit:{applied:Boolean(preciseTarget),target:preciseTarget},selfHeal:{applied:selfHealApplied,report:candidate.selfHeal},projectMemory:{applied:Boolean(memoryBrief),updated:Boolean(save.memorySaved),visualPreferences:visualMemory(finalSpec)},explanation:buildAppExplanation(finalSpec),selfTest:test,quality:{before:currentQuality,after:finalQuality,repairApplied:qualityRepairApplied,releaseReadiness:finalReadiness},entitlement:{source:entitlementSource,charged},credits:{charged:charged?MODIFY_CREDIT_COST:0,requestId:chargeRequestId,balance:charge?.balance??null}});
 }catch(error){
  console.error("Modify API error:",error);
  if(charged&&chargeRequestId&&userId){try{await refundAiCredits(userId,{requestId:chargeRequestId,amount:MODIFY_CREDIT_COST,description:"AI modification failed - automatic refund",metadata:{operation:"modify"}})}catch{}}
  const message=String(error?.message||"");
  if(message.includes("would reduce the project's release quality")||message.includes("self-heal could not produce")||message.includes("self-heal reduced"))return NextResponse.json({error:message},{status:409});
  if(message.includes("Project changed during modification"))return NextResponse.json({error:"This project changed while AI was working. Refresh the workspace and try the change again."},{status:409});
  if(message.includes("Insufficient credits"))return NextResponse.json({error:"Insufficient credits.",requiredCredits:MODIFY_CREDIT_COST},{status:402});
  if(message.includes("Server financial runtime is not configured"))return NextResponse.json({error:"Secure billing runtime is not configured yet."},{status:503});
  if(message.includes("replay state could not be checked")||message.includes("replay version could not be loaded")||message.includes("Saved replay version could not be loaded"))return NextResponse.json({error:"Modification retry state could not be verified safely. No new AI edit was accepted."},{status:503});
  if(/timed out|time budget/i.test(message))return NextResponse.json({error:"AI modification reached its safety time limit. No new version was accepted."},{status:504});
  if(message.includes("All authorized AI providers failed"))return NextResponse.json({error:"AI providers are temporarily unavailable. Please try again."},{status:503});
  return NextResponse.json({error:"Unable to modify the app. Any charged credits were automatically refunded."},{status:500});
 }
}
