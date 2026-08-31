// Provider-neutral multiplayer transport contract.
// This models production state and evidence requirements without pretending a relay/server is connected.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
export const LIVE_MULTIPLAYER_TRANSPORT_V1=Object.freeze({
  version:"live-multiplayer-transport-v1",
  adapterConnected:false,
  liveServiceVerified:false,
  states:["idle","searching","match_found","connecting","connected","reconnecting","resyncing","disconnected","failed"],
  requiredAdapterMethods:["connect","send","subscribe","close"],
  qualitySignals:["latencyMs","jitterMs","packetLossPct","heartbeatAgeMs","snapshotAgeMs"]
});

export function createLiveTransportState({region="auto",mode="matchmaking"}={}){return{
  version:LIVE_MULTIPLAYER_TRANSPORT_V1.version,status:"idle",region,mode,queueStartedAt:null,matchId:null,sessionId:null,reconnectToken:null,lastHeartbeatAt:null,lastSnapshotAt:null,attempts:0,
  quality:{latencyMs:null,jitterMs:null,packetLossPct:null,heartbeatAgeMs:null,snapshotAgeMs:null,grade:"unverified"},
  evidence:{adapterConnected:false,realRelay:false,matchmaking:false,reconnect:false,resync:false,realDeviceNetwork:false},reason:"No live transport adapter has been verified."
};}

export function beginMatchmaking(state,now=0){if(!["idle","disconnected","failed"].includes(state.status))return state;return{...state,status:"searching",queueStartedAt:Number(now)||0,matchId:null,sessionId:null,reason:"Searching for a compatible session."};}
export function applyMatchFound(state,{matchId,region=state.region,reconnectToken=null}={}){if(state.status!=="searching"||!matchId)return{...state,status:"failed",reason:"Invalid matchmaking result."};return{...state,status:"match_found",matchId:String(matchId),region,reconnectToken,reason:"Match found; transport connection still requires a real adapter."};}
export function beginTransportConnect(state){if(!["match_found","reconnecting"].includes(state.status))return state;return{...state,status:"connecting",attempts:state.attempts+1,reason:"Connecting through provider-neutral transport adapter."};}
export function markTransportConnected(state,{sessionId,now=0,realRelay=false}={}){if(state.status!=="connecting"||!sessionId)return{...state,status:"failed",reason:"Transport connection lacked a verified session id."};return{...state,status:"connected",sessionId:String(sessionId),lastHeartbeatAt:Number(now)||0,lastSnapshotAt:Number(now)||0,evidence:{...state.evidence,adapterConnected:true,realRelay:realRelay===true,matchmaking:Boolean(state.matchId)},reason:realRelay?"Live relay session connected.":"Adapter session connected in non-production evidence mode."};}
export function observeTransportQuality(state,{latencyMs,jitterMs,packetLossPct,now=0,lastSnapshotAt=state.lastSnapshotAt}={}){const latency=clamp(latencyMs,0,5000),jitter=clamp(jitterMs,0,2000),loss=clamp(packetLossPct,0,100),heartbeatAge=Math.max(0,(Number(now)||0)-(Number(state.lastHeartbeatAt)||0)),snapshotAge=Math.max(0,(Number(now)||0)-(Number(lastSnapshotAt)||0));const grade=loss>10||latency>400||heartbeatAge>5000?"poor":loss>4||latency>220||jitter>80?"degraded":"good";return{...state,lastSnapshotAt:Number(lastSnapshotAt)||state.lastSnapshotAt,quality:{latencyMs:latency,jitterMs:jitter,packetLossPct:loss,heartbeatAgeMs:heartbeatAge,snapshotAgeMs:snapshotAge,grade}};}
export function heartbeatTransport(state,now=0){if(state.status!=="connected")return state;return{...state,lastHeartbeatAt:Number(now)||0};}
export function disconnectTransport(state,{reason="network_lost",recoverable=true}={}){if(!recoverable)return{...state,status:"failed",reason};return{...state,status:"reconnecting",sessionId:null,reason,reconnectToken:state.reconnectToken||`resume:${state.matchId||"unknown"}`};}
export function beginResync(state){if(state.status!=="connected")return state;return{...state,status:"resyncing",reason:"Applying authoritative snapshot before local input resumes."};}
export function completeResync(state,{now=0}={}){if(state.status!=="resyncing")return state;return{...state,status:"connected",lastSnapshotAt:Number(now)||0,evidence:{...state.evidence,reconnect:true,resync:true},reason:"Authoritative resync complete."};}

export function evaluateLiveTransportReadiness(evidence={}){const checks={
  adapter:evidence.adapter===true,realRelay:evidence.realRelay===true,matchmaking:evidence.matchmaking===true,reconnect:evidence.reconnect===true,resync:evidence.resync===true,loadTest:evidence.loadTest===true,lossLatencyTest:evidence.lossLatencyTest===true,realDevices:evidence.realDevices===true,regionalFailover:evidence.regionalFailover===true
};const weights={adapter:10,realRelay:15,matchmaking:10,reconnect:10,resync:10,loadTest:15,lossLatencyTest:10,realDevices:10,regionalFailover:10};const score=Object.entries(checks).reduce((sum,[k,v])=>sum+(v?weights[k]:0),0);return{score,passed:score===100,checks,missing:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),productionReady:score===100,truthRule:"Do not call Online Multiplayer production-ready until a real transport/relay, matchmaking, reconnect/resync, load/network tests and real-device evidence all pass."};}
