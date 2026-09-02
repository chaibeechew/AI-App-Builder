import { NextResponse } from "next/server";
import { publicPlatformStatus } from "../../../../lib/soolen/platform-operator.js";

export const dynamic="force-dynamic";

function reply(payload,status=200){
  return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}

export async function GET(){
  try{
    const platform=publicPlatformStatus();
    return reply({success:true,platform});
  }catch(error){
    console.error("SOOLEN_PLATFORM_STATUS_ERROR:",error?.code||error?.name||"unknown");
    return reply({success:false,error:"Platform status is temporarily unavailable."},503);
  }
}
