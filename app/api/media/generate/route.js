import {NextResponse} from "next/server";
import {createClient} from "../../../../lib/supabase/server.js";
import {generateSoolenVideo,SoolenVideoEngineError} from "../../../../lib/soolen/video-engine.js";

const MAX_AUDIO=20*1024*1024;
const MAX_IMAGE=20*1024*1024;
const MAX_VIDEO=200*1024*1024;
const imageTasks=new Set(["animate-photo","restyle-photo","real-to-cartoon","cartoon-to-real"]);
const videoTasks=new Set(["edit-video","real-video-to-cartoon","cartoon-video-to-real"]);

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
  const duration=Number(form.get("duration")||30);
  const language=String(form.get("language")||"English");
  const voice=String(form.get("voice")||"Warm Female");
  const style=String(form.get("style")||"Cinematic");
  const music=String(form.get("music"))==="true";
  const captions=String(form.get("captions"))==="true";
  const consent=String(form.get("consent"))==="true";
  const referenceImage=form.get("referenceImage");
  const sourceVideo=form.get("sourceVideo");
  const voiceFile=form.get("voiceFile");

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
  if(videoTasks.has(task)&&!hasVideo)return NextResponse.json({success:false,error:"Upload the video you want Soolen AI to transform."},{status:400});
  if(imageTasks.has(task)&&!hasImage)return NextResponse.json({success:false,error:"Upload the photo or cartoon you want Soolen AI to transform."},{status:400});

  const transformations={
   "real-to-cartoon":{inputType:"real-person-image",outputType:"cartoon-stylized",preserve:["identity","pose","clothing","composition"]},
   "cartoon-to-real":{inputType:"cartoon-or-illustration",outputType:"realistic-human-style",preserve:["character-design","costume","colors","expression","composition"]},
   "real-video-to-cartoon":{inputType:"real-person-video",outputType:"cartoon-stylized-video",preserve:["identity","motion","timing","camera","audio"]},
   "cartoon-video-to-real":{inputType:"cartoon-video",outputType:"realistic-human-style-video",preserve:["character-design","motion","timing","camera","audio"]}
  };
  const transformation=transformations[task]||null;

  const result=await generateSoolenVideo({
   prompt,task,mode,duration,language,voiceSource,voice,style,music,captions,userId:user.id,
   transformation:transformation?JSON.stringify(transformation):null,
   referenceImage:hasImage?referenceImage:null,
   sourceVideo:hasVideo?sourceVideo:null,
   voiceFile:voiceSource==="upload"&&hasVoice?voiceFile:null
  });

  return NextResponse.json({...result,transformation});
 }catch(error){
  console.error("Soolen media generation error:",error);
  if(error instanceof SoolenVideoEngineError)return NextResponse.json({success:false,error:error.message,code:error.code},{status:error.status});
  return NextResponse.json({success:false,error:"Unable to start media generation right now."},{status:500});
 }
}
