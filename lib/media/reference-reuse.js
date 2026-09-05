const HEX64=/^[0-9a-f]{64}$/;

function safeString(value,max=240){return String(value||"").trim().slice(0,max);}
function safeList(value,maxItems=12,maxLength=80){return Array.isArray(value)?value.slice(0,maxItems).map(item=>safeString(item,maxLength)).filter(Boolean):[];}

export function normalizeReferenceFingerprint(value){
  const fingerprint=String(value||"").trim().toLowerCase();
  return HEX64.test(fingerprint)?fingerprint:"";
}

export function hasReusableReferenceIntelligence(value){
  const intelligence=value?.intelligence&&typeof value.intelligence==="object"?value.intelligence:value;
  if(!intelligence||typeof intelligence!=="object")return false;
  return Boolean(
    safeString(intelligence.description,600)||
    safeString(intelligence.subject,240)||
    safeString(intelligence.label,120)||
    safeString(intelligence.role,40)||
    safeList(intelligence.tags).length||
    safeList(intelligence.suggestedSections,8).length
  );
}

export function referenceIntelligenceFromAsset(asset){
  const source=asset?.intelligence&&typeof asset.intelligence==="object"?asset.intelligence:{};
  return {
    sourceName:safeString(asset?.file_name||source.sourceName||source.subject||"Customer reference",180),
    role:safeString(source.role||"content",40)||"content",
    label:safeString(source.label,120),
    subject:safeString(source.subject||asset?.file_name,240),
    description:safeString(source.description,600),
    tags:safeList(source.tags,12,60),
    suggestedSections:safeList(source.suggestedSections,8,80),
    confidence:Math.max(0,Math.min(1,Number(source.confidence)||0)),
  };
}

export function buildReferenceReusePlan(items=[],existingAssets=[]){
  const existingByFingerprint=new Map();
  for(const asset of Array.isArray(existingAssets)?existingAssets:[]){
    const fingerprint=normalizeReferenceFingerprint(asset?.content_fingerprint);
    if(fingerprint&&!existingByFingerprint.has(fingerprint))existingByFingerprint.set(fingerprint,asset);
  }

  const seen=new Set();
  const reusedAssets=[];
  const analysisItems=[];
  let duplicateSelectionCount=0;

  for(const item of Array.isArray(items)?items:[]){
    const fingerprint=normalizeReferenceFingerprint(item?.fingerprint);
    if(!fingerprint)continue;
    if(seen.has(fingerprint)){duplicateSelectionCount+=1;continue;}
    seen.add(fingerprint);
    const existingAsset=existingByFingerprint.get(fingerprint)||null;
    if(existingAsset&&hasReusableReferenceIntelligence(existingAsset)){
      reusedAssets.push(existingAsset);
      continue;
    }
    analysisItems.push({...item,fingerprint,existingAsset});
  }

  return {
    uniqueFingerprints:[...seen],
    reusedAssets,
    analysisItems,
    duplicateSelectionCount,
    reuseCount:reusedAssets.length,
    analysisCount:analysisItems.length,
    allResolvedWithoutAnalysis:analysisItems.length===0&&reusedAssets.length>0,
    privacy:{crossUserReuseAllowed:false,rawPrivateBytesShared:false,scope:"same-user-exact-fingerprint"},
  };
}
