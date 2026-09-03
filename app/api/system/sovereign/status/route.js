import { NextResponse } from "next/server";
import { defineSovereignServiceManifest } from "../../../../../lib/sovereign/service-manifest.js";
import { createCapabilityRegistry } from "../../../../../lib/sovereign/capability-registry.js";
import { planGracefulDegradation } from "../../../../../lib/sovereign/degradation-planner.js";

export const dynamic="force-dynamic";

const manifests=[
  defineSovereignServiceManifest({serviceId:"generation",displayName:"LANERIQ Generation Intelligence",version:"1.0",requiredByLaneriq:true,currentMode:"embedded",deploymentModes:["embedded","remote","device"],capabilities:["project.generate","project.modify"],fallbackModes:["provider_failover","device_degraded","read_only"]}),
  defineSovereignServiceManifest({serviceId:"cloud",displayName:"LANERIQ Cloud Domain",version:"1.0",requiredByLaneriq:true,currentMode:"embedded",deploymentModes:["embedded","remote","hybrid"],capabilities:["project.persistence","project.sync"],fallbackModes:["local_only","queued_sync"]}),
  defineSovereignServiceManifest({serviceId:"communications",displayName:"LANERIQ Communications",version:"1.0",requiredByLaneriq:false,currentMode:"embedded",deploymentModes:["embedded","remote"],capabilities:["message.dispatch"],fallbackModes:["in_app_only","queued_delivery"]}),
  defineSovereignServiceManifest({serviceId:"memory",displayName:"LANERIQ Project Memory",version:"1.0",requiredByLaneriq:false,currentMode:"embedded",deploymentModes:["embedded","remote","device"],capabilities:["project.memory"],fallbackModes:["session_only","device_only"]}),
];

export async function GET(){
  const registry=createCapabilityRegistry(manifests);
  for(const manifest of manifests)registry.registerRuntime(manifest.serviceId,{health:"unknown"});
  const snapshot=registry.snapshot();
  const plan=planGracefulDegradation({registrySnapshot:snapshot,requiredCapabilities:["project.generate","project.persistence"],optionalCapabilities:["message.dispatch","project.memory"]});
  return NextResponse.json({
    ok:true,
    protocol:"laneriq.sovereign-fabric.v1",
    architecture:"independent_by_deployment_interoperable_by_contract",
    evidenceLevel:"CODE",
    serviceCount:snapshot.length,
    services:snapshot.map(service=>({serviceId:service.serviceId,version:service.version,currentMode:service.currentMode,deploymentModes:service.deploymentModes,capabilities:service.capabilities,health:service.health})),
    degradation:{mode:plan.mode,canContinue:plan.canContinue,hardStop:plan.hardStop},
  },{headers:{"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
}
