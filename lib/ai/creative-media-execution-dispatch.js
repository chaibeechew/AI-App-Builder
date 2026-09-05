const freeze=value=>Object.freeze(value);

export function authorizeCreativeMediaProviderDispatch({
  session,
  claim,
  referenceManifest,
  ownerScopeValidated=false,
  provider={},
}={}){
  if(!session?.sessionId||!claim?.sessionId) throw new Error('MEDIA_EXECUTION_SESSION_CLAIM_REQUIRED');
  if(claim.sessionId!==session.sessionId) return freeze({ok:false,code:'MEDIA_EXECUTION_CLAIM_MISMATCH'});
  if(session.dispatchAuthorized!==true) return freeze({ok:false,code:'MEDIA_EXECUTION_DISPATCH_NOT_AUTHORIZED'});
  if(ownerScopeValidated!==true) return freeze({ok:false,code:'MEDIA_EXECUTION_OWNER_SCOPE_NOT_VERIFIED'});
  if((session.inputAssetIds||[]).length&&referenceManifest?.allReferencesSecurityValidated!==true) return freeze({ok:false,code:'MEDIA_EXECUTION_INPUT_SECURITY_NOT_VERIFIED'});
  if(provider.connected!==true) return freeze({ok:false,code:'MEDIA_EXECUTION_PROVIDER_NOT_CONNECTED'});
  if(provider.available!==true) return freeze({ok:false,code:'MEDIA_EXECUTION_PROVIDER_UNAVAILABLE'});
  if(provider.safetyReady!==true) return freeze({ok:false,code:'MEDIA_EXECUTION_PROVIDER_SAFETY_NOT_READY'});
  const capabilities=Array.isArray(provider.capabilities)?provider.capabilities:[];
  if(!capabilities.includes(session.taskId)) return freeze({ok:false,code:'MEDIA_EXECUTION_PROVIDER_CAPABILITY_MISSING'});
  const costClass=String(provider.costClass||'free').toLowerCase();
  const freeQuota=Number(provider.freeQuotaRemaining)||0;
  const paid=costClass==='metered'||costClass==='premium';
  if((session.costMode==='zero'||session.costMode==='free')&&paid&&freeQuota<=0) return freeze({ok:false,code:'MEDIA_EXECUTION_COST_POLICY_BLOCK'});
  if(costClass==='premium'&&session.premiumAllowed!==true&&freeQuota<=0) return freeze({ok:false,code:'MEDIA_EXECUTION_PREMIUM_PERMISSION_REQUIRED'});
  return freeze({
    ok:true,
    code:null,
    providerId:String(provider.id||provider.name||'provider').trim(),
    providerRequestAllowed:true,
    liveProviderVerified:false,
    productionVerified:false,
  });
}
