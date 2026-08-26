import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data:{user}, error:userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({error:"Authentication required."},{status:401});
    const body = await request.json();
    const appId = String(body?.appId || "").trim();
    const versionId = String(body?.versionId || "").trim();
    if (!appId || !versionId) return NextResponse.json({error:"appId and versionId are required."},{status:400});
    const { data, error } = await supabase.rpc("create_app_demo", { p_app_id:appId,p_version_id:versionId,p_hours:72 });
    if (error) throw error;
    return NextResponse.json({success:true,demo:data,capabilities:{preview:true,testData:true,storePublish:false,payments:false}});
  } catch(error) {
    console.error("Demo API error:",error);
    return NextResponse.json({error:"Unable to create demo."},{status:400});
  }
}
