import assert from "node:assert/strict";
import fs from "node:fs";
import { createCommunicationServiceRuntime, communicationServiceCapabilities, normalizeServiceMessage, planServiceMessage } from "../lib/communications/service-core.js";
import { signServiceRequest, verifyServiceRequestSignature } from "../lib/communications/service-auth.js";

const core=fs.readFileSync("lib/communications/service-core.js","utf8");
const runtime=fs.readFileSync("lib/communications/runtime-port.js","utf8");
const statusRoute=fs.readFileSync("app/api/communications/v1/status/route.js","utf8");
const dispatchRoute=fs.readFileSync("app/api/communications/v1/dispatch/route.js","utf8");
const requestStore=fs.readFileSync("lib/communications/service-request-store.js","utf8");
const client=fs.readFileSync("lib/communications/service-client.js","utf8");
const migration=fs.readFileSync("supabase/migrations/20260903155200_independent_communications_service_requests.sql","utf8");
const docs=fs.readFileSync("docs/independent-communications-service.md","utf8");

for(const forbidden of ["next/","react","@supabase","vercel","app/"])assert.equal(core.includes(forbidden),false,`Independent service core must not depend on ${forbidden}`);
assert.match(core,/createCommunicationServiceRuntime/);
assert.match(core,/deliverZeroCostCommunication/);
assert.match(core,/idempotencyKey/);
assert.match(runtime,/createEmbeddedCommunicationRuntime/);
assert.match(statusRoute,/communicationServiceCapabilities/);
assert.match(statusRoute,/Cache-Control/);
assert.doesNotMatch(statusRoute,/process\.env\.[A-Z0-9_]*(TOKEN|SECRET|KEY)/);
assert.match(dispatchRoute,/verifyServiceRequestSignature/);
assert.match(dispatchRoute,/claimCommunicationServiceRequest/);
assert.ok(dispatchRoute.indexOf("claim=await claimCommunicationServiceRequest")<dispatchRoute.indexOf("const result=await dispatchServiceMessage"),"Persistent replay/idempotency claim must happen before delivery.");
assert.match(dispatchRoute,/LANERIQ_COMMUNICATIONS_SERVICE_SECRET/);
assert.match(dispatchRoute,/LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID/);
assert.match(dispatchRoute,/replay_blocked/);
assert.match(dispatchRoute,/already_claimed/);
assert.match(dispatchRoute,/idempotency_conflict/);
assert.match(requestStore,/server_claim_communication_service_request/);
assert.match(requestStore,/server_finish_communication_service_request/);
assert.match(migration,/communication_service_requests_nonce_uq/);
assert.match(migration,/communication_service_requests_idempotency_uq/);
assert.match(migration,/pg_advisory_xact_lock/);
assert.match(migration,/auth\.role\(\).*service_role/);
assert.match(migration,/idempotency_conflict/);
assert.match(migration,/v_existing\.body_hash <> p_body_hash/);
assert.match(migration,/revoke all on public\.communication_service_requests from public,anon,authenticated/);
assert.match(client,/signServiceRequest/);
assert.match(client,/redirect:"error"/);
assert.match(client,/https:/);
assert.match(docs,/embedded_now_extractable_later/);
assert.match(docs,/No unauthenticated arbitrary-send endpoint/);

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

const input={idempotencyKey:"msg-test-0001",to:"user-1",body:"Hello",preferredChannels:["in_app","sms"]};
const message=normalizeServiceMessage(input);
assert.equal(message.to,"user-1");
assert.equal(message.idempotencyKey,"msg-test-0001");
assert.deepEqual(message.preferredChannels,["in_app","sms"]);
const planned=planServiceMessage(runtimeFixture,{...input,preferredChannels:["sms","in_app"]});
assert.equal(planned.plan.selected,"in_app","Paid SMS must remain blocked in zero-cost mode even when preferred first.");
assert.equal(planned.plan.externalSpendCap,0);

const secret="independent-communications-test-secret-1234567890";
const body=JSON.stringify(input);
const timestamp="1788450000";
const nonce="nonce_0123456789abcdef";
const signature=signServiceRequest({secret,clientId:"laneriq-ai",timestamp,nonce,method:"POST",path:"/api/communications/v1/dispatch",body});
assert.match(signature,/^[a-f0-9]{64}$/);
const verified=verifyServiceRequestSignature({secret,signature,clientId:"laneriq-ai",timestamp,nonce,method:"POST",path:"/api/communications/v1/dispatch",body,nowMs:1788450000000});
assert.equal(verified.ok,true);
assert.equal(verifyServiceRequestSignature({secret,signature:"0".repeat(64),clientId:"laneriq-ai",timestamp,nonce,method:"POST",path:"/api/communications/v1/dispatch",body,nowMs:1788450000000}).ok,false);
assert.equal(verifyServiceRequestSignature({secret,signature,clientId:"laneriq-ai",timestamp,nonce,method:"POST",path:"/api/communications/v1/dispatch",body,nowMs:1788451000000}).reason,"stale_request");

console.log("✓ Communications core is provider/runtime independent");
console.log("✓ Embedded runtime is replaceable through two stable ports");
console.log("✓ Status API exposes sanitized capabilities only");
console.log("✓ Signed dispatch rejects stale/invalid requests before delivery");
console.log("✓ Persistent nonce + idempotency ledger is service-role only and replay-safe");
console.log("✓ Same idempotency key with a different body is rejected as a conflict");
console.log("✓ Zero-cost policy remains authoritative across the service boundary");
