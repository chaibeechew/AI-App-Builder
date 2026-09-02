import crypto from "node:crypto";
import { communicationLimit } from "./limits.js";
import { claimCommunicationDispatch, finishCommunicationDispatch } from "./store.js";

function safeScope(value){const scope=String(value||"").trim();if(!scope||scope.length>500)throw new Error("LANERIQ communication scope is required.");return scope;}
function safeIdempotencyKey(value){const key=String(value||"").trim().replace(/[^a-zA-Z0-9._:-]/g,"-").slice(0,180);if(!key)throw new Error("LANERIQ communication idempotency key is required.");return key;}
function hashSecret(){return String(process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();}
function privacyHash(kind,value){const secret=hashSecret();if(!secret)throw new Error("LANERIQ communications privacy guard is not configured.");return crypto.createHmac("sha256",secret).update(`${kind}:${value}`).digest("hex");}
function normalizedRecipient(channel,value){const recipient=String(value||"").trim().slice(0,320);if(channel==="email")return recipient.toLowerCase();return recipient.replace(/[^0-9]/g,"");}

export function communicationGuardStatus(){return {ready:Boolean(hashSecret()),persistent:true,hashOnly:true,dedicatedPrivacySecret:Boolean(process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET)};}

export async function claimLaneriqCommunication({channel,purpose="transactional",scope,recipient,idempotencyKey}){
  const limits=communicationLimit({purpose,channel});
  const normalized=normalizedRecipient(channel,recipient);
  if(!normalized)throw new Error("Communication recipient is required.");
  return claimCommunicationDispatch({
    scopeHash:privacyHash("scope",safeScope(scope)),
    recipientHash:privacyHash(`recipient:${channel}`,normalized),
    channel,
    purpose,
    idempotencyKey:safeIdempotencyKey(idempotencyKey),
    hourlyLimit:limits.hourly,
    dailyLimit:limits.daily,
    cooldownSeconds:limits.cooldownSeconds,
  });
}

export async function completeLaneriqCommunication({dispatchId,status,providerMessageId=null,errorCode=null}){
  return finishCommunicationDispatch({dispatchId,status,providerMessageId,errorCode});
}
