import { NextResponse } from "next/server";
import { generateWithFallback } from "../../../../engine/ai-provider.js";
import { getVideoComputePolicy, normalizeDeviceClass } from "../../../../lib/video/compute-policy.js";
import { createClient } from "../../../../lib/supabase/server.js";
import { buildProjectMemoryBrief } from "../../../../lib/project-memory.js";
import { consumeAiCredits,refundAiCredits } from "../../../../lib/app-builder-finance.js";

const MAX_REQUEST_BYTES=24*1024;
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const STORYBOARD_CREDIT_COST=Math.max(1,Number(process.env.VIDEO_STORYBOARD_CREDIT_COST||1));
function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function cleanText(value,max){return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}
function parseStoryboard(raw,{seconds,maxClipSeconds}){const clean=String(raw||"").replace(/```json|```/gi,"").trim();const start=clean.indexOf("{"),end=clean.lastIndexOf("}");if(start<0||end<=start)throw new Error("INVALID_STORYBOARD");let parsed;try{parsed=JSON.parse(clean.slice(start,end+1))}catch{throw new Error("INVALID_STORYBOARD")}const input=Array.isArray(parsed?.scenes)?parsed.scenes.slice(0,20):[];if(input.length<2)throw new Error("INVALID_STORYBOARD");const defaultDuration=Math.max(1,Math.min(maxClipSeconds,seconds/input.length));const scenes=input.map((scene,index)=>({duration:Number(Math.max(1,Math.min(maxClipSeconds,Number(scene?.duration)||defaultDuration)).toFixed(2)),headline:cleanText(scene?.headline||`Scene ${index+1}`,160),caption:cleanText(scene?.caption,500),visual:cleanText(scene?.visual,800)}));const total=scenes.reduce((sum,scene)=>sum+scene.duration,0);return{title:cleanText(parsed?.title||"Video Storyboard",160),scenes,durationSeconds:Number(Math.min(seconds,total).toFixed(2))};}

export async function POST(request) {
  let userId=null,requestId="",charged=false;
  try {
    const contentLength=Number(request.headers.get("content-length")||0);if(contentLength>MAX_REQUEST_BYTES)return noStore({error:"Video storyboard request is too large."},413);
    const supabase=await createClient();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)return noStore({error:"Authentication required."},401);userId=user.id;if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return noStore({error:"Account verification is required."},403);
    const body=await request.json().catch(()=>null);if(!body)return noStore({error:"Invalid video storyboard request."},400);if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_REQUEST_BYTES)return noStore({error:"Video storyboard request is too large."},413);
    requestId=cleanText(body?.requestId,160);if(!REQUEST_ID.test(requestId))return noStore({error:"A stable video storyboard request ID is required."},400);
    const idea=cleanText(body?.prompt,4000);if(!idea)return noStore({error:"Video idea is required."},400);
    const style=String(body?.style||"realistic").toLowerCase();const safeStyle=["realistic","cartoon","mixed"].includes(style)?style:"realistic";const deviceClass=normalizeDeviceClass(body?.deviceClass);const signals=body?.signals&&typeof body.signals==="object"&&!Array.isArray(body.signals)?body.signals:{};const policy=getVideoComputePolicy(deviceClass,signals);const seconds=Math.min(policy.maxProjectSeconds,Math.max(4,Number(body?.duration)||30));
    let memoryBrief="";const appId=cleanText(body?.appId,80);if(appId){const {data:app}=await supabase.from("apps").select("id").eq("id",appId).eq("owner_id",user.id).maybeSingle();if(!app)return noStore({error:"Project not found or access denied."},404);const {data:memory}=await supabase.from("project_memory").select("memory_json,learning_scope").eq("app_id",appId).eq("owner_id",user.id).maybeSingle();memoryBrief=buildProjectMemoryBrief(memory||null);}
    const charge=await consumeAiCredits(user.id,{amount:STORYBOARD_CREDIT_COST,requestId,description:"AI video storyboard",metadata:{operation:"video_storyboard",style:safeStyle,duration:seconds,appId:appId||null}});charged=Boolean(charge?.charged);
    const sceneCount=Math.max(2,Math.min(20,Math.ceil(seconds/Math.max(3,Math.min(6,policy.maxClipSeconds)))));const instruction=`You are SoolenAI. Create an original ${safeStyle} video storyboard for this customer idea:\n${idea}\n${memoryBrief?`\nPROJECT-SPECIFIC MEMORY FOR CONTINUITY:\n${memoryBrief}\n`:""}\nReturn ONLY JSON with title and scenes. Create about ${sceneCount} scenes for a total project target near ${seconds} seconds. Every scene must contain duration, headline, caption and visual. No copyrighted logos, copied third-party brand assets or imitation of a distinctive protected layout. Each scene must remain concise and individually renderable; no scene may exceed ${policy.maxClipSeconds} seconds. The current customer instruction overrides older project memory when they conflict.`;
    const {result}=await generateWithFallback(instruction);const storyboard=parseStoryboard(result,{seconds,maxClipSeconds:policy.maxClipSeconds});
    return noStore({success:true,engine:"Soolen Video Engine",storyboard,duration:storyboard.durationSeconds,style:safeStyle,projectMemoryApplied:Boolean(memoryBrief),experience:{label:policy.label,maxClipSeconds:policy.maxClipSeconds,maxProjectSeconds:policy.maxProjectSeconds},credits:{charged:charged?STORYBOARD_CREDIT_COST:0,requestId,balance:charge?.balance??null},renderMode:"server-first",note:"Customer devices handle lightweight preview and edit decisions. Heavy generation and final rendering are only reported when an authorized server renderer actually accepts the job."});
  } catch(error) {
    console.error("SOOLEN_VIDEO_STORYBOARD_ERROR",error?.name||"unknown");if(charged&&requestId&&userId){try{await refundAiCredits(userId,{requestId,amount:STORYBOARD_CREDIT_COST,description:"AI video storyboard failed - automatic refund",metadata:{operation:"video_storyboard"}})}catch{}}
    const message=String(error?.message||"");if(/insufficient credits/i.test(message))return noStore({error:"Insufficient credits.",requiredCredits:STORYBOARD_CREDIT_COST},402);return noStore({error:"Unable to create the video storyboard right now."},500);
  }
}
