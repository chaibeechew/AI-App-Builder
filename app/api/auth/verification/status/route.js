import { NextResponse } from "next/server";
import { communicationGuardStatus } from "../../../../../lib/communications/guard.js";
import { deliveryAdapterStatus } from "../../../../../lib/communications/delivery-adapter.js";
import { createAdminClient } from "../../../../../lib/supabase/admin.js";

const ATTENTION_CODES=new Set([
  "smtp_config_missing",
  "smtp_auth_failed",
  "smtp_sender_rejected",
  "smtp_tls_failed",
]);
const RETRYABLE_CODES=new Set([
  "smtp_connection_failed",
  "smtp_connection_closed",
  "smtp_timeout",
  "smtp_greeting_failed",
  "smtp_ehlo_failed",
  "smtp_starttls_failed",
  "smtp_recipient_rejected",
  "smtp_data_rejected",
  "smtp_message_rejected",
  "smtp_protocol_failed",
  "smtp_transport_failed",
  "resend_transport_failed",
  "transport_failed",
]);

function json(payload,status=200){
  const response=NextResponse.json(payload,{status});
  response.headers.set("Cache-Control","private, no-store, max-age=0");
  response.headers.set("Pragma","no-cache");
  response.headers.set("X-Content-Type-Options","nosniff");
  return response;
}

async function storageReady(){
  try{
    const admin=createAdminClient();
    const {error}=await admin.from("communication_dispatches").select("id").limit(1);
    return !error;
  }catch{
    return false;
  }
}

async function recentEmailHealth(){
  try{
    const admin=createAdminClient();
    const {data,error}=await admin.rpc("laneriq_email_verification_health");
    if(error)return {observed:false,state:"unknown",issue:null,attempts:0,maxAttempts:0,updatedAt:null};
    const row=Array.isArray(data)?data[0]:null;
    if(!row)return {observed:false,state:"unknown",issue:null,attempts:0,maxAttempts:0,updatedAt:null};
    const issue=String(row.last_error_code||"").trim().toLowerCase()||null;
    return {
      observed:true,
      state:String(row.status||"unknown").trim().toLowerCase()||"unknown",
      issue,
      attempts:Number(row.attempts||0),
      maxAttempts:Number(row.max_attempts||0),
      updatedAt:row.updated_at||null,
    };
  }catch{
    return {observed:false,state:"unknown",issue:null,attempts:0,maxAttempts:0,updatedAt:null};
  }
}

export async function GET(){
  const guard=communicationGuardStatus();
  const delivery=deliveryAdapterStatus();
  const [storage,recent]=await Promise.all([storageReady(),recentEmailHealth()]);
  const stages={
    guard:Boolean(guard.ready),
    storage:Boolean(storage),
    delivery:Boolean(delivery.email?.ready),
  };
  const ready=stages.guard&&stages.storage&&stages.delivery;
  const needsAttention=Boolean(recent.issue&&ATTENTION_CODES.has(recent.issue));
  const retryable=Boolean(recent.issue&&RETRYABLE_CODES.has(recent.issue));
  const operational=recent.observed?recent.state==="sent":null;
  return json({
    success:true,
    service:"LANERIQ Verification",
    channel:"email",
    ready,
    operationalReady:ready&&operational!==false,
    stages,
    deliveryHealth:{
      observed:recent.observed,
      operational,
      state:recent.state,
      issue:recent.issue,
      needsAttention,
      retryable,
      attempts:recent.attempts,
      maxAttempts:recent.maxAttempts,
      updatedAt:recent.updatedAt,
    },
    otpAuthority:"laneriq",
    sessionAuthority:"laneriq",
  },200);
}