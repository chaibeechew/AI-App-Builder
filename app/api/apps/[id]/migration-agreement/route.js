import { NextResponse } from "next/server";
import { loadProjectMigrationAgreement, signProjectMigrationAgreement } from "../../../../../lib/cloud/creator-support.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
function failure(result){
  if(result?.code==="AUTHENTICATION_REQUIRED")return json({error:"Authentication required."},401);
  if(result?.code==="MIGRATION_ACKNOWLEDGEMENTS_REQUIRED")return json({error:"All migration agreement acknowledgements are required."},400);
  if(["MIGRATION_AGREEMENT_READ_FAILED","MIGRATION_AGREEMENT_SIGN_FAILED"].includes(result?.code)){
    const message=result?.error||"Migration agreement request was not accepted.";
    const lower=String(message).toLowerCase();
    if(lower.includes("not found"))return json({error:"Project not found."},404);
    if(lower.includes("after publish"))return json({error:message},409);
  }
  return json({error:"Unable to complete migration agreement request."},500);
}

export async function GET(_request,{params}){
  try{
    const {id}=await params;
    const result=await loadProjectMigrationAgreement({appId:id});
    return result?.ok?json(result.data):failure(result);
  }catch(error){console.error("MIGRATION_AGREEMENT_GET_ERROR",error?.code||error?.message||"unknown");return json({error:"Unable to load migration agreement."},500);}
}

export async function POST(request,{params}){
  try{
    const {id}=await params;const body=await request.json().catch(()=>({}));
    const result=await signProjectMigrationAgreement({appId:id,termsVersion:body?.termsVersion,acknowledge10Percent:body?.acknowledge10Percent===true,acknowledgeContinuingShare:body?.acknowledgeContinuingShare===true,acknowledgeCustomerOwnership:body?.acknowledgeCustomerOwnership===true});
    return result?.ok?json(result.data):failure(result);
  }catch(error){console.error("MIGRATION_AGREEMENT_POST_ERROR",error?.code||error?.message||"unknown");return json({error:"Unable to sign migration agreement."},500);}
}
