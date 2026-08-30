import { NextResponse } from "next/server";
import { createClient } from "../../../../../../../../lib/supabase/server.js";
import { createManagedCheckout } from "../../../../../../../../lib/integrations/server.js";

export async function POST(request,{params}){
  try{
    const {id,offerId}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data:app}=await supabase.from("apps").select("id,name,owner_id").eq("id",id).eq("owner_id",user.id).single();if(!app)return NextResponse.json({error:"Project not found."},{status:404});
    const {data:offer}=await supabase.from("monetization_offers").select("id,name,description,amount,currency,billing_mode,enabled").eq("id",offerId).eq("app_id",id).eq("owner_id",user.id).single();if(!offer)return NextResponse.json({error:"Offer not found."},{status:404});if(!offer.enabled)return NextResponse.json({error:"Offer is disabled."},{status:409});
    const origin=new URL(request.url).origin;
    const result=await createManagedCheckout({name:offer.name,description:offer.description,amount:offer.amount,currency:offer.currency,mode:offer.billing_mode,successUrl:`${origin}/monetization/${id}?checkout=success`,cancelUrl:`${origin}/monetization/${id}?checkout=cancel`,clientReferenceId:`${id}:${offer.id}`});
    if(result.status!=="completed")return NextResponse.json({success:false,status:result.status,error:"Managed Payments is not configured yet."},{status:409});
    await supabase.from("payment_checkout_logs").insert({app_id:id,offer_id:offer.id,owner_id:user.id,external_checkout_id:result.checkoutId,status:"created"});
    return NextResponse.json({success:true,url:result.url,checkoutId:result.checkoutId});
  }catch(error){console.error("CHECKOUT_CREATE_ERROR",error);return NextResponse.json({error:error?.message||"Unable to create checkout."},{status:500});}
}
