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
import { createClient as createCompatibilityClient } from "../../../../lib/supabase/server.js";

const FRESH_COMPATIBILITY_SIGN_IN_MS=5*60*1000;

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

async function mintFromCompatibilityIdentity({requireFreshSignIn=false}={}){
  const compatibilityClient=await createCompatibilityClient();
  const {data,error}=await compatibilityClient.auth.getUser();
  const user=data?.user;
  if(error||!user?.id)return null;
  if(requireFreshSignIn){
    const signedInAt=Date.parse(String(user.last_sign_in_at||""));
    const age=Date.now()-signedInAt;
    if(!Number.isFinite(signedInAt)||age<0||age>FRESH_COMPATIBILITY_SIGN_IN_MS)return null;
  }
  const migrated=await createLaneriqSession(user.id);
  return {userId:user.id,token:migrated.token,expiresAt:migrated.expiresAt};
}

export async function GET(request){
  const token=String(request.cookies.get(LANERIQ_SESSION_COOKIE)?.value||"");
  const mode=request.cookies.get(LANERIQ_SESSION_MODE_COOKIE)?.value;
  let laneriqSession=null;
  try{
    laneriqSession=await validateLaneriqSessionToken(token);
  }catch{
    return responseJson({success:false,authenticated:false,sessionAuthority:"laneriq",code:"SESSION_NOT_READY"},503);
  }
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
  // compatibility cookie as an authentication source.
  if(isLaneriqPrimarySessionMode(mode)){
    return responseJson({success:false,authenticated:false,sessionAuthority:"laneriq",code:"SESSION_REQUIRED"},401);
  }

  // Temporary legacy migration path. This is provider-opaque to customer-facing APIs.
  try{
    const migrated=await mintFromCompatibilityIdentity();
    if(!migrated)return responseJson({success:false,authenticated:false,sessionAuthority:"laneriq",code:"SESSION_REQUIRED"},401);
    const response=responseJson({
      success:true,
      authenticated:true,
      migrated:true,
      sessionAuthority:"laneriq",
      compatibilityBridge:"legacy_data_access_transition",
      user:{id:migrated.userId},
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
  const action=String(body?.action||"").trim().toLowerCase();

  // Used only immediately after the current WhatsApp compatibility OTP succeeds.
  // The primary-mode marker still blocks all passive/stale compatibility fallback.
  if(action==="upgrade_verified_compatibility"){
    try{
      const upgraded=await mintFromCompatibilityIdentity({requireFreshSignIn:true});
      if(!upgraded)return responseJson({success:false,authenticated:false,sessionAuthority:"laneriq",code:"FRESH_VERIFICATION_REQUIRED"},401);
      const response=responseJson({
        success:true,
        authenticated:true,
        upgraded:true,
        sessionAuthority:"laneriq",
        compatibilityBridge:"legacy_data_access_transition",
        user:{id:upgraded.userId},
        expiresAt:upgraded.expiresAt,
      });
      return setPrimaryCookies(response,upgraded.token);
    }catch{
      return responseJson({success:false,authenticated:false,sessionAuthority:"laneriq",code:"SESSION_NOT_READY"},503);
    }
  }

  if(action!=="logout")return responseJson({success:false,error:"Unsupported session action.",code:"SESSION_ACTION_INVALID"},400);

  const token=String(request.cookies.get(LANERIQ_SESSION_COOKIE)?.value||"");
  let revoked=false;
  if(token){
    try{
      revoked=await revokeLaneriqSessionToken(token);
    }catch{
      // Do not clear the browser token when authoritative revocation could not be confirmed.
      return responseJson({success:false,authenticated:true,sessionAuthority:"laneriq",code:"SESSION_REVOKE_UNAVAILABLE"},503);
    }
  }

  let compatibilityCleared=false;
  try{
    const compatibilityClient=await createCompatibilityClient();
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
