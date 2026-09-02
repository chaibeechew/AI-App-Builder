import { communicationServicePolicy } from "./service-policy.js";
import { deliveryAdapterStatus, deliverCommunication } from "./delivery-adapter.js";
import { claimLaneriqCommunication, completeLaneriqCommunication, communicationGuardStatus } from "./guard.js";

const CHANNELS=new Set(["email","whatsapp"]);

function safeChannel(value){const channel=String(value||"").trim().toLowerCase();if(!CHANNELS.has(channel))throw new Error("Unsupported LANERIQ communication channel.");return channel;}
function safeRecipient(value,max=320){return String(value||"").trim().slice(0,max);}
function safeBody(value,max=12000){return String(value||"").trim().slice(0,max);}
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
  const guard=communicationGuardStatus();
  return {
    service:"LANERIQ Communications",
    managedBackend:true,
    providerOpaque:true,
    persistentGuard:guard.persistent,
    privacyHashReady:guard.ready,
    dedicatedPrivacySecret:guard.dedicatedPrivacySecret,
    policy:communicationServicePolicy(),
    channels:{
      email:{ready:Boolean(delivery.email?.ready)&&guard.ready,managed:true},
      whatsapp:{ready:Boolean(delivery.whatsapp?.ready)&&guard.ready,managed:true},
    },
  };
}

export async function sendLaneriqCommunication({channel,to,subject,body,html,purpose="transactional",scope,idempotencyKey}){
  const selected=safeChannel(channel);
  const recipient=normalizedRecipient(selected,to);
  if(!recipient)return {status:"skipped",channel:selected,message:"Recipient is required.",service:"LANERIQ Communications",platformFee:0};
  const claim=await claimLaneriqCommunication({channel:selected,purpose,scope,recipient,idempotencyKey});

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
    await completeLaneriqCommunication({dispatchId:claim.dispatchId,status:finalStatus,providerMessageId:result?.messageId||null,errorCode:finalStatus==="failed"?"delivery_invalid_result":null});
    return {...result,status:finalStatus,service:"LANERIQ Communications",platformFee:0,guarded:true,dispatchId:claim.dispatchId};
  }catch{
    try{await completeLaneriqCommunication({dispatchId:claim.dispatchId,status:"failed",errorCode:"delivery_failed"});}catch{}
    throw new Error("LANERIQ communication delivery failed.");
  }
}
