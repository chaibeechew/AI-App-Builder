import {NextResponse} from "next/server";
import {createClient} from "../../../../lib/supabase/server.js";

const MAX_UPLOAD=20*1024*1024;
const allowedModes=new Set(["real","animation"]);
const allowedVoiceSources=new Set(["ai","upload"]);

export async function POST(request){
 try{
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({success:false,error:"Authentication required."},{status:401});

  const form=await request.formData();
  const prompt=String(form.get("prompt")||"").trim();
  const mode=String(form.get("mode")||"real");
  const voiceSource=String(form.get("voiceSource")||"ai");
  const duration=Math.min(60,Math.max(5,Number(form.get("duration")||30)));
  const language=String(form.get("language")||"English");
  const voice=String(form.get("voice")||"Warm Female");
  const style=String(form.get("style")||"Cinematic");
  const music=String(form.get("music"))==="true";
  const captions=String(form.get("captions"))==="true";
  const referenceImage=form.get("referenceImage");
  const voiceFile=form.get("voiceFile");

  if(!prompt)return NextResponse.json({success:false,error:"Please describe the video you want."},{status:400});
  if(!allowedModes.has(mode))return NextResponse.json({success:false,error:"Unsupported video mode."},{status:400});
  if(!allowedVoiceSources.has(voiceSource))return NextResponse.json({success:false,error:"Unsupported voice source."},{status:400});
  if(voiceSource==="upload"){
   if(!(voiceFile instanceof File)||!voiceFile.size)return NextResponse.json({success:false,error:"Please upload a voice sample."},{status:400});
   if(voiceFile.size>MAX_UPLOAD)return NextResponse.json({success:false,error:"Voice sample must be 20 MB or smaller."},{status:413});
   if(!/^audio\//.test(voiceFile.type))return NextResponse.json({success:false,error:"Voice sample must be an audio file."},{status:400});
  }
  if(referenceImage instanceof File&&referenceImage.size>MAX_UPLOAD)return NextResponse.json({success:false,error:"Reference image must be 20 MB or smaller."},{status:413});

  const providerUrl=process.env.SOOLEN_MEDIA_PROVIDER_URL;
  if(!providerUrl)return NextResponse.json({success:false,error:"Soolen AI media provider is not configured yet.",code:"MEDIA_PROVIDER_NOT_CONFIGURED"},{status:503});

  const outbound=new FormData();
  outbound.set("prompt",prompt);outbound.set("mode",mode);outbound.set("duration",String(duration));outbound.set("language",language);outbound.set("voiceSource",voiceSource);outbound.set("voice",voice);outbound.set("style",style);outbound.set("music",String(music));outbound.set("captions",String(captions));outbound.set("userId",user.id);
  if(referenceImage instanceof File&&referenceImage.size)outbound.set("referenceImage",referenceImage,referenceImage.name);
  if(voiceSource==="upload"&&voiceFile instanceof File)outbound.set("voiceFile",voiceFile,voiceFile.name);

  const headers={};if(process.env.SOOLEN_MEDIA_PROVIDER_KEY)headers.Authorization=`Bearer ${process.env.SOOLEN_MEDIA_PROVIDER_KEY}`;
  const r=await fetch(providerUrl,{method:"POST",headers,body:outbound,cache:"no-store"});
  const text=await r.text();let data={};try{data=JSON.parse(text)}catch{data={message:text}}
  if(!r.ok)return NextResponse.json({success:false,error:data?.error||"Media provider could not start the generation."},{status:r.status>=400&&r.status<600?r.status:502});
  return NextResponse.json({success:true,jobId:data.jobId||data.id||null,status:data.status||"queued",videoUrl:data.videoUrl||data.url||null,provider:data.provider||"soolen-media-router",mode,voiceSource});
 }catch(error){console.error("Soolen media generation error:",error);return NextResponse.json({success:false,error:"Unable to start media generation right now."},{status:500})}
}
