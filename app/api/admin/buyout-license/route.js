import { NextResponse } from "next/server";
import { issueBuyoutLicenseAsAdmin } from "../../../../lib/buyout-license/server.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function failure(result){
  const code=result?.code;
  if(code==="AUTHENTICATION_REQUIRED")return json({error:"Authentication required."},401);
  if(code==="ADMIN_REQUIRED")return json({error:"Admin access required."},403);
  if(["INVALID_PROJECT_ID","INVALID_LICENSE_TIER","PAYMENT_REFERENCE_REQUIRED"].includes(code))return json({error:result?.error||"Invalid Buyout License request.",code},400);
  if(code==="PROJECT_NOT_FOUND")return json({error:"Project not found.",code},404);
  if(["BUYOUT_AFTER_PUBLISH_NOT_ALLOWED","GAME_BUYOUT_NOT_AVAILABLE","ENCOURAGE_CREATOR_BUYOUT_NOT_AVAILABLE"].includes(code))return json({error:result?.error||code.replaceAll("_"," "),code},409);
  return json({error:result?.error||"Unable to issue Buyout License.",code:code||"BUYOUT_LICENSE_FAILED"},500);
}

export async function POST(request){
  try{
    const body=await request.json().catch(()=>({}));
    const result=await issueBuyoutLicenseAsAdmin({
      appId:String(body?.appId||""),
      tier:String(body?.tier||""),
      paymentReference:String(body?.paymentReference||""),
      resendEmail:body?.resendEmail===true,
    });
    return result?.ok?json(result.data):failure(result);
  }catch(error){
    console.error("ADMIN_BUYOUT_LICENSE_ERROR",error?.code||error?.message||"unknown");
    return json({error:"Unable to issue Buyout License."},500);
  }
}
