import crypto from "node:crypto";
import { EMAIL_OTP_POLICY } from "../auth/otp-policy.js";
import { createLaneriqSession, revokeLaneriqSessionToken } from "../auth/laneriq-session.js";
import { claimLaneriqCommunication, completeLaneriqCommunication } from "../communications/guard.js";
import { deliverCommunication } from "../communications/delivery-adapter.js";
import { createAdminClient } from "../supabase/admin.js";
import { createClient as createSupabaseCompatibilityClient } from "../supabase/server.js";

const EMAIL_TTL_SECONDS=600;

function verificationSecret(){
  const secret=String(process.env.LANERIQ_VERIFICATION_SECRET||process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET||process.env.LANERIQ_COMMUNICATION_PRIVACY_SECRET||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
  if(secret.length<32)throw new Error("LANERIQ verification secret is not configured.");
  return crypto.createHmac("sha256",secret).update("laneriq-verification-engine-v1").digest();
}
function digest(label,value){return crypto.createHmac("sha256",verificationSecret()).update(`${label}:${String(value||"")}`).digest("hex");}
function recipientHash(email){return digest("recipient",email);}
function challengeId(requestId){return digest("challenge",requestId).slice(0,48);}
function codeHash(id,email,code){return digest("code",`${id}:${email}:${code}`);}
function generateEmailCode(){const max=10**EMAIL_OTP_POLICY.codeLength;return crypto.randomInt(0,max).toString().padStart(EMAIL_OTP_POLICY.codeLength,"0");}
function replayResult(claim,id){
  if(claim.dispatchStatus==="completed")return {success:true,replayed:true,duplicateSuppressed:true,challengeId:id,expiresInSeconds:EMAIL_TTL_SECONDS};
  if(claim.dispatchStatus==="claimed")return {success:true,replayed:true,inProgress:true,duplicateSuppressed:true,challengeId:id};
  if(claim.dispatchStatus==="integration_required")return {success:false,code:"VERIFICATION_NOT_READY",status:503};
  return {success:false,code:"PREVIOUS_REQUEST_FAILED",status:409};
}
function verificationHtml(code){return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f5f6f2;padding:24px"><div style="max-width:520px;margin:auto;background:#fff;border-radius:20px;padding:28px"><div style="font-size:12px;font-weight:800;letter-spacing:.14em">LANERIQ AI · SECURE VERIFICATION</div><h1 style="font-size:28px;margin:14px 0">Your verification code</h1><div style="font-size:34px;font-weight:900;letter-spacing:.18em;padding:18px 20px;background:#071a15;color:#f4d675;border-radius:14px;text-align:center">${code}</div><p style="line-height:1.6;color:#43524b">This one-time code expires in 10 minutes. LANERIQ AI will never ask you to forward this code.</p></div></body></html>`;}
async function markDelivery(admin,id,status){try{await admin.rpc("laneriq_mark_verification_delivery",{p_id:id,p_status:status});}catch{}}

export function laneriqVerificationStatus(){
  return {
    service:"LANERIQ Verification",
    otpAuthority:"laneriq",
    email:{ownedGeneration:true,ownedVerification:true,hashedStorageOnly:true,expiresInSeconds:EMAIL_TTL_SECONDS,maxAttempts:EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode},
    sessionAuthority:"laneriq",
    compatibilityBridge:"legacy_data_access_transition",
  };
}

export async function requestLaneriqEmailVerification({email,scope,requestId,referral}){
  const id=challengeId(requestId);
  const claim=await claimLaneriqCommunication({channel:"email",purpose:"verification",scope,recipient:email,idempotencyKey:`verification:${requestId}`});
  if(claim.decision==="replay")return replayResult(claim,id);
  if(claim.decision!=="claimed")return {success:false,code:"VERIFICATION_RATE_LIMIT",status:429,reason:claim.decision,retryAfterSeconds:claim.retryAfterSeconds};

  const code=generateEmailCode();
  const expiresAt=new Date(Date.now()+EMAIL_TTL_SECONDS*1000).toISOString();
  const admin=createAdminClient();
  let challengeCreated=false;
  try{
    const {data,error}=await admin.rpc("laneriq_create_verification_challenge",{
      p_id:id,
      p_channel:"email",
      p_recipient_hash:recipientHash(email),
      p_code_hash:codeHash(id,email,code),
      p_referral_code:referral||null,
      p_expires_at:expiresAt,
      p_max_attempts:EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode,
    });
    if(error||!Array.isArray(data)||!data[0]?.challenge_id)throw new Error("LANERIQ verification challenge could not be created.");
    challengeCreated=true;

    const delivery=await deliverCommunication({
      channel:"email",
      to:email,
      subject:"Your LANERIQ AI verification code",
      body:`Your LANERIQ AI verification code is ${code}. It expires in 10 minutes. Do not share this code.`,
      html:verificationHtml(code),
    });
    if(delivery?.status!=="completed"){
      await markDelivery(admin,id,"delivery_failed");
      await completeLaneriqCommunication({dispatchId:claim.dispatchId,status:delivery?.status==="integration_required"?"integration_required":"failed",providerMessageId:delivery?.messageId||null,errorCode:"verification_delivery_not_ready"});
      return {success:false,code:"VERIFICATION_NOT_READY",status:503};
    }

    await markDelivery(admin,id,"delivered");
    await completeLaneriqCommunication({dispatchId:claim.dispatchId,status:"completed",providerMessageId:delivery.messageId||null});
    return {success:true,challengeId:id,expiresInSeconds:EMAIL_TTL_SECONDS,service:"LANERIQ Verification",otpAuthority:"laneriq",platformFee:0};
  }catch{
    if(challengeCreated)await markDelivery(admin,id,"delivery_failed");
    try{await completeLaneriqCommunication({dispatchId:claim.dispatchId,status:"failed",errorCode:"verification_delivery_failed"});}catch{}
    return {success:false,code:"VERIFICATION_REQUEST_FAILED",status:503};
  }
}

async function ensureSupabaseCompatibilityUser(email,referral){
  const admin=createAdminClient();
  let generated=await admin.auth.admin.generateLink({type:"magiclink",email});
  if(generated.error){
    const created=await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:referral?{referral_code:referral}:undefined});
    if(created.error)throw new Error("Compatibility identity could not be created.");
    generated=await admin.auth.admin.generateLink({type:"magiclink",email});
  }
  if(generated.error)throw new Error("Compatibility session link could not be created.");
  const tokenHash=generated.data?.properties?.hashed_token;
  const user=generated.data?.user;
  if(!tokenHash||!user?.id)throw new Error("Compatibility session link is incomplete.");
  if(referral&&!user.user_metadata?.referral_code){
    try{await admin.auth.admin.updateUserById(user.id,{user_metadata:{...(user.user_metadata||{}),referral_code:referral}});}catch{}
  }
  return {tokenHash,userId:user.id};
}

async function mintCompatibilitySession(tokenHash,userId){
  const compatibilityClient=await createSupabaseCompatibilityClient();
  const {data,error}=await compatibilityClient.auth.verifyOtp({token_hash:tokenHash,type:"email"});
  if(error||!data?.session||!data?.user?.id)throw new Error("Compatibility session could not be created.");
  if(data.user.id!==userId)throw new Error("Compatibility session user mismatch.");
  return {userId:data.user.id};
}

export async function verifyLaneriqEmailVerification({email,challengeId:rawChallengeId,code}){
  const id=String(rawChallengeId||"").trim();
  if(!/^[a-f0-9]{48}$/.test(id))return {success:false,code:"VERIFICATION_INVALID",status:400};
  const admin=createAdminClient();
  const {data,error}=await admin.rpc("laneriq_consume_verification_challenge",{
    p_id:id,
    p_recipient_hash:recipientHash(email),
    p_code_hash:codeHash(id,email,code),
  });
  if(error)return {success:false,code:"VERIFICATION_FAILED",status:503};
  const result=Array.isArray(data)?data[0]:null;
  const decision=String(result?.decision||"invalid");
  if(decision!=="verified"){
    if(decision==="expired"||decision==="superseded")return {success:false,code:"VERIFICATION_EXPIRED",status:410};
    if(decision==="locked")return {success:false,code:"VERIFICATION_LOCKED",status:429,attempts:Number(result?.attempts||EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode),maxAttempts:Number(result?.max_attempts||EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode)};
    if(decision==="delivery_failed")return {success:false,code:"VERIFICATION_NOT_READY",status:503};
    if(decision==="consumed")return {success:false,code:"VERIFICATION_ALREADY_USED",status:409};
    return {success:false,code:"VERIFICATION_INVALID",status:400,attempts:Number(result?.attempts||0),maxAttempts:Number(result?.max_attempts||EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode)};
  }

  let primarySession=null;
  try{
    const prepared=await ensureSupabaseCompatibilityUser(email,result?.referral_code||null);
    primarySession=await createLaneriqSession(prepared.userId);
    await mintCompatibilitySession(prepared.tokenHash,prepared.userId);
    return {
      success:true,
      service:"LANERIQ Verification",
      otpAuthority:"laneriq",
      sessionAuthority:"laneriq",
      compatibilityBridge:"legacy_data_access_transition",
      userId:prepared.userId,
      sessionToken:primarySession.token,
      sessionExpiresAt:primarySession.expiresAt,
    };
  }catch{
    if(primarySession?.token){try{await revokeLaneriqSessionToken(primarySession.token);}catch{}}
    return {success:false,code:"SESSION_AUTHORITY_FAILED",status:503};
  }
}
