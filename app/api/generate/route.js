import { NextResponse } from "next/server";
import { runAutonomousEngine } from "../../../engine/autonomous-engine.js";
import { normalizeAppSpec } from "../../../lib/generator/runtime-guard.js";
import { buildAppExplanation } from "../../../lib/generator/app-explanation.js";
import { selfTestGeneratedApp } from "../../../lib/generator/self-test.js";
import { createClient } from "../../../lib/supabase/server.js";

const GENERATE_CREDIT_COST = Math.max(1, Number(process.env.APP_GENERATE_CREDIT_COST || 10));

export async function POST(request) {
  let supabase = null;
  let charged = false;
  let chargeRequestId = null;
  let entitlementSource = null;
  try {
    supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ success:false,error:"Authentication required." }, { status:401 });
    if (!user.confirmed_at && !user.email_confirmed_at && !user.phone_confirmed_at) return NextResponse.json({ success:false,error:"Please verify your email or phone before creating an app." }, { status:403 });
    const body = await request.json();
    const idea = String(body?.idea || body?.prompt || "").trim();
    chargeRequestId = String(body?.requestId || crypto.randomUUID()).trim();
    if (!idea) return NextResponse.json({ success:false,error:"Please describe the app you want to build." }, { status:400 });
    if (idea.length > 8000) return NextResponse.json({ success:false,error:"App description is too long." }, { status:413 });

    const { data: entitlement, error: entitlementError } = await supabase.rpc("consume_app_builder_entitlement", { p_operation:"create", p_app_id:null });
    if (entitlementError) throw entitlementError;
    if (!entitlement?.allowed) {
      const { data: charge, error: chargeError } = await supabase.rpc("consume_ai_credits", { p_amount:GENERATE_CREDIT_COST,p_request_id:chargeRequestId,p_description:"AI app generation",p_metadata:{operation:"generate"} });
      if (chargeError) {
        if (chargeError.message?.toLowerCase().includes("insufficient credits")) return NextResponse.json({success:false,error:"Insufficient credits.",requiredCredits:GENERATE_CREDIT_COST},{status:402});
        throw chargeError;
      }
      charged = charge?.charged !== false;
    } else entitlementSource = entitlement.source;

    const result = await runAutonomousEngine(idea);
    const normalized = normalizeAppSpec(result?.specification);
    const test = selfTestGeneratedApp(normalized);
    if (!test.ok) throw new Error(`Generated app failed self-test: ${test.errors.join("; ")}`);
    const specification = test.normalizedSpec;
    const appName = String(specification.name || "Untitled App").trim();
    const appDescription = String(specification.description || "").trim();
    const { data: app, error: appError } = await supabase.from("apps").insert({ owner_id:user.id,name:appName,description:appDescription,source_prompt:idea }).select("id,name,description,created_at,updated_at").single();
    if (appError) throw appError;
    const { data: version, error: versionError } = await supabase.from("app_versions").insert({ app_id:app.id,version_no:1,specification,change_summary:"Initial AI-generated application",created_by:user.id }).select("id,version_no,created_at").single();
    if (versionError) throw versionError;
    const { error: appUpdateError } = await supabase.from("apps").update({current_version_id:version.id}).eq("id",app.id).eq("owner_id",user.id);
    if (appUpdateError) throw appUpdateError;
    const { error: referralError } = await supabase.rpc("record_first_app_referral_reward");
    if (referralError) console.warn("Referral qualification could not be recorded:",referralError.message);
    return NextResponse.json({success:true,...result,specification,explanation:buildAppExplanation(specification),selfTest:test,entitlement:{source:entitlementSource,charged},credits:{charged:charged?GENERATE_CREDIT_COST:0,requestId:chargeRequestId},app:{id:app.id,name:app.name,versionId:version.id,versionNo:version.version_no}});
  } catch(error) {
    console.error("AI App Builder error:",error);
    if (supabase && charged && chargeRequestId) await supabase.rpc("refund_ai_credits",{p_request_id:chargeRequestId,p_amount:GENERATE_CREDIT_COST,p_description:"AI generation failed - automatic refund",p_metadata:{operation:"generate"}});
    return NextResponse.json({success:false,error:"Unable to generate the app. Any charged credits were automatically refunded."},{status:500});
  }
}
