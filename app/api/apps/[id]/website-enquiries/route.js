import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../../lib/supabase/admin.js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES=new Set(["new","contacted","archived"]);
function output(body,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff","Vary":"Cookie"}});}
async function ownerContext(id){
  if(!UUID.test(String(id||"")))return{error:output({success:false,error:"Project not found."},404)};
  const supabase=await createClient();const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)return{error:output({success:false,error:"Authentication required."},401)};
  const admin=createAdminClient();const{data:app,error}=await admin.from("apps").select("id,owner_id").eq("id",id).eq("owner_id",user.id).maybeSingle();if(error||!app)return{error:output({success:false,error:"Project not found or access denied."},404)};
  return{admin,user,app};
}

export async function GET(request,{params}){
  try{
    const{id}=await params;const ctx=await ownerContext(id);if(ctx.error)return ctx.error;const url=new URL(request.url);const limit=Math.min(50,Math.max(1,Number(url.searchParams.get("limit"))||20));
    const{data,error}=await ctx.admin.from("website_enquiries").select("id,name,email,phone,message,status,created_at,updated_at").eq("app_id",id).eq("owner_id",ctx.user.id).order("created_at",{ascending:false}).limit(limit);if(error)throw error;
    return output({success:true,enquiries:(data||[]).map(row=>({id:row.id,name:row.name,email:row.email,phone:row.phone,message:row.message,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at}))});
  }catch(error){console.error("WEBSITE_ENQUIRY_INBOX_GET_ERROR",String(error?.code||error?.name||"UNKNOWN"));return output({success:false,error:"Unable to load website enquiries."},500);}
}

export async function PATCH(request,{params}){
  try{
    const{id}=await params;const ctx=await ownerContext(id);if(ctx.error)return ctx.error;const body=await request.json().catch(()=>({}));const enquiryId=String(body?.enquiryId||"").trim(),status=String(body?.status||"").trim();if(!UUID.test(enquiryId)||!STATUSES.has(status))return output({success:false,error:"Valid enquiry and status are required."},400);
    const{data,error}=await ctx.admin.from("website_enquiries").update({status,updated_at:new Date().toISOString()}).eq("id",enquiryId).eq("app_id",id).eq("owner_id",ctx.user.id).select("id,status,updated_at").maybeSingle();if(error)throw error;if(!data)return output({success:false,error:"Enquiry not found."},404);
    return output({success:true,enquiry:{id:data.id,status:data.status,updatedAt:data.updated_at}});
  }catch(error){console.error("WEBSITE_ENQUIRY_INBOX_PATCH_ERROR",String(error?.code||error?.name||"UNKNOWN"));return output({success:false,error:"Unable to update website enquiry."},500);}
}
