import { CONTINUITY_DIMENSIONS } from './creative-continuity-constraints.js';
const freeze=value=>Object.freeze(value);

export function detectContinuityConflicts({profiles=[],locks={},requestedChanges=[]}={}){
  const profileMap=new Map((profiles||[]).map(p=>[p.profileId,p]));
  const conflicts=[];
  for(const change of requestedChanges||[]){
    const profileId=String(change?.profileId||'').trim();
    const dimension=String(change?.dimension||'').trim();
    const profile=profileMap.get(profileId);
    if(!profile){conflicts.push({profileId,dimension,code:'CONTINUITY_PROFILE_UNKNOWN'});continue;}
    const allowed=CONTINUITY_DIMENSIONS[profile.type]||[];
    if(!allowed.includes(dimension)){conflicts.push({profileId,dimension,code:'CONTINUITY_DIMENSION_UNSUPPORTED'});continue;}
    const lockLevel=locks[`${profileId}:${dimension}`]||'free';
    if(lockLevel==='hard') conflicts.push({profileId,dimension,code:'CONTINUITY_HARD_LOCK_CONFLICT',lockLevel,requestedChange:String(change?.value||'')});
  }
  return freeze({
    ok:conflicts.length===0,
    conflicts:freeze(conflicts),
    requiresHumanReview:conflicts.length>0,
    automaticOverride:false,
  });
}
