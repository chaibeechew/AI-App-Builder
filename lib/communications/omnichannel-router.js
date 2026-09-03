import { OMNICHANNELS, normalizeCommunicationChannel } from "./channel-contract.js";
import { ZERO_COST_COMMUNICATION_POLICY, zeroCostEligibility } from "./zero-cost-policy.js";

function uniqueChannels(values=[]){
  const seen=new Set();
  const channels=[];
  for(const value of values){
    const channel=normalizeCommunicationChannel(value);
    if(seen.has(channel))continue;
    seen.add(channel);
    channels.push(channel);
  }
  return channels;
}

function orderedChannels(preferredChannels=[]){
  const preferred=uniqueChannels(preferredChannels);
  const remainder=ZERO_COST_COMMUNICATION_POLICY.channelPriority.filter(channel=>!preferred.includes(channel));
  return [...preferred,...remainder].filter(channel=>OMNICHANNELS.includes(channel));
}

export function planZeroCostCommunication({adapters={},preferredChannels=[],allowCustomerBilledProvider=false}={}){
  const routes=[];
  const blocked=[];
  for(const channel of orderedChannels(preferredChannels)){
    const adapter=adapters[channel]||{channel,contractReady:false,runtimeReady:false,costClass:"unknown"};
    const decision=zeroCostEligibility(adapter,{allowCustomerBilledProvider});
    const item={channel,...decision};
    if(decision.allowed)routes.push(item);else blocked.push(item);
  }
  return {
    mode:ZERO_COST_COMMUNICATION_POLICY.mode,
    externalSpendCap:ZERO_COST_COMMUNICATION_POLICY.externalSpendCap,
    failClosed:ZERO_COST_COMMUNICATION_POLICY.failClosed,
    selected:routes[0]?.channel||null,
    routes,
    blocked,
  };
}

function safeAttemptError(error){
  const code=String(error?.code||"").trim().toLowerCase();
  return code&&/^[a-z0-9_:-]{1,80}$/.test(code)?code:"delivery_failed";
}

export async function deliverZeroCostCommunication({
  adapters={},
  senders={},
  preferredChannels=[],
  payload,
  allowCustomerBilledProvider=false,
}={}){
  const plan=planZeroCostCommunication({adapters,preferredChannels,allowCustomerBilledProvider});
  const attempts=[];
  for(const route of plan.routes){
    const send=senders[route.channel];
    if(typeof send!=="function"){
      attempts.push({channel:route.channel,status:"integration_required",reason:"sender_not_implemented"});
      continue;
    }
    try{
      const result=await send(payload);
      const status=String(result?.status||"").toLowerCase();
      attempts.push({channel:route.channel,status:status||"failed"});
      if(status==="completed"||status==="sent"||status==="delivered"){
        return {
          status:"completed",
          channel:route.channel,
          externalSpend:0,
          attempts,
          plan,
        };
      }
    }catch(error){
      attempts.push({channel:route.channel,status:"failed",errorCode:safeAttemptError(error)});
    }
  }
  return {
    status:"zero_cost_route_unavailable",
    channel:null,
    externalSpend:0,
    attempts,
    plan,
  };
}
