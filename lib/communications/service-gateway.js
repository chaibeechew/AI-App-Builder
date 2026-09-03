import { createEmbeddedCommunicationRuntime } from "./runtime-port.js";
import { dispatchServiceMessage, normalizeServiceMessage } from "./service-core.js";
import { communicationServiceClientStatus, dispatchRemoteCommunication } from "./service-client.js";

export function communicationGatewayStatus(env=process.env){
  const client=communicationServiceClientStatus(env);
  return {
    mode:client.remoteReady?"remote":"embedded",
    remoteReady:client.remoteReady,
    embeddedAvailable:true,
    automaticFallbackAfterRemoteAttempt:false,
    rationale:client.remoteReady
      ?"Remote communications service is configured; uncertain remote failures never fall back to embedded delivery because that could double-send."
      :"Remote communications service is not configured; use the embedded runtime at zero additional infrastructure cost.",
    evidenceLevel:"CODE",
  };
}

export async function dispatchLaneriqCommunication(input,{env=process.env,fetchImpl=fetch}={}){
  const message=normalizeServiceMessage(input);
  const client=communicationServiceClientStatus(env);
  if(client.remoteReady){
    // Deliberately no catch-and-embedded-fallback here. A timeout can mean the remote
    // service accepted the idempotent request but the response was lost; retrying
    // through another transport could create a second delivery outside that ledger.
    const response=await dispatchRemoteCommunication(message,{env,fetchImpl});
    return {gatewayMode:"remote",...response};
  }
  const runtime=createEmbeddedCommunicationRuntime();
  const result=await dispatchServiceMessage(runtime,message);
  return {gatewayMode:"embedded",ok:["completed","sent","delivered","queued"].includes(result.status),result};
}
