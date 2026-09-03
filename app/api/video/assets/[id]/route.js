import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../../lib/supabase/admin.js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}

export async function GET(request,{params}){
  try{
    const {id}=await params;if(!UUID.test(String(id||"")))return noStore({error:"A valid video asset id is required."},400);
    const supabase=await createClient();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)return noStore({error:"Authentication required."},401);
    const{data:asset,error}=await supabase.from("asset_library").select("id,storage_path,file_name,mime_type,intelligence").eq("id",id).eq("user_id",user.id).maybeSingle();if(error)throw error;
    if(!asset||asset.mime_type!=="video/mp4"||asset.intelligence?.purpose!=="video_render_output")return noStore({error:"Video output not found."},404);
    const admin=createAdminClient();const wantsDownload=new URL(request.url).searchParams.get("download")==="1";const options=wantsDownload?{download:asset.file_name||"LANERIQ-video.mp4"}:undefined;const{data:signed,error:signError}=await admin.storage.from("user-assets").createSignedUrl(asset.storage_path,600,options);if(signError||!signed?.signedUrl)throw signError||new Error("VIDEO_SIGN_FAILED");
    const response=NextResponse.redirect(signed.signedUrl,307);response.headers.set("Cache-Control","private, no-store, max-age=0");response.headers.set("Pragma","no-cache");response.headers.set("X-Content-Type-Options","nosniff");return response;
  }catch(error){console.error("VIDEO_ASSET_OPEN_ERROR",error?.name||"unknown");return noStore({error:"Unable to open this private video output."},500);}
}
