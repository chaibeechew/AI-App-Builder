import { NextResponse } from "next/server";
import { loadCreatorSupportAdmin, setCreatorSupportApprovalMode, reviewCreatorSupportRequest } from "../../../../lib/cloud/creator-support.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
function failure(result){
  if(result?.code==="AUTHENTICATION_REQUIRED")return json({error:"Authentication required."},401);
  if(result?.code==="ADMIN_REQUIRED")return json({error:"Admin access required."},403);
  if(["INVALID_APPROVAL_MODE","INVALID_REVIEW_REQUEST"].includes(result?.code))return json({error:result?.error||"Invalid admin request."},400);
  if(result?.code==="CREATOR_SUPPORT_REVIEW_FAILED")return json({error:result?.error||"Unable to review request."},409);
  return json({error:"Unable to update Creator Support."},500);
}

export async function GET(){
  try{
    const result=await loadCreatorSupportAdmin();
    return result?.ok?json(result.data):failure(result);
  }catch(error){console.error("ADMIN_CREATOR_SUPPORT_GET_ERROR",error?.code||error?.message||"unknown");return json({error:"Unable to load Creator Support requests."},500);}
}

export async function POST(request){
  try{
    const body=await request.json().catch(()=>({}));
    const action=String(body?.action||"");
    if(action==="set_mode"){
      const result=await setCreatorSupportApprovalMode({mode:String(body?.mode||"")});
      return result?.ok?json(result.data):failure(result);
    }
    if(action==="review"){
      const result=await reviewCreatorSupportRequest({requestId:String(body?.requestId||""),decision:String(body?.decision||""),reason:String(body?.reason||"").slice(0,500)});
      return result?.ok?json(result.data):failure(result);
    }
    return json({error:"Unsupported admin action."},400);
  }catch(error){console.error("ADMIN_CREATOR_SUPPORT_POST_ERROR",error?.code||error?.message||"unknown");return json({error:"Unable to update Creator Support."},500);}
}
