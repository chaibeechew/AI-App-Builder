import { NextResponse } from "next/server";
import { getVideoRendererConfig } from "../../../../lib/video/render-gateway.js";

export async function GET(){
  const config=getVideoRendererConfig();
  return NextResponse.json({
    ok:true,
    externalRendererConnected:config.connected,
    externalRendererAllowed:config.configured,
    blockedByCostPolicy:config.blockedByCostPolicy,
    costMode:config.costMode,
    durableMp4Capture:true,
    atomicRenderClaim:true,
    replaySafeStoryboard:true,
    replaySafeProject:true,
    downstreamIdempotencyKey:true,
    maxDurableMp4Bytes:64*1024*1024,
  },{headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});
}
