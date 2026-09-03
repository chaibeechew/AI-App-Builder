import { NextResponse } from "next/server";
import { communicationServiceCapabilities } from "../../../../../lib/communications/service-core.js";
import { createEmbeddedCommunicationRuntime } from "../../../../../lib/communications/runtime-port.js";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    const runtime=createEmbeddedCommunicationRuntime();
    const capabilities=communicationServiceCapabilities(runtime);
    return NextResponse.json({ok:true,...capabilities},{status:200,headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({ok:false,service:"LANERIQ OmniChannel Communication Service",status:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
