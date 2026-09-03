import { buildIndustryIntelligenceContext } from '../industryIntelligence.js';
import { buildAdaptiveTrendingReferenceContext } from '../trendLearningEngine.js';
import { isOpaqueGenerationVariantKey } from '../generationDiversity.js';

const USER_IDEA_BLOCK=/USER IDEA:\s*\n"([\s\S]*?)"\s*\n\n(?:GENERATION VARIANT KEY:\s*\n"[^"\n]*"\s*\n\n)?VOICE INPUT:/;
const VARIANT_BLOCK=/GENERATION VARIANT KEY:\s*\n"([^"\n]{1,64})"/;

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

export function enrichGenerationPrompt(prompt){
  const value=String(prompt||'').trim();
  if(!value||!value.includes('USER IDEA:')||!value.includes('INDUSTRY PATTERNS:'))return value;
  const idea=extractGenerationIdea(value);
  if(!idea)return value;
  const variantKey=extractGenerationVariantKey(value);
  const intelligence=buildIndustryIntelligenceContext(idea,{variantKey});
  if(!intelligence)return value;
  const trendLearning=buildAdaptiveTrendingReferenceContext(idea);
  const augmented=[intelligence,trendLearning].filter(Boolean).join('\n\n');
  const anchor='\n\nINDUSTRY PATTERNS:\n';
  if(!value.includes(anchor))return `${value}\n\n${augmented}`;
  return value.replace(anchor,`\n\n${augmented}${anchor}`);
}
