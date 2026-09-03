import { buildIndustryIntelligenceContext } from '../industryIntelligence.js';

const USER_IDEA_BLOCK=/USER IDEA:\s*\n"([\s\S]*?)"\s*\n\nVOICE INPUT:/;

export function extractGenerationIdea(prompt){
  const value=String(prompt||'');
  const match=value.match(USER_IDEA_BLOCK);
  return String(match?.[1]||'').trim().slice(0,8000);
}

export function enrichGenerationPrompt(prompt){
  const value=String(prompt||'').trim();
  if(!value||!value.includes('USER IDEA:')||!value.includes('INDUSTRY PATTERNS:'))return value;
  const idea=extractGenerationIdea(value);
  if(!idea)return value;
  const intelligence=buildIndustryIntelligenceContext(idea);
  if(!intelligence)return value;
  const anchor='\n\nINDUSTRY PATTERNS:\n';
  if(!value.includes(anchor))return `${value}\n\n${intelligence}`;
  return value.replace(anchor,`\n\n${intelligence}${anchor}`);
}
