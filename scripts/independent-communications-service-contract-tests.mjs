import assert from "node:assert/strict";
import fs from "node:fs";
import { createCommunicationServiceRuntime, communicationServiceCapabilities, normalizeServiceMessage, planServiceMessage } from "../lib/communications/service-core.js";

const core=fs.readFileSync("lib/communications/service-core.js","utf8");
const runtime=fs.readFileSync("lib/communications/runtime-port.js","utf8");
const route=fs.readFileSync("app/api/communications/v1/status/route.js","utf8");
const docs=fs.readFileSync("docs/independent-communications-service.md","utf8");

for(const forbidden of ["next/","react","@supabase","vercel","app/"])assert.equal(core.includes(forbidden),false,`Independent service core must not depend on ${forbidden}`);
assert.match(core,/createCommunicationServiceRuntime/);
assert.match(core,/deliverZeroCostCommunication/);
assert.match(runtime,/createEmbeddedCommunicationRuntime/);
assert.match(route,/communicationServiceCapabilities/);
assert.match(route,/Cache-Control/);
assert.doesNotMatch(route,/process\.env\.[A-Z0-9_]*(TOKEN|SECRET|KEY)/);
assert.match(docs,/embedded_now_extractable_later/);
assert.match(docs,/No public arbitrary-send endpoint/);

const runtimeFixture=createCommunicationServiceRuntime({
  adapterStatus:()=>({
    in_app:{contractReady:true,runtimeReady:true,providerReady:true,liveVerified:false,costClass:"free",health:"ready",evidenceLevel:"CODE"},
    sms:{contractReady:true,runtimeReady:true,providerReady:true,liveVerified:false,costClass:"paid",health:"ready",evidenceLevel:"CODE"},
  }),
  senders:()=>({in_app:async()=>({status:"completed"}),sms:async()=>({status:"completed"})}),
});

const capabilities=communicationServiceCapabilities(runtimeFixture);
assert.equal(capabilities.architecture,"provider_agnostic_port_adapter");
assert.equal(capabilities.deploymentMode,"embedded_now_extractable_later");
assert.equal(capabilities.channels.in_app.costClass,"free");
assert.equal(capabilities.channels.sms.costClass,"paid");

const message=normalizeServiceMessage({to:"user-1",body:"Hello",preferredChannels:["in_app","sms"]});
assert.equal(message.to,"user-1");
assert.deepEqual(message.preferredChannels,["in_app","sms"]);
const planned=planServiceMessage(runtimeFixture,{to:"user-1",body:"Hello",preferredChannels:["sms","in_app"]});
assert.equal(planned.plan.selected,"in_app","Paid SMS must remain blocked in zero-cost mode even when preferred first.");
assert.equal(planned.plan.externalSpendCap,0);

console.log("✓ Communications core is provider/runtime independent");
console.log("✓ Embedded runtime is replaceable through two stable ports");
console.log("✓ Status API exposes sanitized capabilities only");
console.log("✓ Zero-cost policy remains authoritative across the service boundary");
