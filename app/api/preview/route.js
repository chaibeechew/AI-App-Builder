import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";
import { createPreview } from "../../../engine/preview-engine.js";
import { selfTestGeneratedApp } from "../../../lib/generator/self-test.js";
import { buildAppExplanation } from "../../../lib/generator/app-explanation.js";

export async function POST(request){
  try{
    const supabase=await createClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const body=await request.json();
    const appId=String(body?.appId||"").trim();
    if(!appId)return NextResponse.json({error:"appId is required."},{status:400});
    const {data:app,error:appError}=await supabase.from("apps").select("id,name,description,current_version_id").eq("id",appId).eq("owner_id",user.id).single();
    if(appError||!app)return NextResponse.json({error:"App not found or access denied."},{status:404});
    const versionId=body?.versionId||app.current_version_id;
    const {data:version,error:versionError}=await supabase.from("app_versions").select("id,version_no,specification").eq("id",versionId).eq("app_id",appId).single();
    if(versionError||!version)return NextResponse.json({error:"Version not found."},{status:404});
    const test=selfTestGeneratedApp(version.specification);
    if(!test.ok)return NextResponse.json({error:"This version needs repair before preview.",test},{status:422});
    const preview=await createPreview({idea:app.description,specification:test.normalizedSpec});
    return NextResponse.json({success:true,app:{id:app.id,name:app.name},version,preview,selfTest:test,explanation:buildAppExplanation(test.normalizedSpec)});
  }catch(error){console.error("Preview API error:",error);return NextResponse.json({error:"Unable to prepare preview."},{status:500});}
}
