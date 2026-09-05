import { createServerClient } from "../supabase/server.js";
import { createAdminClient } from "../supabase/admin.js";

export async function getCurrentLegalPrincipalData(){
  const supabase=await createServerClient();
  const {data:{user},error}=await supabase.auth.getUser();
  return {user,error};
}

export async function getCurrentLegalAssuranceData(){
  const supabase=await createServerClient();
  const {data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return {data,error};
}

export async function getActiveLegalDocumentData(documentKey){
  const admin=createAdminClient();
  return admin
    .from("legal_document_versions")
    .select("id,document_key,version,document_hash,acceptance_level,status,effective_at,activated_at")
    .eq("document_key",documentKey)
    .eq("status","active")
    .maybeSingle();
}

export async function getLegalSaleTransactionData(transactionId){
  const admin=createAdminClient();
  return admin
    .from("app_sale_transactions")
    .select("id,app_id,seller_user_id,buyer_user_id,status")
    .eq("id",transactionId)
    .maybeSingle();
}

export async function getAppOwnerData(appId){
  const admin=createAdminClient();
  return admin
    .from("apps")
    .select("id,owner_id")
    .eq("id",appId)
    .maybeSingle();
}

export async function insertLegalAcceptanceEventData(record){
  const admin=createAdminClient();
  return admin
    .from("legal_acceptance_events")
    .insert(record)
    .select("id,accepted_at,document_key_snapshot,version_snapshot,document_hash_snapshot,acceptance_level,actor_role,app_id,transaction_id")
    .single();
}

export async function evaluateAppSaleTruthGateData(transactionId){
  const admin=createAdminClient();
  return admin.rpc("server_evaluate_app_sale_truth_gate",{
    p_transaction_id:transactionId,
  });
}
