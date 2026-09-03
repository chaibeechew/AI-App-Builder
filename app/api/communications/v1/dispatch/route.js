import { NextResponse } from "next/server";
import { createEmbeddedCommunicationRuntime } from "../../../../../lib/communications/runtime-port.js";
import { dispatchServiceMessage, normalizeServiceMessage } from "../../../../../lib/communications/service-core.js";
import { privacyHmac, verifyServiceRequestSignature } from "../../../../../lib/communications/service-auth.js";
import { claimCommunicationServiceRequest, finishCommunicationServiceRequest } from "../../../../../lib/communications/service-request-store.js";

export const dynamic="force-dynamic";
export const runtime="nodejs";

const ROUTE_PATH="/api/communications/v1/dispatch";
function privateJson(body,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
function serviceSecret(){return String(process.env.LANERIQ_COMMUNICATIONS_SERVICE_SECRET||"").trim();}
function allowedClientId(){return String(process.env.LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID||"laneriq-ai").trim();}
function customerBilledEnabled(){return String(process.env.LANERIQ_COMMUNICATIONS_ALLOW_CUSTOMER_BILLED||"").trim().toLowerCase()==="true";}

export async function POST(request){
  const secret=serviceSecret();
  if(secret.length<32)return privateJson({ok:false,error:"Service authentication unavailable."},503);

  const clientId=String(request.headers.get("x-laneriq-client-id")||"").trim();
  const timestamp=String(request.headers.get("x-laneriq-timestamp")||"").trim();
  const nonce=String(request.headers.get("x-laneriq-nonce")||"").trim();
  const signature=String(request.headers.get("x-laneriq-signature")||"").trim();
  if(clientId!==allowedClientId())return privateJson({ok:false,error:"Unauthorized service client."},401);

  let bodyText="";
  try{bodyText=await request.text();}catch{return privateJson({ok:false,error:"Invalid request body."},400);}
  const verified=verifyServiceRequestSignature({secret,signature,clientId,timestamp,nonce,method:"POST",path:ROUTE_PATH,body:bodyText});
  if(!verified.ok)return privateJson({ok:false,error:"Unauthorized service request.",reason:verified.reason},401);

  let input;
  try{input=JSON.parse(bodyText);}catch{return privateJson({ok:false,error:"Invalid JSON body."},400);}
  let message;
  try{message=normalizeServiceMessage(input);}catch(error){return privateJson({ok:false,error:error?.message||"Invalid service message."},400);}
  if(!customerBilledEnabled())message={...message,allowCustomerBilledProvider:false};

  const clientHash=privacyHmac(secret,"client",clientId);
  const nonceHash=privacyHmac(secret,"nonce",nonce);
  const idempotencyHash=privacyHmac(secret,"idempotency",message.idempotencyKey);
  let claim;
  try{
    claim=await claimCommunicationServiceRequest({clientHash,nonceHash,idempotencyHash,bodyHash:verified.bodyHash,expiresAt:verified.expiresAt});
  }catch{return privateJson({ok:false,error:"Service request ledger unavailable."},503);}

  if(claim.decision==="replay_nonce")return privateJson({ok:false,status:"replay_blocked"},409);
  if(claim.decision==="idempotent_replay")return privateJson({ok:true,status:"already_claimed",requestId:claim.requestId},202);
  if(claim.decision!=="claimed"||!claim.requestId)return privateJson({ok:false,error:"Service request was not accepted."},409);

  try{
    const runtime=createEmbeddedCommunicationRuntime();
    const result=await dispatchServiceMessage(runtime,message);
    const completed=result.status==="completed"||result.status==="sent"||result.status==="delivered"||result.status==="queued";
    await finishCommunicationServiceRequest({requestId:claim.requestId,status:completed?"completed":"failed"});
    return privateJson({ok:completed,requestId:claim.requestId,result},completed?200:503);
  }catch{
    try{await finishCommunicationServiceRequest({requestId:claim.requestId,status:"failed"});}catch{}
    return privateJson({ok:false,requestId:claim.requestId,error:"Communication dispatch failed."},503);
  }
}
