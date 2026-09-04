const freeze=value=>Object.freeze(value);

export function buildContinuityShotPlan({profiles=[],shots=[]}={}){
  const profileMap=new Map((profiles||[]).map(p=>[p.profileId,p]));
  if(profileMap.size===0) throw new Error('CONTINUITY_PROFILES_REQUIRED');
  if(!Array.isArray(shots)||shots.length===0) throw new Error('CONTINUITY_SHOTS_REQUIRED');
  const normalized=shots.map((shot,index)=>{
    const shotId=String(shot?.shotId||`shot-${index+1}`).trim();
    const profileIds=Array.isArray(shot?.profileIds)?[...new Set(shot.profileIds.map(v=>String(v).trim()).filter(Boolean))]:[];
    if(profileIds.length===0) throw new Error('CONTINUITY_SHOT_PROFILE_REQUIRED');
    for(const id of profileIds) if(!profileMap.has(id)) throw new Error(`CONTINUITY_PROFILE_UNKNOWN:${id}`);
    const allowedChanges=Array.isArray(shot?.allowedChanges)?[...new Set(shot.allowedChanges.map(String))]:[];
    return freeze({
      shotId,
      profileIds:freeze(profileIds),
      allowedChanges:freeze(allowedChanges),
      continuityEvidenceRequired:true,
      qualityEvidenceRequired:true,
      autoAccept:false,
    });
  });
  return freeze({
    shots:freeze(normalized),
    shotCount:normalized.length,
    crossShotContinuityRequired:normalized.length>1,
    providerContinuityAssumed:false,
  });
}
