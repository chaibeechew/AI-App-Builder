import crypto from "node:crypto";
import { createAdminClient } from "../supabase/admin.js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class WebsiteEnquiryError extends Error{
  constructor(code,message,status=400){super(message);this.name="WebsiteEnquiryError";this.code=code;this.status=status;}
}

function secret(){
  const value=String(process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET||process.env.LANERIQ_COMMUNICATION_PRIVACY_SECRET||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(value.length<32)throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_NOT_CONFIGURED","Website enquiries are temporarily unavailable.",503);
  return value;
}
function cleanText(value,max){return String(value??"").trim().slice(0,max);}
function sourceIdentity(request){
  const forwarded=String(request.headers.get("x-vercel-forwarded-for")||request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip")||"").split(",")[0].trim().slice(0,128);
  const agent=String(request.headers.get("user-agent")||"unknown").trim().slice(0,256);
  return `${forwarded||"unknown"}|${agent}`;
}
function sourceHash(request){return crypto.createHmac("sha256",secret()).update(`website-enquiry:v1:${sourceIdentity(request)}`).digest("hex");}

export function sanitizeWebsiteEnquiry(body){
  const source=body&&typeof body==="object"&&!Array.isArray(body)?body:{};
  const requestId=cleanText(source.requestId,160);
  const name=cleanText(source.name,120);
  const email=cleanText(source.email,254).toLowerCase();
  const phone=cleanText(source.phone,50);
  const message=cleanText(source.message,2000);
  const website=cleanText(source.website,300);
  if(!REQUEST_ID.test(requestId))throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_REQUEST_ID_INVALID","Please retry this enquiry.");
  if(!name)throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_NAME_INVALID","Please enter your name.");
  if(email&&!EMAIL.test(email))throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_EMAIL_INVALID","Please enter a valid email address.");
  if(phone&&phone.length<6)throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_PHONE_INVALID","Please enter a valid phone number.");
  if(!email&&!phone)throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_CONTACT_REQUIRED","Please enter an email address or phone number.");
  if(!message)throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_MESSAGE_INVALID","Please enter a message.");
  return{requestId,name,email:email||null,phone:phone||null,message,website};
}

function databaseFailure(error){
  const detail=String(error?.message||error?.details||"");
  if(detail.includes("WEBSITE_ENQUIRY_RATE_LIMITED")||detail.includes("WEBSITE_ENQUIRY_DAILY_LIMITED")||detail.includes("WEBSITE_ENQUIRY_SITE_LIMITED"))return new WebsiteEnquiryError("WEBSITE_ENQUIRY_RATE_LIMITED","Too many enquiries were sent recently. Please try again later.",429);
  if(detail.includes("WEBSITE_ENQUIRY_SITE_NOT_PUBLISHED"))return new WebsiteEnquiryError("WEBSITE_ENQUIRY_SITE_NOT_PUBLISHED","This enquiry form is not active yet.",404);
  if(detail.includes("WEBSITE_ENQUIRY_")&&detail.includes("INVALID"))return new WebsiteEnquiryError("WEBSITE_ENQUIRY_INVALID","Please check the enquiry details and try again.",400);
  return new WebsiteEnquiryError("WEBSITE_ENQUIRY_SAVE_FAILED","We could not save your enquiry right now.",503);
}

export async function submitWebsiteEnquiry({request,appId,body}){
  const id=cleanText(appId,64);if(!UUID.test(id))throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_APP_INVALID","Website not found.",404);
  const input=sanitizeWebsiteEnquiry(body);
  if(input.website)return{accepted:true,replayed:false,filtered:true,enquiryId:null};
  const admin=createAdminClient();
  const{data,error}=await admin.rpc("server_create_website_enquiry",{
    p_app_id:id,p_request_id:input.requestId,p_source_hash:sourceHash(request),p_name:input.name,p_email:input.email,p_phone:input.phone,p_message:input.message,
  });
  if(error)throw databaseFailure(error);
  if(!data?.accepted)throw new WebsiteEnquiryError("WEBSITE_ENQUIRY_SAVE_FAILED","We could not save your enquiry right now.",503);
  return{accepted:true,replayed:Boolean(data.replayed),filtered:false,enquiryId:data.enquiry_id||null};
}
