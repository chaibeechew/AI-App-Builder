import assert from "node:assert/strict";
import fs from "node:fs";
import { defineSovereignServiceManifest } from "../lib/sovereign/service-manifest.js";
import { createCapabilityRegistry } from "../lib/sovereign/capability-registry.js";
import { createSovereignEvent, validateEventRoute } from "../lib/sovereign/event-envelope.js";
import { planGracefulDegradation, requireCapabilityOrDegrade } from "../lib/sovereign/degradation-planner.js";

const manifest=defineSovereignServiceManifest({serviceId:"test-service",displayName:"Test Service",version:"1.0",requiredByLaneriq:true,currentMode:"embedded",deploymentModes:["embedded","remote"],capabilities:["test.run"],emitsEvents:["test.completed"],fallbackModes:["local_only"]});
assert.equal(manifest.protocol,"laneriq.sovereign-service.v1");
assert.equal(manifest.currentMode,"embedded");
assert.throws(()=>defineSovereignServiceManifest({...manifest,currentMode:"invalid"}));

const backup=defineSovereignServiceManifest({serviceId:"test-backup",displayName:"Test Backup",version:"1.0",currentMode:"remote",deploymentModes:["remote"],capabilities:["test.run"]});
const registry=createCapabilityRegistry([manifest,backup]);
registry.registerRuntime("test-service",{health:"offline"});
registry.registerRuntime("test-backup",{health:"ready",endpoint:"https://service.example.com/private?secret=redacted"});
const resolved=registry.resolveCapability("test.run");
assert.equal(resolved.serviceId,"test-backup");
assert.equal(registry.snapshot().find(item=>item.serviceId==="test-backup").endpointConfigured,true);
assert.equal(JSON.stringify(registry.snapshot()).includes("secret=redacted"),false,"Public registry snapshot must not expose service endpoint query data.");

const event=createSovereignEvent({eventType:"project.generated",source:"generation",subject:"project-1",data:{projectId:"project-1"},metadata:{region:"local"}});
assert.equal(event.protocol,"laneriq.event.v1");
assert.equal(validateEventRoute(event,{allowedTypes:["project.generated"],allowedSources:["generation"]}).ok,true);
assert.equal(validateEventRoute(event,{allowedTypes:["project.deleted"]}).reason,"event_type_not_allowed");
assert.throws(()=>createSovereignEvent({eventType:"bad",source:"x",data:{}}));

const snapshot=registry.snapshot();
const plan=planGracefulDegradation({registrySnapshot:snapshot,requiredCapabilities:["test.run","missing.required"],optionalCapabilities:["missing.optional"]});
assert.equal(plan.mode,"safe_degraded");
assert.equal(plan.canContinue,true);
assert.equal(plan.hardStop,false);
assert.deepEqual(plan.missingRequired,["missing.required"]);
assert.ok(plan.actions.includes("preserve_local_state"));
assert.equal(requireCapabilityOrDegrade(registry,"test.run").mode,"normal");
assert.equal(requireCapabilityOrDegrade(registry,"missing.capability").mode,"safe_degraded");

const route=fs.readFileSync("app/api/system/sovereign/status/route.js","utf8");
assert.match(route,/laneriq\.sovereign-fabric\.v1/);
assert.match(route,/evidenceLevel:\"CODE\"/);
assert.match(route,/Cache-Control/);
assert.doesNotMatch(route,/process\.env/);
assert.doesNotMatch(route,/TOKEN|SECRET|PASSWORD|SERVICE_ROLE/);

for(const path of ["lib/sovereign/service-manifest.js","lib/sovereign/capability-registry.js","lib/sovereign/event-envelope.js","lib/sovereign/degradation-planner.js"]){
  const source=fs.readFileSync(path,"utf8");
  assert.doesNotMatch(source,/@supabase|next\/server|vercel|process\.env/,`${path} must remain deployment/provider independent.`);
}

console.log("✓ Sovereign service manifests are deployment-independent and validated");
console.log("✓ Capability registry discovers healthy replacements without exposing endpoints");
console.log("✓ Event envelopes are bounded, typed and source-routable");
console.log("✓ Missing modules cause safe degradation instead of whole-system failure");
console.log("✓ Sovereign status API exposes CODE-level sanitized evidence only");
