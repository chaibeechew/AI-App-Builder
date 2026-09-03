import assert from "node:assert/strict";
import fs from "node:fs";
import { communicationGatewayStatus, dispatchLaneriqCommunication } from "../lib/communications/service-gateway.js";

const source=fs.readFileSync("lib/communications/service-gateway.js","utf8");
assert.match(source,/communicationServiceClientStatus/);
assert.match(source,/dispatchRemoteCommunication/);
assert.match(source,/createEmbeddedCommunicationRuntime/);
assert.match(source,/automaticFallbackAfterRemoteAttempt:false/);
assert.doesNotMatch(source,/catch\s*\([^)]*\)[\s\S]*dispatchServiceMessage/,"Remote failures must never automatically fall back to embedded delivery.");

const embeddedEnv={};
const embeddedStatus=communicationGatewayStatus(embeddedEnv);
assert.equal(embeddedStatus.mode,"embedded");
assert.equal(embeddedStatus.remoteReady,false);
assert.equal(embeddedStatus.automaticFallbackAfterRemoteAttempt,false);

const remoteEnv={
  LANERIQ_COMMUNICATIONS_SERVICE_URL:"https://communications.example.test",
  LANERIQ_COMMUNICATIONS_SERVICE_SECRET:"gateway-test-secret-12345678901234567890",
  LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID:"laneriq-ai",
};
const remoteStatus=communicationGatewayStatus(remoteEnv);
assert.equal(remoteStatus.mode,"remote");
assert.equal(remoteStatus.remoteReady,true);

let calls=0;
const response=await dispatchLaneriqCommunication({idempotencyKey:"gateway-test-0001",to:"user-1",body:"Hello",preferredChannels:["in_app"]},{
  env:remoteEnv,
  fetchImpl:async(url,options)=>{
    calls+=1;
    assert.equal(String(url),"https://communications.example.test/api/communications/v1/dispatch");
    assert.equal(options.method,"POST");
    assert.match(options.headers["x-laneriq-signature"],/^[a-f0-9]{64}$/);
    return {ok:true,status:200,json:async()=>({ok:true,result:{status:"completed"}})};
  }
});
assert.equal(calls,1);
assert.equal(response.gatewayMode,"remote");
assert.equal(response.ok,true);

let failedCalls=0;
await assert.rejects(()=>dispatchLaneriqCommunication({idempotencyKey:"gateway-test-0002",to:"user-1",body:"Hello",preferredChannels:["in_app"]},{
  env:remoteEnv,
  fetchImpl:async()=>{failedCalls+=1;throw new Error("uncertain remote outcome");}
}),/uncertain remote outcome/);
assert.equal(failedCalls,1,"Remote uncertainty must not trigger a second embedded send.");

console.log("✓ Gateway stays embedded until standalone URL + secret are configured");
console.log("✓ Remote mode uses the signed service client exactly once");
console.log("✓ Uncertain remote failures never fall back and double-send");
