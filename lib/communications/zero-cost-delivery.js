import { omnichannelAdapterStatus, implementedOmnichannelSenders } from "./omnichannel-adapters.js";
import { deliverZeroCostCommunication, planZeroCostCommunication } from "./omnichannel-router.js";
import { ZERO_COST_COMMUNICATION_POLICY } from "./zero-cost-policy.js";

export function zeroCostCommunicationStatus({preferredChannels=[]}={}){
  const adapters=omnichannelAdapterStatus();
  const plan=planZeroCostCommunication({adapters,preferredChannels});
  return {
    service:"LANERIQ OmniChannel Communication Router",
    mode:ZERO_COST_COMMUNICATION_POLICY.mode,
    externalSpendCap:ZERO_COST_COMMUNICATION_POLICY.externalSpendCap,
    failClosed:true,
    selected:plan.selected,
    routes:plan.routes,
    blocked:plan.blocked,
    adapters,
    evidenceLevel:"CODE",
    liveVerified:false,
  };
}

export async function deliverWithZeroExternalSpend({preferredChannels=[],payload,allowCustomerBilledProvider=false}={}){
  return deliverZeroCostCommunication({
    adapters:omnichannelAdapterStatus(),
    senders:implementedOmnichannelSenders(),
    preferredChannels,
    payload,
    allowCustomerBilledProvider,
  });
}
