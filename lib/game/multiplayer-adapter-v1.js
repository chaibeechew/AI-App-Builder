// Provider-neutral adapter boundary for live multiplayer integration.
// Passing this contract does not mean a real provider is connected.

function text(v){return String(v??"").trim();}
function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}

export const MULTIPLAYER_ADAPTER_V1=Object.freeze({
  version:"multiplayer-adapter-v1",
  requiredTransportMethods:["connect","send","subscribe","close"],
  requiredMatchmakingMethods:["createTicket","pollTicket","cancelTicket"],
  providerConnected:false,
  liveEvidenceVerified:false
});

export function validateMultiplayerAdapter(adapter={}){
  const missingTransport=MULTIPLAYER_ADAPTER_V1.requiredTransportMethods.filter(name=>typeof adapter?.transport?.[name]!=="function");
  const missingMatchmaking=MULTIPLAYER_ADAPTER_V1.requiredMatchmakingMethods.filter(name=>typeof adapter?.matchmaking?.[name]!=="function");
  const capabilities={
    regions:Array.isArray(adapter?.capabilities?.regions)?adapter.capabilities.regions.map(text).filter(Boolean).slice(0,32):[],
    reconnect:adapter?.capabilities?.reconnect===true,
    orderedReliable:adapter?.capabilities?.orderedReliable===true,
    unorderedUnreliable:adapter?.capabilities?.unorderedUnreliable===true,
    authTokens:adapter?.capabilities?.authTokens===true
  };
  const valid=missingTransport.length===0&&missingMatchmaking.length===0;
  return{valid,missingTransport,missingMatchmaking,capabilities,productionReady:false,truthRule:"Adapter shape validation proves integration compatibility only. Production multiplayer still requires a verified live provider, auth, load tests, failover and real-device network evidence."};
}

export function createMatchmakingTicket({playerId,mode="default",partyId=null,skill=0,region="auto",metadata={}}={}){
  return{id:null,playerId:text(playerId).slice(0,64),partyId:partyId?text(partyId).slice(0,64):null,mode:text(mode).slice(0,48)||"default",skill:clamp(skill,0,100000),region:text(region).slice(0,32)||"auto",metadata:safeMetadata(metadata),status:"draft",createdAt:0,updatedAt:0,match:null,attempts:0};
}
export function markTicketQueued(ticket,{ticketId,now=0}={}){if(!ticket||!ticketId)return{...ticket,status:"failed"};return{...ticket,id:text(ticketId),status:"searching",createdAt:Number(now)||0,updatedAt:Number(now)||0,attempts:(ticket.attempts||0)+1};}
export function applyTicketPoll(ticket,result={},now=0){if(!ticket||ticket.status!=="searching")return ticket;const status=text(result.status).toLowerCase();if(status==="matched"&&result.matchId)return{...ticket,status:"matched",updatedAt:Number(now)||0,match:{matchId:text(result.matchId),region:text(result.region||ticket.region),endpointHint:result.endpointHint?text(result.endpointHint):null,reconnectToken:result.reconnectToken?text(result.reconnectToken):null}};if(["cancelled","failed","expired"].includes(status))return{...ticket,status,updatedAt:Number(now)||0};return{...ticket,status:"searching",updatedAt:Number(now)||0};}
export function cancelMatchmakingTicket(ticket,now=0){if(!ticket||["matched","cancelled","failed","expired"].includes(ticket.status))return ticket;return{...ticket,status:"cancelled",updatedAt:Number(now)||0};}

export function evaluateAdapterEvidence(evidence={}){
  const checks={shapeValidated:evidence.shapeValidated===true,providerConnected:evidence.providerConnected===true,authVerified:evidence.authVerified===true,matchmakingVerified:evidence.matchmakingVerified===true,reconnectVerified:evidence.reconnectVerified===true,loadTestVerified:evidence.loadTestVerified===true,failoverVerified:evidence.failoverVerified===true,realDevicesVerified:evidence.realDevicesVerified===true};
  const score=Math.round(Object.values(checks).filter(Boolean).length/Object.keys(checks).length*100);
  return{score,checks,missing:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),productionReady:score===100,truthRule:"Do not claim a multiplayer provider is production-ready until every adapter evidence check passes."};
}

function safeMetadata(value){if(!value||typeof value!=="object"||Array.isArray(value))return{};const out={};for(const [k,v] of Object.entries(value).slice(0,20)){const key=text(k).slice(0,48);if(typeof v==="string")out[key]=v.slice(0,200);else if(typeof v==="number"&&Number.isFinite(v))out[key]=v;else if(typeof v==="boolean")out[key]=v;}return out;}
