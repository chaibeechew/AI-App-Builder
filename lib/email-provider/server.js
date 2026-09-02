import crypto from "node:crypto";
import { createAdminClient } from "../supabase/admin.js";
import { integrationStatus, sendManagedEmail } from "../integrations/server.js";

const PROVIDER_NAME="LANERIQ Email";
const DEFAULT_MAX_ATTEMPTS=5;

function rootSecret(){
  const value=String(
    process.env.LANERIQ_EMAIL_PROVIDER_SECRET||
    process.env.LANERIQ_VERIFICATION_SECRET||
    process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET||
    process.env.LANERIQ_COMMUNICATION_PRIVACY_SECRET||
    ""
  );
  if(value.length<32)throw new Error("LANERIQ Email Provider secret is not configured.");
  return value;
}
function providerKey(){return crypto.createHmac("sha256",rootSecret()).update("laneriq-email-provider-v1:payload").digest();}
function recipientKey(){return crypto.createHmac("sha256",rootSecret()).update("laneriq-email-provider-v1:recipient").digest();}
function recipientHash(value){return crypto.createHmac("sha256",recipientKey()).update(String(value||"").trim().toLowerCase()).digest("hex");}
function messageId(){return `lqem_${crypto.randomBytes(18).toString("base64url")}`;}
function safePurpose(value){const purpose=String(value||"transactional").trim().toLowerCase();if(!["verification","transactional","automation"].includes(purpose))throw new Error("Unsupported LANERIQ Email purpose.");return purpose;}
function safePayload(payload){
  const to=String(payload?.to||"").trim().toLowerCase();
  const subject=String(payload?.subject||"").trim().slice(0,180);
  const text=String(payload?.text||"").slice(0,12000);
  const html=payload?.html?String(payload.html).slice(0,20000):"";
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))throw new Error("LANERIQ Email recipient is invalid.");
  if(!subject||(!text&&!html))throw new Error("LANERIQ Email content is incomplete.");
  return {to,subject,text,html};
}
function encryptPayload(payload){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv("aes-256-gcm",providerKey(),iv);
  cipher.setAAD(Buffer.from("laneriq-email-provider-v1"));
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(payload),"utf8"),cipher.final()]);
  return {ciphertext:ciphertext.toString("base64url"),iv:iv.toString("base64url"),tag:cipher.getAuthTag().toString("base64url")};
}
function decryptPayload({payload_ciphertext,payload_iv,payload_tag}){
  const decipher=crypto.createDecipheriv("aes-256-gcm",providerKey(),Buffer.from(payload_iv,"base64url"));
  decipher.setAAD(Buffer.from("laneriq-email-provider-v1"));
  decipher.setAuthTag(Buffer.from(payload_tag,"base64url"));
  const plaintext=Buffer.concat([decipher.update(Buffer.from(payload_ciphertext,"base64url")),decipher.final()]).toString("utf8");
  return safePayload(JSON.parse(plaintext));
}

export function laneriqEmailProviderStatus(){
  let queueReady=true;
  try{rootSecret();}catch{queueReady=false;}
  const transportReady=Boolean(integrationStatus().email?.ready);
  return {
    provider:PROVIDER_NAME,
    providerAuthority:"laneriq",
    queueReady,
    transportReady,
    ready:queueReady&&transportReady,
    encryptedQueue:true,
    recipientStoredAsHash:true,
    rawPayloadStored:false,
    maxAttempts:DEFAULT_MAX_ATTEMPTS,
  };
}

export async function enqueueLaneriqEmail({to,subject,text,html,purpose="transactional",maxAttempts=DEFAULT_MAX_ATTEMPTS}){
  const payload=safePayload({to,subject,text,html});
  const id=messageId();
  const encrypted=encryptPayload(payload);
  const admin=createAdminClient();
  const {data,error}=await admin.rpc("laneriq_enqueue_email",{
    p_id:id,
    p_recipient_hash:recipientHash(payload.to),
    p_payload_ciphertext:encrypted.ciphertext,
    p_payload_iv:encrypted.iv,
    p_payload_tag:encrypted.tag,
    p_purpose:safePurpose(purpose),
    p_max_attempts:Math.max(1,Math.min(20,Number(maxAttempts)||DEFAULT_MAX_ATTEMPTS)),
  });
  if(error||!Array.isArray(data)||!data[0]?.message_id)throw new Error("LANERIQ Email queue is unavailable.");
  return {status:"queued",channel:"email",provider:PROVIDER_NAME,messageId:data[0].message_id};
}

async function finish(admin,{messageId,status,receipt,errorCode,retryAfterSeconds}){
  const {data,error}=await admin.rpc("laneriq_finish_email",{
    p_id:messageId,
    p_status:status,
    p_provider_receipt:receipt||null,
    p_error_code:errorCode||null,
    p_retry_after_seconds:Number.isFinite(Number(retryAfterSeconds))?Number(retryAfterSeconds):null,
  });
  if(error||data!==true)throw new Error("LANERIQ Email queue status could not be updated.");
}

export async function processLaneriqEmail({messageId:requestedId=null}={}){
  const admin=createAdminClient();
  const {data,error}=await admin.rpc("laneriq_claim_email",{p_id:requestedId||null});
  if(error)throw new Error("LANERIQ Email queue claim failed.");
  const claimed=Array.isArray(data)?data[0]:null;
  if(!claimed?.message_id)return {status:"idle",channel:"email",provider:PROVIDER_NAME};

  let payload;
  try{payload=decryptPayload(claimed);}catch{
    await finish(admin,{messageId:claimed.message_id,status:"failed",errorCode:"payload_decrypt_failed"});
    return {status:"failed",channel:"email",provider:PROVIDER_NAME,messageId:claimed.message_id,errorCode:"payload_decrypt_failed"};
  }

  try{
    const delivered=await sendManagedEmail({...payload,laneriqMessageId:claimed.message_id});
    if(delivered?.status==="completed"){
      await finish(admin,{messageId:claimed.message_id,status:"sent",receipt:delivered.messageId||null});
      return {status:"completed",channel:"email",provider:PROVIDER_NAME,messageId:claimed.message_id};
    }
    if(delivered?.status==="failed"){
      await finish(admin,{messageId:claimed.message_id,status:"failed",errorCode:delivered.errorCode||"transport_failed"});
      return {status:"failed",channel:"email",provider:PROVIDER_NAME,messageId:claimed.message_id,errorCode:delivered.errorCode||"transport_failed"};
    }
    const attempts=Number(claimed.attempts||1);
    const maxAttempts=Number(claimed.max_attempts||DEFAULT_MAX_ATTEMPTS);
    if(attempts>=maxAttempts){
      await finish(admin,{messageId:claimed.message_id,status:"failed",errorCode:delivered?.errorCode||"transport_not_ready"});
      return {status:"failed",channel:"email",provider:PROVIDER_NAME,messageId:claimed.message_id,errorCode:delivered?.errorCode||"transport_not_ready"};
    }
    await finish(admin,{messageId:claimed.message_id,status:"deferred",errorCode:delivered?.errorCode||"transport_not_ready",retryAfterSeconds:300});
    return {status:"deferred",channel:"email",provider:PROVIDER_NAME,messageId:claimed.message_id};
  }catch{
    const attempts=Number(claimed.attempts||1);
    const maxAttempts=Number(claimed.max_attempts||DEFAULT_MAX_ATTEMPTS);
    const terminal=attempts>=maxAttempts;
    await finish(admin,{messageId:claimed.message_id,status:terminal?"failed":"deferred",errorCode:"transport_failed",retryAfterSeconds:terminal?null:300});
    return {status:terminal?"failed":"deferred",channel:"email",provider:PROVIDER_NAME,messageId:claimed.message_id,errorCode:"transport_failed"};
  }
}

export async function sendLaneriqEmail(payload){
  const queued=await enqueueLaneriqEmail(payload);
  const delivered=await processLaneriqEmail({messageId:queued.messageId});
  if(delivered.status==="completed")return delivered;
  if(delivered.status==="deferred")return {status:"integration_required",channel:"email",provider:PROVIDER_NAME,messageId:queued.messageId};
  return delivered;
}
