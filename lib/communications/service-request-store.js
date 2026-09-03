import { createAdminClient } from "../supabase/admin.js";
function bounded(value,label,max=180){const text=String(value||"").trim();if(!text||text.length>max)throw new Error(`${label} is invalid.`);return text;}
export async function claimCommunicationServiceRequest({clientHash,nonceHash,idempotencyHash,bodyHash,expiresAt}){
  const supabase=createAdminClient();
  const {data,error}=await supabase.rpc("server_claim_communication_service_request",{p_client_hash:bounded(clientHash,"Service client hash",128),p_nonce_hash:bounded(nonceHash,"Service nonce hash",128),p_idempotency_hash:bounded(idempotencyHash,"Service idempotency hash",128),p_body_hash:bounded(bodyHash,"Service body hash",128),p_expires_at:bounded(expiresAt,"Service request expiry",80)});
  if(error)throw error; const row=Array.isArray(data)?data[0]:data;
  if(!row?.decision)throw new Error("Service request ledger returned an incomplete decision.");
  return {requestId:row.request_id||null,decision:String(row.decision)};
}
export async function finishCommunicationServiceRequest({requestId,status}){
  const supabase=createAdminClient();
  const {error}=await supabase.rpc("server_finish_communication_service_request",{p_request_id:bounded(requestId,"Service request id",80),p_status:bounded(status,"Service request status",20)});
  if(error)throw error;
}
