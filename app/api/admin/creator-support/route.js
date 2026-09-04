import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../lib/supabase/admin.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
async function requireAdmin(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return {error:json({error:"Authentication required."},401)};if(String(user.app_metadata?.role||"").toLowerCase()!=="admin")return {error:json({error:"Admin access required."},403)};return {supabase,user};}

export async function GET(){
  try{
    const auth=await requireAdmin();if(auth.error)return auth.error;
    const admin=createAdminClient();
    const [{data:settings,error:settingsError},{data:requests,error:requestsError}]=await Promise.all([
      admin.from("creator_support_settings").select("approval_mode,extension_months,code_valid_days,updated_at").eq("singleton_id",1).single(),
      admin.from("creator_support_requests").select("id,user_id,unfinished_project_id,reason,individual_attested,status,approval_mode,decision_reason,requested_at,decided_at,decided_by,redeemed_at").order("requested_at",{ascending:false}).limit(500),
    ]);
    if(settingsError||requestsError)throw settingsError||requestsError;
    const ids=(requests||[]).map(item=>item.id);
    let codes=[];
    if(ids.length){const {data,error}=await admin.from("creator_support_codes").select("request_id,code,issued_mode,issued_at,valid_until,redeemed_at,revoked_at").in("request_id",ids);if(error)throw error;codes=data||[];}
    const byRequest=new Map(codes.map(item=>[item.request_id,item]));
    return json({settings,requests:(requests||[]).map(item=>({...item,code:byRequest.get(item.id)||null}))});
  }catch(error){console.error("ADMIN_CREATOR_SUPPORT_GET_ERROR",error?.code||error?.message||"unknown");return json({error:"Unable to load Creator Support requests."},500);}
}

export async function POST(request){
  try{
    const auth=await requireAdmin();if(auth.error)return auth.error;
    const body=await request.json().catch(()=>({}));
    const action=String(body?.action||"");
    if(action==="set_mode"){
      const mode=String(body?.mode||"");
      if(!["auto","manual"].includes(mode))return json({error:"Invalid approval mode."},400);
      const {data,error}=await auth.supabase.rpc("admin_set_creator_support_mode",{p_mode:mode});if(error)throw error;return json(data);
    }
    if(action==="review"){
      const requestId=String(body?.requestId||"");const decision=String(body?.decision||"");const reason=String(body?.reason||"").slice(0,500);
      if(!/^[0-9a-f-]{36}$/i.test(requestId)||!["approve","reject"].includes(decision))return json({error:"Invalid review request."},400);
      const {data,error}=await auth.supabase.rpc("admin_review_creator_support",{p_request_id:requestId,p_decision:decision,p_reason:reason||null});if(error)return json({error:error.message||"Unable to review request."},409);return json(data);
    }
    return json({error:"Unsupported admin action."},400);
  }catch(error){console.error("ADMIN_CREATOR_SUPPORT_POST_ERROR",error?.code||error?.message||"unknown");return json({error:"Unable to update Creator Support."},500);}
}
