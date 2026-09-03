import { implementedOmnichannelSenders, omnichannelAdapterStatus } from "./omnichannel-adapters.js";
import { createCommunicationServiceRuntime } from "./service-core.js";

export function createEmbeddedCommunicationRuntime(){
  return createCommunicationServiceRuntime({
    adapterStatus:()=>omnichannelAdapterStatus(),
    senders:()=>implementedOmnichannelSenders(),
  });
}

export const COMMUNICATION_RUNTIME_PORT=Object.freeze({
  adapterStatus:"function(): ChannelStatusMap",
  senders:"function(): ChannelSenderMap",
});
