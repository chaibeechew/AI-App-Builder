// LANERIQ AI Generation Diversity Engine.
// Produces deterministic, privacy-safe variation from an opaque request-derived key.
// The raw request id must never be included in provider prompts.

const HERO_AXES=['immersive-canvas','split-story','editorial-led','data-first','command-centre'];
const NAV_AXES=['floating-command','adaptive-bottom','context-rail','minimal-top','hybrid-workspace'];
const COMPOSITION_AXES=['adaptive-bento','narrative-stack','workspace-grid','spatial-cards','focus-flow'];
const MOTION_AXES=['semantic-morph','staged-reveal','subtle-depth','kinetic-panels','context-shift'];

function normalize(value,max=8000){return String(value||'').trim().slice(0,max)}
function hash32(value){
  let hash=2166136261;
  const text=normalize(value,16000);
  for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}
function hex(value){return (value>>>0).toString(16).padStart(8,'0')}
function unit(seed){return hash32(seed)/0xffffffff}
function pick(list,seed){return list[hash32(seed)%list.length]}

export function buildGenerationVariantKey(seed){
  const raw=normalize(seed,512)||'stable-default';
  return `gv1-${hex(hash32(`laneriq-a:${raw}`))}${hex(hash32(`laneriq-b:${raw}`))}`;
}

export function isOpaqueGenerationVariantKey(value){return /^gv1-[0-9a-f]{16}$/.test(String(value||''));}

export function buildDiversityFingerprint({industry='',variantKey='',templateIds=[]}={}){
  const safeVariant=isOpaqueGenerationVariantKey(variantKey)?variantKey:buildGenerationVariantKey(variantKey||industry||'neutral');
  const payload=[industry||'industry-neutral',safeVariant,...templateIds].join('|');
  return `gdf1-${hex(hash32(`fingerprint-a:${payload}`))}${hex(hash32(`fingerprint-b:${payload}`))}`;
}

export function buildLayoutVariationAxes({fingerprint,variantKey}={}){
  const key=normalize(fingerprint||variantKey,128)||buildGenerationVariantKey('layout-default');
  return Object.freeze({
    hero:pick(HERO_AXES,`${key}:hero`),
    navigation:pick(NAV_AXES,`${key}:nav`),
    composition:pick(COMPOSITION_AXES,`${key}:composition`),
    motion:pick(MOTION_AXES,`${key}:motion`),
  });
}

export function selectDiverseTemplateSet({catalog=[],industry=null,archetypeIds=[],styleId=null,variantKey='',limit=6}={}){
  const safeLimit=Math.max(1,Math.min(Number(limit)||6,8));
  const safeVariant=isOpaqueGenerationVariantKey(variantKey)?variantKey:buildGenerationVariantKey(variantKey||industry||'neutral');
  const archetypes=[...new Set((archetypeIds||[]).filter(Boolean))].slice(0,8);

  // Critical anti-bias rule: if the industry is unknown, never borrow the first
  // concrete industry from catalog ordering. Stay domain-neutral instead.
  if(!industry){
    const fingerprint=buildDiversityFingerprint({industry:'industry-neutral',variantKey:safeVariant,templateIds:[]});
    return Object.freeze({
      templates:Object.freeze([]),
      variantKey:safeVariant,
      fingerprint,
      axes:buildLayoutVariationAxes({fingerprint}),
      gate:Object.freeze({passed:true,mode:'industry-neutral',duplicateTemplateIds:0,crossIndustryLeakage:0,uniqueArchetypes:0,uniqueStyles:0,reasons:Object.freeze([])}),
    });
  }

  let candidates=(catalog||[]).filter(template=>template?.industry===industry);
  if(archetypes.length)candidates=candidates.filter(template=>archetypes.includes(template?.archetypeId));
  if(styleId)candidates=candidates.filter(template=>template?.styleId===styleId);

  const selected=[];
  const archetypeCounts=new Map();
  const styleCounts=new Map();
  while(selected.length<safeLimit&&selected.length<candidates.length){
    let best=null,bestScore=-Infinity;
    for(const template of candidates){
      if(selected.some(item=>item.id===template.id))continue;
      const archetypeRank=archetypes.indexOf(template.archetypeId);
      const archetypeCount=archetypeCounts.get(template.archetypeId)||0;
      const styleCount=styleCounts.get(template.styleId)||0;
      const priority=archetypeRank>=0?Math.max(0,18-archetypeRank*2.4):2;
      const novelty=(archetypeCount===0?8:-archetypeCount*3)+(styleId?0:(styleCount===0?5:-styleCount*1.75));
      const quality=(Number(template.score)||0)/100;
      const jitter=unit(`${safeVariant}:${selected.length}:${template.id}`)*7;
      const score=priority+novelty+quality+jitter;
      if(score>bestScore||(score===bestScore&&String(template.id).localeCompare(String(best?.id||''))<0)){best=template;bestScore=score;}
    }
    if(!best)break;
    selected.push(best);
    archetypeCounts.set(best.archetypeId,(archetypeCounts.get(best.archetypeId)||0)+1);
    styleCounts.set(best.styleId,(styleCounts.get(best.styleId)||0)+1);
  }

  const ids=selected.map(item=>item.id);
  const duplicateTemplateIds=ids.length-new Set(ids).size;
  const crossIndustryLeakage=selected.filter(item=>item.industry!==industry).length;
  const uniqueArchetypes=new Set(selected.map(item=>item.archetypeId)).size;
  const uniqueStyles=new Set(selected.map(item=>item.styleId)).size;
  const expectedArchetypes=Math.min(3,Math.max(1,archetypes.length||uniqueArchetypes),selected.length||1);
  const expectedStyles=styleId?Math.min(1,selected.length):Math.min(3,selected.length);
  const reasons=[];
  if(duplicateTemplateIds)reasons.push('duplicate-template-id');
  if(crossIndustryLeakage)reasons.push('cross-industry-leakage');
  if(selected.length&&uniqueArchetypes<expectedArchetypes)reasons.push('insufficient-archetype-diversity');
  if(selected.length&&uniqueStyles<expectedStyles)reasons.push('insufficient-style-diversity');
  const fingerprint=buildDiversityFingerprint({industry,variantKey:safeVariant,templateIds:ids});

  return Object.freeze({
    templates:Object.freeze(selected),
    variantKey:safeVariant,
    fingerprint,
    axes:buildLayoutVariationAxes({fingerprint}),
    gate:Object.freeze({
      passed:reasons.length===0,
      mode:styleId?'customer-style-constrained':'diversified',
      duplicateTemplateIds,
      crossIndustryLeakage,
      uniqueArchetypes,
      uniqueStyles,
      reasons:Object.freeze(reasons),
    }),
  });
}
