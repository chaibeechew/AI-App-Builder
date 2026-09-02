import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { authErrorMessage, normalizeEmailAddress, normalizePhoneNumber } from "../../../../../lib/auth/otp-policy.js";
import { normalizeReferralCode } from "../../../../../lib/auth/session-safety.js";
import { claimLaneriqCommunication, completeLaneriqCommunication } from "../../../../../lib/communications/guard.js";

function json(payload,status=200,retryAfter=0){const response=NextResponse.json(payload,{status});response.headers.set("Cache-Control","private, no-store, max-age=0");response.headers.set("Pragma","no-cache");response.headers.set("X-Content-Type-Options","nosniff");if(retryAfter>0)response.headers.set("Retry-After",String(Math.ceil(retryAfter)));return response;}
function sameOrigin(request){try{const origin=request.headers.get("origin");if(!origin)return false;const originHost=new URL(origin).host;const expectedHost=request.headers.get("x-forwarded-host")||request.headers.get("host")||request.nextUrl.host;const fetchSite=String(request.headers.get("sec-fetch-site")||"").toLowerCase();return originHost===expectedHost&&fetchSite!=="cross-site";}catch{return false;}}
function requestId(value){const id=String(value||"").trim().replace(/[^a-zA-Z0-9._:-]/g,"-").slice(0,120);if(!id)throw new Error("Verification request id is required.");return id;}
function clientScope(request){const forwarded=String(request.headers.get("x-forwarded-for")||"").split(",")[0].trim();const real=String(request.headers.get("x-real-ip")||"").trim();const ip=(forwarded||real||"unknown").slice(0,100);return `verification-ip:${ip}`;}
function providerFailureStatus(error){const code=String(error?.code||"").toLowerCase();if(code.includes("rate"))return 429;if(code==="phone_provider_disabled"||code==="email_provider_disabled")return 503;return 400;}

export async function POST(request){
  let claim=null;
  let method="email";
  try{
    if(!sameOrigin(request))return json({success:false,error:"Verification request was blocked.",code:"ORIGIN_REQUIRED"},403);
    if(!String(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({success:false,error:"JSON request required.",code:"JSON_REQUIRED"},415);
    const body=await request.json().catch(()=>({}));
    method=String(body?.method||"").trim().toLowerCase();
    if(!["email","whatsapp"].includes(method))return json({success:false,error:"Unsupported verification method.",code:"METHOD_NOT_ALLOWED"},400);
    const identifier=method==="email"?normalizeEmailAddress(body?.identifier):normalizePhoneNumber(body?.identifier);
    const id=requestId(body?.requestId);
    const referral=normalizeReferralCode(body?.referral);

    claim=await claimLaneriqCommunication({channel:method,purpose:"verification",scope:clientScope(request),recipient:identifier,idempotencyKey:`verification:${id}`});
    if(claim.decision==="replay"){
      if(claim.dispatchStatus==="completed")return json({success:true,replayed:true,duplicateSuppressed:true});
      if(claim.dispatchStatus==="claimed")return json({success:true,replayed:true,inProgress:true,duplicateSuppressed:true},202);
      if(claim.dispatchStatus==="integration_required")return json({success:false,error:"This verification method is not available yet.",code:"VERIFICATION_NOT_READY",replayed:true},503);
      return json({success:false,error:"The previous verification request did not complete. Request a new code.",code:"PREVIOUS_REQUEST_FAILED",replayed:true},409);
    }
    if(claim.decision!=="claimed")return json({success:false,error:"Too many verification codes were requested. Please wait before trying again.",code:"VERIFICATION_RATE_LIMIT",reason:claim.decision,retryAfterSeconds:claim.retryAfterSeconds},429,claim.retryAfterSeconds);

    const supabase=await createClient();
    const options={shouldCreateUser:true,data:referral?{referral_code:referral}:undefined};
    const result=method==="email"
      ? await supabase.auth.signInWithOtp({email:identifier,options})
      : await supabase.auth.signInWithOtp({phone:identifier,options});
    if(result.error){
      const code=String(result.error.code||"").toLowerCase();
      const integrationRequired=code==="phone_provider_disabled"||code==="email_provider_disabled";
      try{await completeLaneriqCommunication({dispatchId:claim.dispatchId,status:integrationRequired?"integration_required":"failed",errorCode:integrationRequired?"verification_not_ready":"verification_request_failed"});}catch{}
      const status=providerFailureStatus(result.error);
      return json({success:false,error:authErrorMessage(result.error,method),code:integrationRequired?"VERIFICATION_NOT_READY":status===429?"VERIFICATION_RATE_LIMIT":"VERIFICATION_REQUEST_FAILED"},status,status===429?60:0);
    }

    try{await completeLaneriqCommunication({dispatchId:claim.dispatchId,status:"completed"});}catch{}
    return json({success:true,channel:method,service:"LANERIQ Verification",platformFee:0});
  }catch(error){
    if(claim?.dispatchId&&claim?.decision==="claimed")try{await completeLaneriqCommunication({dispatchId:claim.dispatchId,status:"failed",errorCode:"verification_internal_error"});}catch{}
    const message=error?.message==="LANERIQ communications privacy guard is not configured."?"Verification service is not configured yet.":authErrorMessage(error,method);
    return json({success:false,error:message,code:"VERIFICATION_REQUEST_FAILED"},503);
  }
}
