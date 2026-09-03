import { createAdminClient } from "../supabase/admin.js";

function safeUserId(value){
  const text=String(value||"").trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text))throw new Error("LANERIQ in-app recipient must be a user UUID.");
  return text;
}
function safeText(value,label,max){
  const text=String(value||"").trim();
  if(!text||text.length>max)throw new Error(`${label} is invalid.`);
  return text;
}
function safeHref(value){
  const text=String(value||"").trim();
  if(!text)return null;
  if(text.length>1000)throw new Error("LANERIQ in-app href is invalid.");
  if(text.startsWith("/")&&!text.startsWith("//"))return text;
  try{
    const url=new URL(text);
    if(url.protocol!=="https:")throw new Error();
    return url.toString();
  }catch{
    throw new Error("LANERIQ in-app href must be a relative path or HTTPS URL.");
  }
}
function safeMetadata(value){
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  const json=JSON.stringify(value);
  if(json.length>4000)throw new Error("LANERIQ in-app metadata is too large.");
  return JSON.parse(json);
}

export function inAppProviderStatus(){
  const configured=Boolean(String(process.env.NEXT_PUBLIC_SUPABASE_URL||"").trim()&&String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim());
  return {configured,ready:configured,evidenceLevel:"CODE",costClass:"free",liveVerified:false};
}

export async function sendInAppNotification(payload={}){
  const userId=safeUserId(payload?.to);
  const title=safeText(payload?.title||payload?.subject||"LANERIQ AI","LANERIQ in-app title",180);
  const body=safeText(payload?.body||payload?.text,"LANERIQ in-app body",4000);
  const href=safeHref(payload?.href||payload?.url);
  const purpose=safeText(payload?.purpose||"transactional","LANERIQ in-app purpose",40);
  const metadata=safeMetadata(payload?.metadata);
  const supabase=createAdminClient();
  const {data,error}=await supabase.rpc("server_create_in_app_notification",{
    p_user_id:userId,
    p_title:title,
    p_body:body,
    p_href:href,
    p_purpose:purpose,
    p_metadata:metadata,
  });
  if(error){
    const err=new Error("LANERIQ in-app delivery failed.");
    err.code="in_app_delivery_failed";
    throw err;
  }
  const messageId=String(data||"").trim();
  if(!messageId){
    const err=new Error("LANERIQ in-app delivery returned no message id.");
    err.code="in_app_delivery_invalid_receipt";
    throw err;
  }
  return {status:"delivered",channel:"in_app",messageId,evidenceLevel:"CODE"};
}
