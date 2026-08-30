import { NextResponse } from "next/server";
import { generateWithFallback } from "../../../../engine/ai-provider.js";
import { getVideoComputePolicy, normalizeDeviceClass } from "../../../../lib/video/compute-policy.js";

export async function POST(request) {
  try {
    const { prompt, duration, style = "realistic", deviceClass = "mobile", signals = {} } = await request.json();
    const idea = String(prompt || "").trim();
    if (!idea) return NextResponse.json({ error:"Video idea is required." }, { status:400 });
    const policy = getVideoComputePolicy(normalizeDeviceClass(deviceClass), signals);
    const seconds = Math.min(policy.maxClipSeconds, Math.max(4, Number(duration) || policy.defaultClipSeconds));
    const safeStyle = ["realistic","cartoon","mixed"].includes(style) ? style : "realistic";
    const instruction = `You are SoolenAI. Create a short original ${safeStyle} video storyboard for this app/business idea: ${idea}. Return ONLY JSON with title, scenes. Create ${Math.max(2,Math.round(seconds/4))} scenes. Each scene has duration, headline, caption, visual. No copyrighted logos or copied brand assets. Keep scenes concise so they can later be connected inside SoolenAI Video Editor.`;
    const { provider, result } = await generateWithFallback(instruction);
    const clean = String(result).replace(/```json|```/gi, "").trim();
    const start=clean.indexOf("{"); const end=clean.lastIndexOf("}");
    const storyboard=JSON.parse(clean.slice(start,end+1));
    return NextResponse.json({ success:true, engine:"Soolen Video Engine", provider, storyboard, duration:seconds, style:safeStyle, experience:{label:policy.label,maxClipSeconds:policy.maxClipSeconds,maxProjectSeconds:policy.maxProjectSeconds}, renderMode:"server-first", note:"Customer devices handle lightweight preview and edit decisions; heavy generation and final rendering stay server-side." });
  } catch(error) { console.error("SOOLEN_VIDEO_STORYBOARD_ERROR:",error); return NextResponse.json({error:error?.message||"Unable to create video storyboard."},{status:500}); }
}
