import { createAdminClient } from "./supabase/admin.js";
import { isNoCreditsLaunchMode } from "../config/launch-mode.js";
import { getSoolenCostMode } from "./soolen/cost-policy.js";

async function call(name,args){const admin=createAdminClient();const{data,error}=await admin.rpc(name,args);if(error)throw error;return data;}
function zeroSpendComputeMode(){const mode=getSoolenCostMode();return mode==="zero"||mode==="free";}
export function consumeAppBuilderEntitlement(userId,{operation,appId=null,requestId}){return call("server_consume_app_builder_entitlement",{p_user_id:userId,p_operation:operation,p_app_id:appId,p_request_id:requestId});}
export function consumeZeroSpendAppBuilderEntitlement(userId,{requestId}){return call("server_consume_app_builder_zero_spend_entitlement",{p_user_id:userId,p_request_id:requestId});}
export function bindAppBuilderProjectAccess(userId,{appId,requestId}){return call("server_bind_app_builder_project_access",{p_user_id:userId,p_app_id:appId,p_request_id:requestId});}
export function restoreFailedAppBuilderCreate(userId,{requestId}){return call("server_restore_failed_app_builder_create",{p_user_id:userId,p_request_id:requestId});}
export function consumeAiCredits(userId,{amount,requestId,description,metadata={}}){
  if(isNoCreditsLaunchMode())return Promise.resolve({charged:false,balance:null,launchModeBypass:true,requestId});
  if(zeroSpendComputeMode())return Promise.resolve({charged:false,balance:null,zeroSpendComputeBypass:true,requestId});
  return call("server_consume_ai_credits",{p_user_id:userId,p_amount:amount,p_request_id:requestId,p_description:description,p_metadata:metadata});
}
export function refundAiCredits(userId,{amount,requestId,description,metadata={}}){
  if(isNoCreditsLaunchMode())return Promise.resolve({refunded:false,balance:null,launchModeBypass:true,requestId});
  if(zeroSpendComputeMode())return Promise.resolve({refunded:false,balance:null,zeroSpendComputeBypass:true,requestId});
  return call("server_refund_ai_credits",{p_user_id:userId,p_request_id:requestId,p_amount:amount,p_description:description,p_metadata:metadata});
}