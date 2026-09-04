const freeze=value=>Object.freeze(value);

export const CREATIVE_AGENT_RECOVERY_LADDER=freeze([
  'prompt-repair',
  'same-provider-regenerate',
  'provider-fallback',
  'candidate-compare',
  'fail-closed',
]);

export function nextCreativeAgentRecovery({
  attempt=0,
  maxAttempts=3,
  failureCode='QUALITY_GATE_FAILED',
  providerAvailable=true,
  fallbackAvailable=true,
  premiumFallback=false,
  premiumPermission=false,
}={}){
  const n=Math.max(0,Math.trunc(Number(attempt)||0));
  const max=Math.max(1,Math.min(4,Math.trunc(Number(maxAttempts)||3)));
  if(n>=max) return freeze({action:'fail-closed',retry:false,reason:'ATTEMPT_BUDGET_EXHAUSTED'});
  if(String(failureCode).includes('SAFETY')||String(failureCode).includes('POLICY')) return freeze({action:'fail-closed',retry:false,reason:'SAFETY_OR_POLICY_BLOCK'});
  if(n===0) return freeze({action:'prompt-repair',retry:true,nextAttempt:1});
  if(n===1&&providerAvailable) return freeze({action:'same-provider-regenerate',retry:true,nextAttempt:2});
  if(fallbackAvailable){
    if(premiumFallback&&!premiumPermission) return freeze({action:'candidate-compare',retry:false,reason:'PREMIUM_PERMISSION_REQUIRED'});
    return freeze({action:'provider-fallback',retry:true,nextAttempt:n+1});
  }
  return freeze({action:'candidate-compare',retry:false,reason:'NO_FALLBACK_AVAILABLE'});
}
