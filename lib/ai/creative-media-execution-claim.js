const freeze=value=>Object.freeze(value);

export function claimCreativeMediaExecution({sessionId,workerId,nowMs,leaseMs=30000,currentClaim=null}={}){
  const session=String(sessionId||'').trim();
  const worker=String(workerId||'').trim();
  const now=Number(nowMs);
  const lease=Math.max(5000,Math.min(120000,Math.trunc(Number(leaseMs)||30000)));
  if(!session||!worker||!Number.isFinite(now)) throw new Error('MEDIA_EXECUTION_CLAIM_INPUT_INVALID');
  if(currentClaim){
    const active=Number(currentClaim.expiresAtMs)>now;
    if(active&&currentClaim.workerId!==worker) return freeze({ok:false,code:'MEDIA_EXECUTION_ALREADY_CLAIMED',claim:currentClaim});
    if(active&&currentClaim.workerId===worker) return freeze({ok:true,replay:true,code:null,claim:currentClaim});
  }
  return freeze({ok:true,replay:false,code:null,claim:freeze({sessionId:session,workerId:worker,claimedAtMs:now,expiresAtMs:now+lease,leaseMs:lease})});
}

export function canReclaimCreativeMediaExecution({claim,nowMs}={}){
  const now=Number(nowMs);
  return freeze({ok:Boolean(claim)&&Number.isFinite(now)&&Number(claim.expiresAtMs)<=now,code:Number(claim?.expiresAtMs)<=now?'MEDIA_EXECUTION_LEASE_EXPIRED':null});
}
