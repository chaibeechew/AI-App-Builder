import {NextResponse} from "next/server";
import {createClient} from "../../../../lib/supabase/server.js";
import {generateSoolenVideo,SoolenVideoEngineError} from "../../../../lib/soolen/video-engine.js";
import {sanitizeDeviceCapabilities,createDataHandlingPolicy} from "../../../../lib/soolen/security-policy.js";
import {getSoolenSubscription,requirePaidTier} from "../../../../lib/soolen/user-tier.js";

const MAX_AUDIO=20*1024*1024;
const MAX_IMAGE=20*1024*1024;
const MAX_VIDEO=200*1024*1024;
const MAX_PROMPT=12000;
const imageTasks=new Set(["animate-photo","restyle-photo","real-to-cartoon","cartoon-to-real"]);
const videoTasks=new Set(["edit-video","real-video-to-cartoon","cartoon-video-to-real"]);

function parseJson(value,fallback={}){try{return value?JSON.parse(String(value)):fallback;}catch{return fallback;}}
function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});}

export async function POST(request){
 try{
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return noStore({success:false,error:"Authentication required."},401);

  const form=await request.formData();
  const prompt=String(form.get("prompt")||"").trim();
  const task=String(form.get("task")||"create");
  const mode=String(form.get("mode")||"real");
  const voiceSource=String(form.get("voiceSource")||"ai");
  const duration=Number(form.get("duration")||30);
  const language=String(form.get("language")||"English").slice(0,80);
  const voice=String(form.get("voice")||"Warm Female").slice(0,120);
  const style=String(form.get("style")||"Cinematic").slice(0,120);
  const music=String(form.get("music"))==="true";
  const captions=String(form.get("captions"))==="true";
  const consent=String(form.get("consent"))==="true";
  const executionTarget=String(form.get("executionTarget")||"device");
  const preferredChunkSeconds=Number(form.get("preferredChunkSeconds")||15);
  const deviceCapabilities=sanitizeDeviceCapabilities(parseJson(form.get("deviceCapabilities"),{}));
  const devicePolicy=parseJson(form.get("devicePolicy"),{});
  const referenceImage=form.get("referenceImage");
  const sourceVideo=form.get("sourceVideo");
  const voiceFile=form.get("voiceFile");

  if(executionTarget!=="device"){
   const subscription=await getSoolenSubscription(supabase,user.id);
   if(!requirePaidTier(subscription))return noStore({success:false,error:"Cloud and shared video rendering require an active paid plan.",code:"UPGRADE_REQUIRED"},402);
  }

  if(!prompt)return noStore({success:false,error:"Please describe what you want Soolen AI to create or change."},400);
  if(prompt.length>MAX_PROMPT)return noStore({success:false,error:"Description is too long."},413);

  const hasImage=referenceImage instanceof File&&referenceImage.size>0;
  const hasVideo=sourceVideo instanceof File&&sourceVideo.size>0;
  const hasVoice=voiceFile instanceof File&&voiceFile.size>0;
  if((hasImage||hasVideo||voiceSource==="upload")&&!consent)return noStore({success:false,error:"Please confirm that you own or have permission to use the uploaded photo, video and voice."},400);

  if(voiceSource==="upload"){
   if(!hasVoice)return noStore({success:false,error:"Please upload a voice sample."},400);
   if(voiceFile.size>MAX_AUDIO)return noStore({success:false,error:"Voice sample must be 20 MB or smaller."},413);
   if(!/^audio\//.test(voiceFile.type))return noStore({success:false,error:"Voice sample must be an audio file."},400);
  }
  if(hasImage){
   if(referenceImage.size>MAX_IMAGE)return noStore({success:false,error:"Photo must be 20 MB or smaller."},413);
   if(!/^image\/(png|jpeg|webp)$/.test(referenceImage.type))return noStore({success:false,error:"Photo must be PNG, JPEG or WebP."},400);
  }
  if(hasVideo){
   if(sourceVideo.size>MAX_VIDEO)return noStore({success:false,error:"Video must be 200 MB or smaller."},413);
   if(!/^video\//.test(sourceVideo.type))return noStore({success:false,error:"Uploaded media must be a video file."},400);
  }
  if(videoTasks.has(task)&&!hasVideo)return noStore({success:false,error:"Upload the video you want Soolen AI to transform."},400);
  if(imageTasks.has(task)&&!hasImage)return noStore({success:false,error:"Upload the photo or cartoon you want Soolen AI to transform."},400);

  const transformations={
   "real-to-cartoon":{inputType:"real-person-image",outputType:"cartoon-stylized",preserve:["identity","pose","clothing","composition"]},
   "cartoon-to-real":{inputType:"cartoon-or-illustration",outputType:"realistic-human-style",preserve:["character-design","costume","colors","expression","composition"]},
   "real-video-to-cartoon":{inputType:"real-person-video",outputType:"cartoon-stylized-video",preserve:["identity","motion","timing","camera","audio","scene-continuity"]},
   "cartoon-video-to-real":{inputType:"cartoon-video",outputType:"realistic-human-style-video",preserve:["character-design","motion","timing","camera","audio","scene-continuity"]}
  };
  const transformation=transformations[task]||null;
  const shareSpareCompute=Boolean(devicePolicy?.shareSpareCompute);
  const dataPolicy=createDataHandlingPolicy({executionTarget,hasPrivateMedia:hasImage||hasVideo,hasUploadedVoice:voiceSource==="upload"&&hasVoice,shareSpareCompute});

  const result=await generateSoolenVideo({prompt,task,mode,duration,language,voiceSource,voice,style,music,captions,userId:user.id,executionTarget,preferredChunkSeconds,deviceCapabilities,shareSpareCompute,transformation:transformation?JSON.stringify(transformation):null,referenceImage:hasImage?referenceImage:null,sourceVideo:hasVideo?sourceVideo:null,voiceFile:voiceSource==="upload"&&hasVoice?voiceFile:null});

  return noStore({...result,transformation,dataPolicy});
 }catch(error){
  console.error("Soolen media generation failed:",error?.code||error?.name||"unknown");
  if(error instanceof SoolenVideoEngineError)return noStore({success:false,error:error.message,code:error.code},error.status);
  return noStore({success:false,error:"Unable to start media generation right now."},500);
 }
}
