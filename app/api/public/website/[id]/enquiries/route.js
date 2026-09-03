import { NextResponse } from "next/server";
import { submitWebsiteEnquiry,WebsiteEnquiryError } from "../../../../../../lib/website/enquiries.js";

const MAX_BODY_BYTES=12_000;
function response(body,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}

export async function POST(request,{params}){
  try{
    const length=Number(request.headers.get("content-length")||0);if(Number.isFinite(length)&&length>MAX_BODY_BYTES)return response({success:false,error:"Enquiry is too large.",code:"WEBSITE_ENQUIRY_TOO_LARGE"},413);
    const{id}=await params;const body=await request.json().catch(()=>null);if(!body)return response({success:false,error:"Valid enquiry details are required.",code:"WEBSITE_ENQUIRY_INVALID_JSON"},400);
    const result=await submitWebsiteEnquiry({request,appId:id,body});
    return response({success:true,accepted:true,replayed:result.replayed},result.replayed?200:201);
  }catch(error){
    if(error instanceof WebsiteEnquiryError)return response({success:false,error:error.message,code:error.code},error.status);
    console.error("WEBSITE_ENQUIRY_POST_ERROR",String(error?.code||error?.name||"UNKNOWN"));
    return response({success:false,error:"Website enquiries are temporarily unavailable.",code:"WEBSITE_ENQUIRY_UNAVAILABLE"},503);
  }
}
