import { NextResponse } from "next/server";
import { createClient } from "../../../../../../../lib/supabase/server.js";
import { createManagedCheckout } from "../../../../../../../lib/integrations/server.js";

function safeRequestKey(value){return String(value||"").trim().replace(/[^a-zA-Z0-9._:-]/g,"-").slice(0,80);}
function safeOrigin(request){
  const configured=String(process.env.NEXT_PUBLIC_APP_URL||"").trim();
  const candidate=configured||new URL(request.url).origin;
  const url=new URL(candidate);
  if(url.protocol!=="https:"&&!(["localhost","127.0.0.1"].includes(url.hostname)&&url.protocol==="http:"))throw new Error("A secure application origin is required for checkout redirects.");
  return url.origin;
}

export async function POST(request,{params}){
  try{
    const {id,offerId}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data:app}=await supabase.from("apps").select("id,name,owner_id").eq("id",id).eq("owner_id",user.id).single();if(!app)return NextResponse.json({error:"Project not found."},{status:404});
    const {data:offer}=await supabase.from("monetization_offers").select("id,name,description,amount,currency,billing_mode,enabled").eq("id",offerId).eq("app_id",id).eq("owner_id",user.id).single();if(!offer)return NextResponse.json({error:"Offer not found."},{status:404});if(!offer.enabled)return NextResponse.json({error:"Offer is disabled."},{status:409});
    const amount=Number(offer.amount),currency=String(offer.currency||"").trim().toLowerCase(),mode=String(offer.billing_mode||"").trim();
    if(!Number.isFinite(amount)||amount<0.5||amount>1000000)return NextResponse.json({error:"Offer amount is outside the supported range."},{status:409});
    if(!/^[a-z]{3}$/.test(currency))return NextResponse.json({error:"Offer currency is invalid."},{status:409});
    if(!["payment","subscription"].includes(mode))return NextResponse.json({error:"Offer billing mode is invalid."},{status:409});
    const body=await request.json().catch(()=>({}));
    const suppliedKey=safeRequestKey(body?.requestId||request.headers.get("idempotency-key"));
    const requestBucket=suppliedKey||String(Math.floor(Date.now()/60000));
    const idempotencyKey=`checkout:${user.id}:${id}:${offer.id}:${requestBucket}`;
    const origin=safeOrigin(request);
    const result=await createManagedCheckout({name:offer.name,description:offer.description,amount,currency,mode,successUrl:`${origin}/monetization/${id}?checkout=success`,cancelUrl:`${origin}/monetization/${id}?checkout=cancel`,clientReferenceId:`${id}:${offer.id}`,idempotencyKey});
    if(result.status!=="completed")return NextResponse.json({success:false,status:result.status,error:"Managed Payments is not configured yet."},{status:409});
    const {data:existingLog}=await supabase.from("payment_checkout_logs").select("id").eq("app_id",id).eq("offer_id",offer.id).eq("owner_id",user.id).eq("external_checkout_id",result.checkoutId).limit(1).maybeSingle();
    let logError=null;
    if(!existingLog){const logged=await supabase.from("payment_checkout_logs").insert({app_id:id,offer_id:offer.id,owner_id:user.id,external_checkout_id:result.checkoutId,status:"created"});logError=logged.error||null;}
    if(logError)console.error("CHECKOUT_LOG_ERROR",logError);
    return NextResponse.json({success:true,url:result.url,checkoutId:result.checkoutId,requestId:requestBucket,replayed:Boolean(existingLog),trackingRecorded:Boolean(existingLog)||!logError});
  }catch(error){console.error("CHECKOUT_CREATE_ERROR",error);return NextResponse.json({error:error?.message||"Unable to create checkout."},{status:500});}
}
