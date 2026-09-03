import { OMNICHANNELS, normalizeCommunicationChannel } from "./channel-contract.js";
import { deliverZeroCostCommunication, planZeroCostCommunication } from "./omnichannel-router.js";

export const COMMUNICATIONS_SERVICE_NAME="LANERIQ OmniChannel Communication Service";
export const COMMUNICATIONS_SERVICE_VERSION="1.0";

function boundedText(value,max=4000){
  const text=String(value||"").trim();
  if(!text||text.length>max)throw new Error("LANERIQ communication text is invalid.");
  return text;
}
function optionalText(value,max=4000){
  const text=String(value||"").trim();
  return text?text.slice(0,max):null;
}
function safeIdempotencyKey(value){
  const key=String(value||"").trim();
  if(!/^[A-Za-z0-9._:-]{8,180}$/.test(key))throw new Error("LANERIQ communication idempotency key is invalid.");
  return key;
}
function safeChannels(values=[]){
  const output=[];
  for(const value of Array.isArray(values)?values:[]){
    try{const channel=normalizeCommunicationChannel(value);if(!output.includes(channel))output.push(channel);}catch{}
  }
  return output;
}

export function normalizeServiceMessage(input={}){
  const preferredChannels=safeChannels(input.preferredChannels);
  return {
    messageId:optionalText(input.messageId,180),
    idempotencyKey:safeIdempotencyKey(input.idempotencyKey||input.messageId),
    tenantId:optionalText(input.tenantId,180),
    userId:optionalText(input.userId,180),
    purpose:optionalText(input.purpose,80)||"transactional",
    priority:optionalText(input.priority,40)||"normal",
    to:boundedText(input.to,500),
    subject:optionalText(input.subject,300),
    body:boundedText(input.body||input.text,12000),
    html:optionalText(input.html,30000),
    actionUrl:optionalText(input.actionUrl,2000),
    preferredChannels,
    allowCustomerBilledProvider:input.allowCustomerBilledProvider===true,
    metadata:input.metadata&&typeof input.metadata==="object"&&!Array.isArray(input.metadata)?input.metadata:{},
  };
}

export function createCommunicationServiceRuntime({adapterStatus,senders}={}){
  if(typeof adapterStatus!=="function")throw new Error("LANERIQ communications adapter status port is required.");
  if(typeof senders!=="function")throw new Error("LANERIQ communications sender port is required.");
  return Object.freeze({adapterStatus,senders});
}

export function communicationServiceCapabilities(runtime){
  const adapters=runtime.adapterStatus();
  const channels=Object.fromEntries(OMNICHANNELS.map(channel=>{
    const item=adapters[channel]||{};
    return [channel,{
      contractReady:Boolean(item.contractReady),
      runtimeReady:Boolean(item.runtimeReady),
      providerReady:Boolean(item.providerReady),
      liveVerified:Boolean(item.liveVerified),
      costClass:String(item.costClass||"unknown"),
      health:String(item.health||"unknown"),
      evidenceLevel:String(item.evidenceLevel||"CODE"),
    }];
  }));
  return {
    service:COMMUNICATIONS_SERVICE_NAME,
    version:COMMUNICATIONS_SERVICE_VERSION,
    architecture:"provider_agnostic_port_adapter",
    deploymentMode:"embedded_now_extractable_later",
    channels,
  };
}

export function planServiceMessage(runtime,input={}){
  const message=normalizeServiceMessage(input);
  const adapters=runtime.adapterStatus();
  const plan=planZeroCostCommunication({
    adapters,
    preferredChannels:message.preferredChannels,
    allowCustomerBilledProvider:message.allowCustomerBilledProvider,
  });
  return {message,plan};
}

export async function dispatchServiceMessage(runtime,input={}){
  const message=normalizeServiceMessage(input);
  const adapters=runtime.adapterStatus();
  const senderMap=runtime.senders();
  const result=await deliverZeroCostCommunication({
    adapters,
    senders:senderMap,
    preferredChannels:message.preferredChannels,
    payload:message,
    allowCustomerBilledProvider:message.allowCustomerBilledProvider,
  });
  return {
    service:COMMUNICATIONS_SERVICE_NAME,
    version:COMMUNICATIONS_SERVICE_VERSION,
    messageId:message.messageId,
    idempotencyKey:message.idempotencyKey,
    purpose:message.purpose,
    ...result,
  };
}
