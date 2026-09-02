import crypto from "node:crypto";
import { communicationServicePolicy } from "./service-policy.js";
import { communicationLimit } from "./limits.js";
import { deliveryAdapterStatus, deliverCommunication } from "./delivery-adapter.js";
import { claimCommunicationDispatch, finishCommunicationDispatch } from "./store.js";

const CHANNELS=new Set(["email","whatsapp"]);

function safeChannel(value){const channel=String(value||"").trim().toLowerCase();if(!CHANNELS.has(channel))throw new Error("Unsupported LANERIQ communication channel.");return channel;}
function safeRecipient(value,max=320){return String(value||"").trim().slice(0,max);}
function safeBody(value,max=12000){return String(value||"").trim().slice(0,max);}
function safeScope(value){const scope=String(value||"").trim();if(!scope||scope.length>500)throw new Error("LANERIQ communication scope is required.");return scope;}
function safeIdempotencyKey(value){const key=String(value||"").trim().replace(/[^a-zA-Z0-9._:-]/g,"-").slice(0,180);if(!key)throw new Error("LANERIQ communication idempotency key is required.");return key;}
function hashSecret(){return String(process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();}
function privacyHash(kind,value){const secret=hashSecret();if(!secret)throw new Error("LANERIQ communications privacy guard is not configured.");return crypto.createHmac("sha256",secret).update(`${kind}:${value}`).digest("hex");}
function normalizedRecipient(channel,value){const recipient=safeRecipient(value);if(channel==="email")return recipient.toLowerCase();return recipient.replace(/[^0-9]/g,"");}
function replayResult(claim,channel){
  const status=claim.dispatchStatus||"claimed";
  if(status==="completed")return {status:"completed",channel,replayed:true,duplicateSuppressed:true};
  if(status==="integration_required")return {status:"integration_required",channel,replayed:true,duplicateSuppressed:true};
  if(status==="skipped")return {status:"skipped",channel,replayed:true,duplicateSuppressed:true};
  if(status==="failed")return {status:"failed",channel,replayed:true,duplicateSuppressed:true};
  return {status:"in_progress",channel,replayed:true,duplicateSuppressed:true};
}

export function laneriqCommunicationStatus(){
  const delivery=deliveryAdapterStatus();
  return {
    service:"LANERIQ Communications",
    managedBackend:true,
    providerOpaque:true,
    persistentGuard:true,
    privacyHashReady:Boolean(hashSecret()),
    dedicatedPrivacySecret:Boolean(process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET),
    policy:communicationServicePolicy(),
    channels:{
      email:{ready:Boolean(delivery.email?.ready),managed:true},
      whatsapp:{ready:Boolean(delivery.whatsapp?.ready),managed:true},
    },
  };
}

export async function sendLaneriqCommunication({channel,to,subject,body,html,purpose="transactional",scope,idempotencyKey}){
  const selected=safeChannel(channel);
  const recipient=normalizedRecipient(selected,to);
  if(!recipient)return {status:"skipped",channel:selected,message:"Recipient is required.",service:"LANERIQ Communications",platformFee:0};
  const key=safeIdempotencyKey(idempotencyKey);
  const limits=communicationLimit({purpose,channel:selected});
  const claim=await claimCommunicationDispatch({
    scopeHash:privacyHash("scope",safeScope(scope)),
    recipientHash:privacyHash(`recipient:${selected}`,recipient),
    channel:selected,
    purpose,
    idempotencyKey:key,
    hourlyLimit:limits.hourly,
    dailyLimit:limits.daily,
    cooldownSeconds:limits.cooldownSeconds,
  });

  if(claim.decision==="replay")return {...replayResult(claim,selected),service:"LANERIQ Communications",platformFee:0};
  if(claim.decision!=="claimed")return {status:"rate_limited",channel:selected,reason:claim.decision,retryAfterSeconds:claim.retryAfterSeconds,service:"LANERIQ Communications",platformFee:0};

  try{
    const result=await deliverCommunication({
      channel:selected,
      to:recipient,
      subject:selected==="email"?(safeBody(subject,180)||"LANERIQ AI notification"):undefined,
      body:safeBody(body,selected==="email"?12000:4000),
      html:selected==="email"&&html?safeBody(html,20000):undefined,
    });
    const finalStatus=["completed","integration_required","skipped"].includes(result?.status)?result.status:"failed";
    await finishCommunicationDispatch({dispatchId:claim.dispatchId,status:finalStatus,providerMessageId:result?.messageId||null,errorCode:finalStatus==="failed"?"delivery_invalid_result":null});
    return {...result,status:finalStatus,service:"LANERIQ Communications",platformFee:0,guarded:true,dispatchId:claim.dispatchId};
  }catch{
    try{await finishCommunicationDispatch({dispatchId:claim.dispatchId,status:"failed",errorCode:"delivery_failed"});}catch{}
    throw new Error("LANERIQ communication delivery failed.");
  }
}
