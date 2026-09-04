const freeze=value=>Object.freeze(value);
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{2,127}$/;
const FORBIDDEN_REF=/^(?:https?:|data:|blob:|file:)/i;
const PROFILE_TYPES=new Set(['identity','product','brand','scene']);

function clean(value){return String(value??'').trim();}
function stable(value){
  if(Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function fnv1a(value){
  let hash=0x811c9dc5;
  for(const ch of String(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,0x01000193)>>>0;}
  return hash.toString(16).padStart(8,'0');
}

export function normalizeContinuityAssetIds(values=[]){
  if(!Array.isArray(values)) throw new Error('CONTINUITY_ASSET_IDS_INVALID');
  const out=[];
  for(const raw of values){
    const id=clean(raw);
    if(!id) continue;
    if(FORBIDDEN_REF.test(id)||!SAFE_ID.test(id)) throw new Error('CONTINUITY_OWNER_SCOPED_ASSET_REQUIRED');
    if(!out.includes(id)) out.push(id);
  }
  if(out.length>16) throw new Error('CONTINUITY_REFERENCE_LIMIT_EXCEEDED');
  return freeze(out);
}

export function buildContinuityProfile({
  type,
  profileId,
  referenceAssetIds=[],
  likenessConsent=false,
  declaredTraits={},
  biometricEmbedding,
  ownerScoped=true,
}={}){
  const kind=clean(type).toLowerCase();
  if(!PROFILE_TYPES.has(kind)) throw new Error('CONTINUITY_PROFILE_TYPE_UNSUPPORTED');
  const id=clean(profileId);
  if(!SAFE_ID.test(id)||FORBIDDEN_REF.test(id)) throw new Error('CONTINUITY_PROFILE_ID_INVALID');
  if(ownerScoped!==true) throw new Error('CONTINUITY_OWNER_SCOPE_REQUIRED');
  if(biometricEmbedding!==undefined&&biometricEmbedding!==null) throw new Error('CONTINUITY_BIOMETRIC_EMBEDDING_FORBIDDEN');
  if(kind==='identity'&&likenessConsent!==true) throw new Error('CONTINUITY_LIKENESS_CONSENT_REQUIRED');
  const refs=normalizeContinuityAssetIds(referenceAssetIds);
  if((kind==='identity'||kind==='product')&&refs.length===0) throw new Error('CONTINUITY_REFERENCE_REQUIRED');
  const traits=declaredTraits&&typeof declaredTraits==='object'?declaredTraits:{};
  const core={type:kind,profileId:id,referenceAssetIds:refs,declaredTraits:traits};
  return freeze({
    ...core,
    profileVersionId:`cv_${fnv1a(stable(core))}`,
    ownerScoped:true,
    likenessConsent:kind==='identity',
    storesBiometricEmbedding:false,
    performsBiometricIdentification:false,
    providerVerified:false,
    realOutputContinuityVerified:false,
  });
}
