import {NextResponse} from "next/server";
import {createClient} from "../../../../lib/supabase/server.js";

const MAX_AUDIO=20*1024*1024;
const MAX_IMAGE=20*1024*1024;
const MAX_VIDEO=200*1024*1024;
const allowedModes=new Set(["real","animation"]);
const allowedVoiceSources=new Set(["ai","upload"]);
const allowedTasks=new Set(["create","edit-video","animate-photo","restyle-photo","real-to-cartoon","cartoon-to-real"]);
const imageTasks=new Set(["animate-photo","restyle-photo","real-to-cartoon","cartoon-to-real"]);

export async function POST(request){
 try{
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({success:false,error:"Authentication required."},{status:401});
  const form=await request.formData();
  const prompt=String(form.get("prompt")||"").trim();
  const task=String(form.get("task")||"create");
  const mode=String(form.get("mode")||"real");
  const voiceSource=String(form.get("voiceSource")||"ai");
  const duration=Math.min(60,Math.max(5,Number(form.get("duration")||30)));
  const language=String(form.get("language")||"English");
  const voice=String(form.get("voice")||"Warm Female");
  const style=String(form.get("style")||"Cinematic");
  const music=String(form.get("music"))==="true";
  const captions=String(form.get("captions"))==="true";
  const consent=String(form.get("consent"))==="true";
  const referenceImage=form.get("referenceImage");
  const sourceVideo=form.get("sourceVideo");
  const voiceFile=form.get("voiceFile");

  if(!prompt)return NextResponse.json({success:false,error:"Please describe what you want Soolen AI to create or change."},{status:400});
  if(!allowedTasks.has(task))return NextResponse.json({success:false,error:"Unsupported media task."},{status:400});
  if(!allowedModes.has(mode))return NextResponse.json({success:false,error:"Unsupported video mode."},{status:400});
  if(!allowedVoiceSources.has(voiceSource))return NextResponse.json({success:false,error:"Unsupported voice source."},{status:400});

  const hasImage=referenceImage instanceof File&&referenceImage.size>0;
  const hasVideo=sourceVideo instanceof File&&sourceVideo.size>0;
  const hasVoice=voiceFile instanceof File&&voiceFile.size>0;
  if((hasImage||hasVideo||voiceSource==="upload")&&!consent)return NextResponse.json({success:false,error:"Please confirm that you own or have permission to use the uploaded photo, video and voice."},{status:400});

  if(voiceSource==="upload"){
   if(!hasVoice)return NextResponse.json({success:false,error:"Please upload a voice sample."},{status:400});
   if(voiceFile.size>MAX_AUDIO)return NextResponse.json({success:false,error:"Voice sample must be 20 MB or smaller."},{status:413});
   if(!/^audio\//.test(voiceFile.type))return NextResponse.json({success:false,error:"Voice sample must be an audio file."},{status:400});
  }
  if(hasImage){
   if(referenceImage.size>MAX_IMAGE)return NextResponse.json({success:false,error:"Photo must be 20 MB or smaller."},{status:413});
   if(!/^image\//.test(referenceImage.type))return NextResponse.json({success:false,error:"Photo must be an image file."},{status:400});
  }
  if(hasVideo){
   if(sourceVideo.size>MAX_VIDEO)return NextResponse.json({success:false,error:"Video must be 200 MB or smaller."},{status:413});
   if(!/^video\//.test(sourceVideo.type))return NextResponse.json({success:false,error:"Uploaded media must be a video file."},{status:400});
  }
  if(task==="edit-video"&&!hasVideo)return NextResponse.json({success:false,error:"Upload the video you want to modify."},{status:400});
  if(imageTasks.has(task)&&!hasImage)return NextResponse.json({success:false,error:"Upload the photo or cartoon you want to transform."},{status:400});

  const transformation=task==="real-to-cartoon"?{
    inputType:"real-person-image",outputType:"cartoon-stylized",preserve:["identity","pose","clothing","composition"]
  }:task==="cartoon-to-real"?{
    inputType:"cartoon-or-illustration",outputType:"realistic-human-style",preserve:["character-design","costume","colors","expression","composition"]
  }:null;

  const providerUrl=process.env.SOOLEN_MEDIA_PROVIDER_URL;
  if(!providerUrl)return NextResponse.json({success:false,error:"Soolen AI media engine is not configured yet.",code:"MEDIA_ENGINE_NOT_CONFIGURED"},{status:503});

  const outbound=new FormData();
  Object.entries({prompt,task,mode,duration,language,voiceSource,voice,style,music,captions,userId:user.id}).forEach(([k,v])=>outbound.set(k,String(v)));
  if(transformation)outbound.set("transformation",JSON.stringify(transformation));
  if(hasImage)outbound.set("referenceImage",referenceImage,referenceImage.name);
  if(hasVideo)outbound.set("sourceVideo",sourceVideo,sourceVideo.name);
  if(voiceSource==="upload"&&hasVoice)outbound.set("voiceFile",voiceFile,voiceFile.name);

  const headers={};if(process.env.SOOLEN_MEDIA_PROVIDER_KEY)headers.Authorization=`Bearer ${process.env.SOOLEN_MEDIA_PROVIDER_KEY}`;
  const r=await fetch(providerUrl,{method:"POST",headers,body:outbound,cache:"no-store"});
  const text=await r.text();let data={};try{data=JSON.parse(text)}catch{data={message:text}}
  if(!r.ok)return NextResponse.json({success:false,error:data?.error||"Soolen AI could not start this media job."},{status:r.status>=400&&r.status<600?r.status:502});
  return NextResponse.json({success:true,jobId:data.jobId||data.id||null,status:data.status||"queued",videoUrl:data.videoUrl||data.url||null,task,mode,voiceSource,transformation});
 }catch(error){
  console.error("Soolen media generation error:",error);
  return NextResponse.json({success:false,error:"Unable to start media generation right now."},{status:500});
 }
}
