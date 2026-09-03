import { NextResponse } from "next/server";
import { getImageGenerationConfig } from "../../../../../lib/ai/image-generation-gateway.js";

export async function GET(){
  const config=getImageGenerationConfig();
  return NextResponse.json({
    ok:true,
    externalProviderConnected:config.connected,
    externalProviderAllowed:config.configured,
    blockedByCostPolicy:config.blockedByCostPolicy,
    costMode:config.costMode,
    durableProviderCapture:true,
    idempotentReplay:true,
    maxProviderOutputs:4,
  },{headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});
}
