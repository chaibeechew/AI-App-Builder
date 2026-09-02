import { NextResponse } from "next/server";
import {
  LANERIQ_SESSION_COOKIE,
  LANERIQ_SESSION_MODE_COOKIE,
  LANERIQ_SESSION_MODE_VALUE,
  createLaneriqSession,
  isLaneriqPrimarySessionMode,
  laneriqSessionClearCookieOptions,
  laneriqSessionCookieOptions,
  laneriqSessionModeCookieOptions,
  revokeLaneriqSessionToken,
  validateLaneriqSessionToken,
} from "../../../../lib/auth/laneriq-session.js";
import { createClient as createSupabaseCompatibilityClient } from "../../../../lib/supabase/server.js";

function responseJson(payload,status=200){
  const response=NextResponse.json(payload,{status});
  response.headers.set("Cache-Control","private, no-store, max-age=0");
  response.headers.set("Pragma","no-cache");
  response.headers.set("X-Content-Type-Options","nosniff");
  response.headers.set("Vary","Cookie");
  return response;
}

function sameOrigin(request){
  try{
    const origin=request.headers.get("origin");
    if(!origin)return false;
    const originHost=new URL(origin).host;
    const expectedHost=request.headers.get("x-forwarded-host")||request.headers.get("host")||request.nextUrl.host;
    const fetchSite=String(request.headers.get("sec-fetch-site")||"").toLowerCase();
    return originHost===expectedHost&&fetchSite!=="cross-site";
  }catch{return false;}
}

function setPrimaryCookies(response,token){
  response.cookies.set(LANERIQ_SESSION_COOKIE,token,laneriqSessionCookieOptions());
  response.cookies.set(LANERIQ_SESSION_MODE_COOKIE,LANERIQ_SESSION_MODE_VALUE,laneriqSessionModeCookieOptions());
  return response;
}

export async function GET(request){
  const token=String(request.cookies.get(LANERIQ_SESSION_COOKIE)?.value||"");
  const mode=request.cookies.get(LANERIQ_SESSION_MODE_COOKIE)?.value;
  const laneriqSession=await validateLaneriqSessionToken(token);
  if(laneriqSession){
    return responseJson({
      success:true,
      authenticated:true,
      sessionAuthority:"laneriq",
      user:{id:laneriqSession.userId},
      expiresAt:laneriqSession.expiresAt,
    });
  }

  // Once a browser has moved to LANERIQ-primary mode, never resurrect a stale
  // compatibility-provider cookie as an authentication source.
  if(isLaneriqPrimarySessionMode(mode)){
    return responseJson({success:false,authenticated:false,sessionAuthority:"laneriq",code:"SESSION_REQUIRED"},401);
  }

  // Temporary legacy migration path: an already-signed-in customer is upgraded
  // to a LANERIQ session automatically, without asking them to link or configure anything.
  try{
    const compatibilityClient=await createSupabaseCompatibilityClient();
    const {data,error}=await compatibilityClient.auth.getUser();
    const user=data?.user;
    if(error||!user?.id)return responseJson({success:false,authenticated:false,sessionAuthority:"laneriq",code:"SESSION_REQUIRED"},401);
    const migrated=await createLaneriqSession(user.id);
    const response=responseJson({
      success:true,
      authenticated:true,
      migrated:true,
      sessionAuthority:"laneriq",
      compatibilityBridge:"supabase_data_access_transition",
      user:{id:user.id},
      expiresAt:migrated.expiresAt,
    });
    return setPrimaryCookies(response,migrated.token);
  }catch{
    return responseJson({success:false,authenticated:false,sessionAuthority:"laneriq",code:"SESSION_NOT_READY"},503);
  }
}

export async function POST(request){
  if(!sameOrigin(request))return responseJson({success:false,error:"Session request was blocked.",code:"ORIGIN_REQUIRED"},403);
  if(!String(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return responseJson({success:false,error:"JSON request required.",code:"JSON_REQUIRED"},415);
  const body=await request.json().catch(()=>({}));
  if(String(body?.action||"").toLowerCase()!=="logout")return responseJson({success:false,error:"Unsupported session action.",code:"SESSION_ACTION_INVALID"},400);

  const token=String(request.cookies.get(LANERIQ_SESSION_COOKIE)?.value||"");
  const revoked=token?await revokeLaneriqSessionToken(token):false;
  let compatibilityCleared=false;
  try{
    const compatibilityClient=await createSupabaseCompatibilityClient();
    const {error}=await compatibilityClient.auth.signOut({scope:"local"});
    compatibilityCleared=!error;
  }catch{}

  const response=responseJson({
    success:true,
    authenticated:false,
    sessionAuthority:"laneriq",
    revoked:revoked||!token,
    compatibilityCleared,
  });
  response.cookies.set(LANERIQ_SESSION_COOKIE,"",laneriqSessionClearCookieOptions());
  // Intentionally keep the primary marker. It prevents any stale compatibility
  // cookie that survived provider cleanup from silently re-authenticating the browser.
  response.cookies.set(LANERIQ_SESSION_MODE_COOKIE,LANERIQ_SESSION_MODE_VALUE,laneriqSessionModeCookieOptions());
  return response;
}
