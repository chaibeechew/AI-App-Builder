import { NextResponse } from "next/server";
import { generateWithFallback } from "../../../../engine/ai-provider.js";

export async function POST(request) {
  try {
    const { prompt, duration = 12 } = await request.json();
    const idea = String(prompt || "").trim();
    if (!idea) return NextResponse.json({ error:"Video idea is required." }, { status:400 });
    const seconds = Math.min(60, Math.max(4, Number(duration) || 12));
    const instruction = `You are Soolen AI. Create a short original video storyboard for this app/business idea: ${idea}. Return ONLY JSON with title, scenes. Create ${Math.max(2,Math.round(seconds/4))} scenes. Each scene has duration, headline, caption, visual. No copyrighted logos or copied brand assets.`;
    const { provider, result } = await generateWithFallback(instruction);
    const clean = String(result).replace(/```json|```/gi, "").trim();
    const start=clean.indexOf("{"); const end=clean.lastIndexOf("}");
    const storyboard=JSON.parse(clean.slice(start,end+1));
    return NextResponse.json({ success:true, engine:"Soolen Video Engine", provider, storyboard, duration:seconds, renderMode:"browser-canvas" });
  } catch(error) { console.error("SOOLEN_VIDEO_STORYBOARD_ERROR:",error); return NextResponse.json({error:error?.message||"Unable to create video storyboard."},{status:500}); }
}
