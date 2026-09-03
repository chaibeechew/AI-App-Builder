import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";
import { getAppBuilderAccess } from "../../../lib/app-builder-access.js";
import { CREATOR_OPPORTUNITY_POLICY } from "../../../lib/creator-opportunity-policy.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}

export async function GET(){
  try{
    const supabase=await createClient();
    const{data:{user},error}=await supabase.auth.getUser();
    if(error||!user)return json({error:"Authentication required."},401);
    const access=await getAppBuilderAccess(supabase,user.id);
    const{data:requests,error:requestError}=await supabase.from("creator_opportunity_requests").select("id,idea_summary,commercial_potential,status,extra_platform_sales_share_percent,submitted_at,decided_at,admin_note").eq("user_id",user.id).order("submitted_at",{ascending:false}).limit(5);
    if(requestError)return json({error:"Unable to load Creator Opportunity status."},500);
    return json({success:true,policy:CREATOR_OPPORTUNITY_POLICY,active:access.creatorOpportunity,requests:requests||[]});
  }catch(error){console.error("CREATOR_OPPORTUNITY_GET_ERROR",error);return json({error:"Unable to load Creator Opportunity status."},500);}
}

export async function POST(request){
  try{
    const supabase=await createClient();
    const{data:{user},error}=await supabase.auth.getUser();
    if(error||!user)return json({error:"Authentication required."},401);
    if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return json({error:"Account verification is required before applying."},403);
    const access=await getAppBuilderAccess(supabase,user.id);
    if(access.creatorOpportunity.active)return json({error:"Creator Opportunity Access is already active on this individual account."},409);
    const body=await request.json().catch(()=>null);
    if(!body)return json({error:"Invalid request."},400);
    const ideaSummary=String(body?.ideaSummary||"").trim().slice(0,4000);
    const commercialPotential=String(body?.commercialPotential||"").trim().slice(0,4000);
    const confirmsIndividual=body?.confirmsIndividual===true;
    const acceptsExtraRevenueShare=body?.acceptsExtraRevenueShare===true;
    if(ideaSummary.length<40)return json({error:"Tell Admin more about your idea (at least 40 characters)."},400);
    if(commercialPotential.length<20)return json({error:"Explain why you believe the idea can attract buyers (at least 20 characters)."},400);
    if(!confirmsIndividual)return json({error:"This program is only for individual creators, not companies, teams or organizations."},400);
    if(!acceptsExtraRevenueShare)return json({error:"You must accept the additional 5 percentage-point platform sales share to apply."},400);
    const{data:pending}=await supabase.from("creator_opportunity_requests").select("id,status,submitted_at").eq("user_id",user.id).eq("status","pending").maybeSingle();
    if(pending)return json({success:true,replayed:true,request:pending,policy:CREATOR_OPPORTUNITY_POLICY});
    const{data:created,error:createError}=await supabase.from("creator_opportunity_requests").insert({user_id:user.id,applicant_type:"individual",idea_summary:ideaSummary,commercial_potential:commercialPotential,status:"pending",extra_platform_sales_share_percent:5,confirms_individual:true,accepts_extra_revenue_share:true}).select("id,status,submitted_at,extra_platform_sales_share_percent").single();
    if(createError){if(createError.code==="23505")return json({error:"A Creator Opportunity request is already awaiting Admin review."},409);throw createError;}
    return json({success:true,request:created,policy:CREATOR_OPPORTUNITY_POLICY},201);
  }catch(error){console.error("CREATOR_OPPORTUNITY_POST_ERROR",error);return json({error:"Unable to submit Creator Opportunity request."},500);}
}
