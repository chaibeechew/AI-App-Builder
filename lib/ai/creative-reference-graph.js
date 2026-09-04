const MAX_REFERENCES=24;
const ROLES=new Set(['identity','product','brand','style','pose','composition','depth','segmentation','mask','background','lighting','motion','object','general']);
const SUBJECT_KINDS=new Set(['human','product','brand','environment','object','general']);

function clean(value,max=300){return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);}
function opaque(value){const id=String(value ?? '').trim();return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(id)&&!/^https?:\/\//i.test(id)&&!/^data:/i.test(id);}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

export function buildCreativeReferenceGraph(input={}){
  const source=Array.isArray(input.references)?input.references:[];
  if(!source.length) return {ok:false,code:'CREATIVE_REFERENCE_REQUIRED'};
  if(source.length>MAX_REFERENCES) return {ok:false,code:'CREATIVE_REFERENCE_LIMIT_EXCEEDED'};
  const refs=[];
  const seen=new Set();
  for(let index=0;index<source.length;index+=1){
    const item=source[index]&&typeof source[index]==='object'?source[index]:{};
    if(!opaque(item.assetId)) return {ok:false,code:'CREATIVE_REFERENCE_ASSET_ID_INVALID',index};
    const role=clean(item.role||'general',40).toLowerCase();
    if(!ROLES.has(role)) return {ok:false,code:'CREATIVE_REFERENCE_ROLE_INVALID',index};
    const subjectKind=clean(item.subjectKind||'general',40).toLowerCase();
    if(!SUBJECT_KINDS.has(subjectKind)) return {ok:false,code:'CREATIVE_REFERENCE_SUBJECT_KIND_INVALID',index};
    const key=`${item.assetId}:${role}:${clean(item.target||'global',80)}`;
    if(seen.has(key)) continue;
    seen.add(key);
    if(role==='identity'&&subjectKind==='human'){
      if(item.likenessConsent!==true) return {ok:false,code:'CREATIVE_REFERENCE_LIKENESS_CONSENT_REQUIRED',index};
      if(item.isMinor===true&&item.guardianConsent!==true) return {ok:false,code:'CREATIVE_REFERENCE_GUARDIAN_CONSENT_REQUIRED',index};
    }
    refs.push({
      referenceId:`ref-${String(refs.length+1).padStart(3,'0')}`,
      assetId:String(item.assetId).trim(),
      role,
      subjectKind,
      target:clean(item.target||'global',80),
      weight:clamp(Number.isFinite(Number(item.weight))?Number(item.weight):1,0,2),
      priority:Math.round(clamp(Number.isFinite(Number(item.priority))?Number(item.priority):50,0,100)),
      lock:item.lock===true,
      allowBlend:item.allowBlend!==false,
      notes:clean(item.notes,300)||null,
      consentRequired:role==='identity'&&subjectKind==='human',
    });
  }
  return {
    ok:true,
    schemaVersion:'creative-reference-graph.v1',
    referenceCount:refs.length,
    references:refs,
    roleIndex:Object.fromEntries([...ROLES].map(role=>[role,refs.filter(ref=>ref.role===role).map(ref=>ref.referenceId)])),
    opaqueAssetIdsOnly:true,
    providerNeutral:true,
    truth:'CODE_READY',
  };
}

export function isCreativeReferenceOpaqueAssetId(value){return opaque(value);}
export const CREATIVE_REFERENCE_ROLES=Object.freeze([...ROLES]);
