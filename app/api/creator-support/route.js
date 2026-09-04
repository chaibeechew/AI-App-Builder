import { NextResponse } from "next/server";
import { loadCreatorSupportStatus, submitCreatorSupportRequest, redeemCreatorSupportCode } from "../../../lib/cloud/creator-support.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
function mapFailure(result){
  if(result?.code==="AUTHENTICATION_REQUIRED")return json({authenticated:false,showButton:false,error:"Authentication required."},401);
  if(["INVALID_CREATOR_SUPPORT_CODE"].includes(result?.code))return json({error:result?.error||"Invalid Creator Support code."},400);
  if(["CREATOR_SUPPORT_REQUEST_REJECTED","CREATOR_SUPPORT_REDEEM_REJECTED"].includes(result?.code))return json({error:result?.error||"Creator Support request was not accepted."},409);
  return json({error:"Unable to complete Creator Support action."},500);
}

export async function GET(){
  try{
    const result=await loadCreatorSupportStatus();
    if(!result?.ok)return mapFailure(result);
    return json(result.data);
  }catch(error){
    console.error("CREATOR_SUPPORT_STATUS_ERROR",error?.code||error?.message||"unknown");
    return json({error:"Unable to load Creator Support status."},500);
  }
}

export async function POST(request){
  try{
    const body=await request.json().catch(()=>({}));
    const action=String(body?.action||"");
    if(action==="request"){
      const result=await submitCreatorSupportRequest({reason:body?.reason,individualAttested:body?.individualAttested===true});
      return result?.ok?json(result.data):mapFailure(result);
    }
    if(action==="redeem"){
      const result=await redeemCreatorSupportCode({code:body?.code});
      return result?.ok?json(result.data):mapFailure(result);
    }
    return json({error:"Unsupported Creator Support action."},400);
  }catch(error){
    console.error("CREATOR_SUPPORT_ACTION_ERROR",error?.code||error?.message||"unknown");
    return json({error:"Unable to complete Creator Support action."},500);
  }
}
