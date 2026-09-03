import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../lib/supabase/admin.js";
import { CREATOR_OPPORTUNITY_POLICY } from "../../../../lib/creator-opportunity-policy.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
async function requireAdmin(){const supabase=await createClient();const{data:{user},error}=await supabase.auth.getUser();if(error||!user)return{error:json({error:"Authentication required."},401)};if(user.app_metadata?.role!=="admin")return{error:json({error:"Admin access required."},403)};return{user};}

export async function GET(){
  try{
    const auth=await requireAdmin();if(auth.error)return auth.error;
    const admin=createAdminClient();
    const{data,error}=await admin.from("creator_opportunity_requests").select("id,user_id,applicant_type,idea_summary,commercial_potential,status,extra_platform_sales_share_percent,submitted_at,decided_at,decided_by,admin_note").order("submitted_at",{ascending:false}).limit(100);
    if(error)throw error;
    return json({success:true,policy:CREATOR_OPPORTUNITY_POLICY,requests:data||[]});
  }catch(error){console.error("ADMIN_CREATOR_OPPORTUNITY_GET_ERROR",error);return json({error:"Unable to load Creator Opportunity requests."},500);}
}

export async function POST(request){
  try{
    const auth=await requireAdmin();if(auth.error)return auth.error;
    const body=await request.json().catch(()=>null);
    const requestId=String(body?.requestId||"").trim();
    const decision=String(body?.decision||"").trim();
    const adminNote=String(body?.adminNote||"").trim().slice(0,2000)||null;
    if(!/^[0-9a-f-]{36}$/i.test(requestId)||!["approved","rejected"].includes(decision))return json({error:"Invalid Admin decision."},400);
    const admin=createAdminClient();
    const{data:item,error:itemError}=await admin.from("creator_opportunity_requests").select("id,user_id,status,applicant_type,confirms_individual,accepts_extra_revenue_share,extra_platform_sales_share_percent").eq("id",requestId).single();
    if(itemError||!item)return json({error:"Creator Opportunity request not found."},404);
    if(item.status!=="pending")return json({error:"This request was already decided."},409);
    if(item.applicant_type!=="individual"||item.confirms_individual!==true||item.accepts_extra_revenue_share!==true||Number(item.extra_platform_sales_share_percent)!==5)return json({error:"Request no longer satisfies the individual Creator Opportunity contract."},409);
    const decidedAt=new Date().toISOString();
    if(decision==="approved"){
      const{error:accessError}=await admin.from("app_builder_account_access").upsert({user_id:item.user_id,pro_valid_from:decidedAt,pro_valid_until:"9999-12-31T23:59:59.000Z",game_access_plan:"full",game_cooldown_level:0,game_cooldown_until:null,creator_opportunity_active:true,creator_opportunity_bonus_share_percent:5,creator_opportunity_approved_at:decidedAt,creator_opportunity_approved_by:auth.user.id,updated_at:decidedAt},{onConflict:"user_id"});
      if(accessError)throw accessError;
    }
    const{data:updated,error:updateError}=await admin.from("creator_opportunity_requests").update({status:decision,decided_at:decidedAt,decided_by:auth.user.id,admin_note:adminNote}).eq("id",item.id).eq("status","pending").select("id,user_id,status,decided_at,admin_note,extra_platform_sales_share_percent").single();
    if(updateError)throw updateError;
    return json({success:true,decision:updated,accessGranted:decision==="approved",fullAccess:decision==="approved",extraPlatformSalesSharePercentagePoints:decision==="approved"?5:0});
  }catch(error){console.error("ADMIN_CREATOR_OPPORTUNITY_DECISION_ERROR",error);return json({error:"Unable to save Creator Opportunity decision."},500);}
}
