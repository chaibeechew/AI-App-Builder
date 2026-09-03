export const COMMUNICATIONS_CUTOVER_POLICY=Object.freeze({version:'ccr1',firstLiveChannel:'in_app',externalSpendRequired:0,requiredEvidence:['httpsProduction','signedCanary','replayBlocked','idempotencyConflictBlocked','cleanRuntimeLogs']});

export function evaluateCommunicationsCutover(evidence={}){
  const checks={httpsProduction:evidence.httpsProduction===true,signedCanary:evidence.signedCanary===true,replayBlocked:evidence.replayBlocked===true,idempotencyConflictBlocked:evidence.idempotencyConflictBlocked===true,cleanRuntimeLogs:evidence.cleanRuntimeLogs===true,inAppOnly:evidence.channel==='in_app',zeroExternalSpend:Number(evidence.externalSpend)===0};
  const missing=Object.entries(checks).filter(([,ok])=>!ok).map(([key])=>key);
  const liveReady=missing.length===0;
  return {version:COMMUNICATIONS_CUTOVER_POLICY.version,liveReady,state:liveReady?'LIVE_STANDALONE_ELIGIBLE':'DEPLOY_READY_ONLY',checks,missing,rollback:liveReady?'remote_to_embedded_requires_explicit_operator_cutover':'stay_embedded',note:'Eligibility is not a claim that the standalone service is currently LIVE; exact Production evidence must be supplied from the real second Project.'};
}
