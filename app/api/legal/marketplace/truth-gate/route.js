import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../../lib/supabase/admin.js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};

export async function GET(request){
  try{
    const supabase=await createServerClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user){
      return NextResponse.json({error:"Authentication required."},{status:401,headers:NO_STORE});
    }

    const url=new URL(request.url);
    const transactionId=String(url.searchParams.get("transactionId")||"").trim();
    if(!UUID.test(transactionId)){
      return NextResponse.json({error:"Valid transaction identifier required."},{status:400,headers:NO_STORE});
    }

    const admin=createAdminClient();
    const {data:tx,error:txError}=await admin
      .from("app_sale_transactions")
      .select("id,seller_user_id,buyer_user_id")
      .eq("id",transactionId)
      .maybeSingle();

    if(txError){
      console.error("LEGAL_TRUTH_GATE_TRANSACTION_LOOKUP_ERROR",txError.code||"unknown");
      return NextResponse.json({error:"Legal marketplace runtime is not ready."},{status:503,headers:NO_STORE});
    }
    if(!tx){
      return NextResponse.json({error:"Sale transaction not found."},{status:404,headers:NO_STORE});
    }
    if(tx.seller_user_id!==user.id&&tx.buyer_user_id!==user.id){
      return NextResponse.json({error:"You are not authorized to view this transaction gate."},{status:403,headers:NO_STORE});
    }

    const {data:gate,error:gateError}=await admin.rpc("server_evaluate_app_sale_truth_gate",{
      p_transaction_id:transactionId
    });
    if(gateError||!gate?.found){
      console.error("LEGAL_TRUTH_GATE_RPC_ERROR",gateError?.code||"not_found");
      return NextResponse.json({error:"Unable to evaluate transaction truth gate."},{status:503,headers:NO_STORE});
    }

    return NextResponse.json({
      transactionId:gate.transactionId,
      appId:gate.appId,
      status:gate.status,
      ownershipTransferStatus:gate.ownershipTransferStatus,
      readyForTransfer:Boolean(gate.readyForTransfer),
      missingRequirements:Array.isArray(gate.missingRequirements)?gate.missingRequirements:[],
      transactionHold:Boolean(gate.transactionHold),
      dataTransferMode:gate.dataTransferMode,
      sellerVerificationStatus:gate.sellerVerificationStatus,
      paymentStatus:gate.paymentStatus,
      ipStatus:gate.ipStatus,
      malwareStatus:gate.malwareStatus,
      handoverStatus:gate.handoverStatus,
      credentialRotationStatus:gate.credentialRotationStatus,
      taxReviewStatus:gate.taxReviewStatus,
      readyForTransferAt:gate.readyForTransferAt,
      effectiveTransferAt:gate.effectiveTransferAt,
      completedAt:gate.completedAt
    },{headers:NO_STORE});
  }catch(error){
    console.error("LEGAL_TRUTH_GATE_API_ERROR",error?.name||"unknown");
    return NextResponse.json({error:"Unable to evaluate legal transaction readiness."},{status:500,headers:NO_STORE});
  }
}
