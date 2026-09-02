import { createAdminClient } from "../supabase/admin.js";

function requireText(value,label,max=200){const text=String(value||"").trim();if(!text||text.length>max)throw new Error(`${label} is invalid.`);return text;}

export async function claimCommunicationDispatch({scopeHash,recipientHash,channel,purpose,idempotencyKey,hourlyLimit,dailyLimit,cooldownSeconds}){
  const supabase=createAdminClient();
  const {data,error}=await supabase.rpc("server_claim_communication_dispatch",{
    p_scope_hash:requireText(scopeHash,"Communication scope",128),
    p_recipient_hash:requireText(recipientHash,"Recipient hash",128),
    p_channel:requireText(channel,"Communication channel",32),
    p_purpose:requireText(purpose,"Communication purpose",32),
    p_idempotency_key:requireText(idempotencyKey,"Communication idempotency key",180),
    p_hourly_limit:Number(hourlyLimit),
    p_daily_limit:Number(dailyLimit),
    p_cooldown_seconds:Number(cooldownSeconds),
  });
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  if(!row?.dispatch_id||!row?.decision)throw new Error("Communication guard returned an incomplete decision.");
  return {dispatchId:row.dispatch_id,decision:row.decision,retryAfterSeconds:Number(row.retry_after_seconds||0)};
}

export async function finishCommunicationDispatch({dispatchId,status,providerMessageId=null,errorCode=null}){
  const supabase=createAdminClient();
  const {error}=await supabase.rpc("server_finish_communication_dispatch",{
    p_dispatch_id:requireText(dispatchId,"Dispatch id",80),
    p_status:requireText(status,"Dispatch status",40),
    p_provider_message_id:providerMessageId?String(providerMessageId).slice(0,300):null,
    p_error_code:errorCode?String(errorCode).slice(0,120):null,
  });
  if(error)throw error;
}
