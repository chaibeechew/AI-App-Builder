import { NextResponse } from "next/server";
import {
  LANERIQ_SESSION_COOKIE,
  LANERIQ_SESSION_MODE_COOKIE,
  LANERIQ_SESSION_MODE_VALUE,
  laneriqSessionCookieOptions,
  laneriqSessionModeCookieOptions,
} from "../../../../../lib/auth/laneriq-session.js";
import { normalizeEmailAddress, normalizeEmailOtp } from "../../../../../lib/auth/otp-policy.js";
import { verifyLaneriqEmailVerification } from "../../../../../lib/verification/server.js";

function json(payload,status=200,retryAfter=0){const response=NextResponse.json(payload,{status});response.headers.set("Cache-Control","private, no-store, max-age=0");response.headers.set("Pragma","no-cache");response.headers.set("X-Content-Type-Options","nosniff");response.headers.set("Vary","Cookie");if(retryAfter>0)response.headers.set("Retry-After",String(Math.ceil(retryAfter)));return response;}
function sameOrigin(request){try{const origin=request.headers.get("origin");if(!origin)return false;const originHost=new URL(origin).host;const expectedHost=request.headers.get("x-forwarded-host")||request.headers.get("host")||request.nextUrl.host;const fetchSite=String(request.headers.get("sec-fetch-site")||"").toLowerCase();return originHost===expectedHost&&fetchSite!=="cross-site";}catch{return false;}}

export async function POST(request){
  try{
    if(!sameOrigin(request))return json({success:false,error:"Verification request was blocked.",code:"ORIGIN_REQUIRED"},403);
    if(!String(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({success:false,error:"JSON request required.",code:"JSON_REQUIRED"},415);
    const body=await request.json().catch(()=>({}));
    const method=String(body?.method||"email").trim().toLowerCase();
    if(method!=="email")return json({success:false,error:"This LANERIQ verification endpoint currently supports Email Code only.",code:"METHOD_NOT_ALLOWED"},400);
    const email=normalizeEmailAddress(body?.identifier);
    const code=normalizeEmailOtp(body?.code);
    const challengeId=String(body?.challengeId||"").trim();
    const result=await verifyLaneriqEmailVerification({email,challengeId,code});
    if(!result?.success){
      const messages={
        VERIFICATION_INVALID:"The verification code is incorrect. Check it and try again.",
        VERIFICATION_EXPIRED:"This verification code has expired. Request a new code.",
        VERIFICATION_LOCKED:"Too many incorrect attempts. Request a new verification code.",
        VERIFICATION_ALREADY_USED:"This verification code has already been used. Request a new code.",
        VERIFICATION_NOT_READY:"Email verification is not available yet.",
        SESSION_AUTHORITY_FAILED:"Your code was verified, but the secure LANERIQ session could not be completed. Request a new code and try again.",
      };
      const status=Number(result?.status||400);
      return json({success:false,error:messages[result?.code]||"Unable to complete email verification right now.",code:result?.code||"VERIFICATION_FAILED",attempts:result?.attempts,maxAttempts:result?.maxAttempts},status,status===429?60:0);
    }
    if(!result.sessionToken)return json({success:false,error:"The secure LANERIQ session could not be completed.",code:"SESSION_AUTHORITY_FAILED"},503);
    const response=json({success:true,service:"LANERIQ Verification",otpAuthority:"laneriq",sessionAuthority:"laneriq",sessionCreated:true});
    response.cookies.set(LANERIQ_SESSION_COOKIE,result.sessionToken,laneriqSessionCookieOptions());
    response.cookies.set(LANERIQ_SESSION_MODE_COOKIE,LANERIQ_SESSION_MODE_VALUE,laneriqSessionModeCookieOptions());
    return response;
  }catch{
    return json({success:false,error:"Unable to complete email verification right now.",code:"VERIFICATION_FAILED"},503);
  }
}
