import { NextResponse } from "next/server";

export async function POST(request){
  try{
    const { imageData, mimeType="image/jpeg" } = await request.json();
    if(!imageData) return NextResponse.json({error:"Image is required."},{status:400});
    const key=process.env.GEMINI_API_KEY;
    if(!key) return NextResponse.json({error:"Image recognition needs a configured vision provider. No OpenAI image API is used."},{status:503});
    const base64=String(imageData).replace(/^data:[^;]+;base64,/,'');
    const model=process.env.GEMINI_VISION_MODEL||"gemini-2.5-flash";
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"You are Soolen AI Vision. Analyze this uploaded image. Identify visible objects, likely industry/use case, layout, colors, text if readable, and useful UI/design insights. Return concise JSON with objects, category, description, text, colors, designInsights, confidence. Do not identify a private person or infer sensitive personal traits."},{inline_data:{mime_type:mimeType,data:base64}}]}]})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return NextResponse.json({error:"Vision provider failed.",detail:data?.error?.message||`HTTP ${response.status}`},{status:502});
    const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
    return NextResponse.json({success:true,engine:"Soolen AI Vision",result:text.replace(/```json|```/gi,"").trim()});
  }catch(error){console.error("SOOLEN_VISION_ERROR:",error);return NextResponse.json({error:error?.message||"Unable to analyze image."},{status:500});}
}
