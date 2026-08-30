import { NextResponse } from "next/server";
import { generateWithFallback } from "../../../../engine/ai-provider.js";
import { getVideoComputePolicy, normalizeDeviceClass } from "../../../../lib/video/compute-policy.js";
import { createClient } from "../../../../lib/supabase/server.js";
import { buildProjectMemoryBrief } from "../../../../lib/project-memory.js";

export async function POST(request) {
  try {
    const { prompt, duration, style = "realistic", deviceClass = "mobile", signals = {}, appId = null } = await request.json();
    const idea = String(prompt || "").trim();
    if (!idea) return NextResponse.json({ error:"Video idea is required." }, { status:400 });
    const policy = getVideoComputePolicy(normalizeDeviceClass(deviceClass), signals);
    const seconds = Math.min(policy.maxClipSeconds, Math.max(4, Number(duration) || policy.defaultClipSeconds));
    const safeStyle = ["realistic","cartoon","mixed"].includes(style) ? style : "realistic";

    let memoryBrief="";
    if(appId){
      const supabase=await createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(user){
        const {data:app}=await supabase.from("apps").select("id").eq("id",appId).eq("owner_id",user.id).maybeSingle();
        if(app){
          const {data:memory}=await supabase.from("project_memory").select("memory_json,learning_scope").eq("app_id",appId).eq("owner_id",user.id).maybeSingle();
          memoryBrief=buildProjectMemoryBrief(memory);
        }
      }
    }

    const instruction = `You are SoolenAI. Create a short original ${safeStyle} video storyboard for this app/business idea: ${idea}. ${memoryBrief?`Use this project-specific memory for continuity:\n${memoryBrief}\n`:""}Return ONLY JSON with title, scenes. Create ${Math.max(2,Math.round(seconds/4))} scenes. Each scene has duration, headline, caption, visual. No copyrighted logos or copied brand assets. Keep scenes concise so they can later be connected inside SoolenAI Video Editor. Current customer instruction overrides older memory when they conflict.`;
    const { provider, result } = await generateWithFallback(instruction);
    const clean = String(result).replace(/```json|```/gi, "").trim();
    const start=clean.indexOf("{"); const end=clean.lastIndexOf("}");
    const storyboard=JSON.parse(clean.slice(start,end+1));
    return NextResponse.json({ success:true, engine:"Soolen Video Engine", provider, storyboard, duration:seconds, style:safeStyle, projectMemoryApplied:Boolean(memoryBrief), experience:{label:policy.label,maxClipSeconds:policy.maxClipSeconds,maxProjectSeconds:policy.maxProjectSeconds}, renderMode:"server-first", note:"Customer devices handle lightweight preview and edit decisions; heavy generation and final rendering stay server-side." });
  } catch(error) { console.error("SOOLEN_VIDEO_STORYBOARD_ERROR:",error); return NextResponse.json({error:error?.message||"Unable to create video storyboard."},{status:500}); }
}
