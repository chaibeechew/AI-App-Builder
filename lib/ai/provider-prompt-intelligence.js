import { randomUUID } from 'node:crypto';
import { buildIndustryIntelligenceContext } from '../industryIntelligence.js';
import { buildAdaptiveTrendingReferenceContext } from '../trendLearningEngine.js';
import { buildGenerationVariantKey, isOpaqueGenerationVariantKey } from '../generationDiversity.js';
import { buildTemplateIntelligenceInstruction } from './template-intelligence-fusion.js';

const USER_IDEA_BLOCK=/USER IDEA:\s*\n"([\s\S]*?)"\s*\n\n(?:GENERATION VARIANT KEY:\s*\n"[^"\n]*"\s*\n\n)?VOICE INPUT:/;
const VARIANT_BLOCK=/GENERATION VARIANT KEY:\s*\n"([^"\n]{1,64})"/;
const REPAIR_MARKER='SOOLEN AUTONOMOUS REPAIR + SELF-HEAL MODE';
const ACTIVE_VARIANTS=new Map();
const MAX_ACTIVE_VARIANTS=256;

function baseIdea(value){
  const text=String(value||'');
  const index=text.indexOf(REPAIR_MARKER);
  return String(index>=0?text.slice(0,index):text).trim().slice(0,8000);
}
function variantCacheKey(idea){return buildGenerationVariantKey(`cache:${baseIdea(idea)}`);}
function rememberVariant(key,variant){
  ACTIVE_VARIANTS.set(key,variant);
  while(ACTIVE_VARIANTS.size>MAX_ACTIVE_VARIANTS){
    const oldest=ACTIVE_VARIANTS.keys().next().value;
    if(!oldest)break;
    ACTIVE_VARIANTS.delete(oldest);
  }
}

export function extractGenerationIdea(prompt){
  const value=String(prompt||'');
  const match=value.match(USER_IDEA_BLOCK);
  return String(match?.[1]||'').trim().slice(0,8000);
}

export function extractGenerationVariantKey(prompt){
  const value=String(prompt||'');
  const candidate=String(value.match(VARIANT_BLOCK)?.[1]||'').trim();
  return isOpaqueGenerationVariantKey(candidate)?candidate:'';
}

export function resolveGenerationVariantKey(prompt,idea=extractGenerationIdea(prompt)){
  const explicit=extractGenerationVariantKey(prompt);
  if(explicit)return explicit;
  const normalizedIdea=String(idea||'').trim();
  if(!normalizedIdea)return buildGenerationVariantKey('empty-generation');
  const key=variantCacheKey(normalizedIdea);
  const repairing=normalizedIdea.includes(REPAIR_MARKER);
  if(repairing&&ACTIVE_VARIANTS.has(key))return ACTIVE_VARIANTS.get(key);
  const variant=repairing
    ?buildGenerationVariantKey(`repair-fallback:${baseIdea(normalizedIdea)}`)
    :buildGenerationVariantKey(`fresh:${randomUUID()}:${Date.now()}`);
  rememberVariant(key,variant);
  return variant;
}

export function enrichGenerationPrompt(prompt){
  const value=String(prompt||'').trim();
  if(!value||!value.includes('USER IDEA:')||!value.includes('INDUSTRY PATTERNS:'))return value;
  const idea=extractGenerationIdea(value);
  if(!idea)return value;
  const variantKey=resolveGenerationVariantKey(value,idea);
  const intelligence=buildIndustryIntelligenceContext(idea,{variantKey});
  if(!intelligence)return value;
  const templateFusion=buildTemplateIntelligenceInstruction(idea,{variantKey});
  const trendLearning=buildAdaptiveTrendingReferenceContext(idea);
  const augmented=[intelligence,templateFusion,trendLearning].filter(Boolean).join('\n\n');
  const anchor='\n\nINDUSTRY PATTERNS:\n';
  if(!value.includes(anchor))return `${value}\n\n${augmented}`;
  return value.replace(anchor,`\n\n${augmented}${anchor}`);
}