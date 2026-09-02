import { NextResponse } from "next/server";
import { communicationGuardStatus } from "../../../../../lib/communications/guard.js";
import { deliveryAdapterStatus } from "../../../../../lib/communications/delivery-adapter.js";
import { createAdminClient } from "../../../../../lib/supabase/admin.js";

function json(payload,status=200){
  const response=NextResponse.json(payload,{status});
  response.headers.set("Cache-Control","private, no-store, max-age=0");
  response.headers.set("Pragma","no-cache");
  response.headers.set("X-Content-Type-Options","nosniff");
  return response;
}

async function storageReady(){
  try{
    const admin=createAdminClient();
    const {error}=await admin.from("communication_dispatches").select("id").limit(1);
    return !error;
  }catch{
    return false;
  }
}

export async function GET(){
  const guard=communicationGuardStatus();
  const delivery=deliveryAdapterStatus();
  const storage=await storageReady();
  const stages={
    guard:Boolean(guard.ready),
    storage:Boolean(storage),
    delivery:Boolean(delivery.email?.ready),
  };
  const ready=stages.guard&&stages.storage&&stages.delivery;
  return json({
    success:true,
    service:"LANERIQ Verification",
    channel:"email",
    ready,
    stages,
    otpAuthority:"laneriq",
    sessionAuthority:"laneriq",
  },200);
}
