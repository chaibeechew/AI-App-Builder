const freeze=value=>Object.freeze(value);
const SHA256=/^[a-f0-9]{64}$/i;

function score(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;
}

export function evaluateContinuityEvidence({
  profileId,
  artifactHash,
  provenanceId,
  metrics={},
  requiredDimensions=[],
  threshold=88,
}={}){
  const hash=String(artifactHash||'').trim();
  const provenance=String(provenanceId||'').trim();
  if(!SHA256.test(hash)||!provenance) return freeze({ok:false,truth:'EVIDENCE_REQUIRED',code:'CONTINUITY_PROVENANCE_REQUIRED'});
  const source=metrics&&typeof metrics==='object'?metrics:{};
  const missing=[];
  const normalized={};
  for(const dimension of requiredDimensions||[]){
    const n=score(source[dimension]);
    if(n===null) missing.push(dimension);
    else normalized[dimension]=n;
  }
  if(missing.length) return freeze({ok:false,truth:'EVIDENCE_REQUIRED',code:'CONTINUITY_METRIC_REQUIRED',missing:freeze(missing)});
  const values=Object.values(normalized);
  const minScore=values.length?Math.min(...values):null;
  const accepted=minScore!==null&&minScore>=Number(threshold||88);
  return freeze({
    ok:accepted,
    truth:'MEASURED_EVIDENCE',
    code:accepted?null:'CONTINUITY_THRESHOLD_NOT_MET',
    profileId:String(profileId||'').trim()||null,
    minScore,
    metrics:freeze(normalized),
    providerVerified:false,
    realOutputContinuityVerified:accepted,
  });
}
