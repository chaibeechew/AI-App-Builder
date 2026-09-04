const freeze=value=>Object.freeze(value);

export const CONTINUITY_DIMENSIONS=freeze({
  identity:freeze(['identity','face','hair','wardrobe','body-silhouette']),
  product:freeze(['shape','packaging','logo','material','colorway']),
  brand:freeze(['logo','palette','typography','visual-language','tone']),
  scene:freeze(['environment','layout','lighting','camera-language','time-of-day']),
});

export function buildContinuityLocks({profiles=[],overrides={}}={}){
  if(!Array.isArray(profiles)||profiles.length===0) throw new Error('CONTINUITY_PROFILES_REQUIRED');
  const locks={};
  for(const profile of profiles){
    const dims=CONTINUITY_DIMENSIONS[profile.type]||[];
    for(const dimension of dims){
      const key=`${profile.profileId}:${dimension}`;
      const requested=overrides[key];
      locks[key]=requested==='soft'||requested==='free'?requested:'hard';
    }
  }
  return freeze(locks);
}

export function evaluateContinuityChangeRequest({locks={},profileId,dimension,requestedChange}={}){
  const key=`${String(profileId||'').trim()}:${String(dimension||'').trim()}`;
  const level=locks[key]||'free';
  const change=String(requestedChange||'').trim();
  if(!change) return freeze({ok:false,code:'CONTINUITY_CHANGE_REQUIRED',lockLevel:level});
  if(level==='hard') return freeze({ok:false,code:'CONTINUITY_HARD_LOCK_CONFLICT',lockLevel:level,requiresHumanReview:true});
  return freeze({ok:true,code:null,lockLevel:level,requiresHumanReview:level==='soft'});
}
