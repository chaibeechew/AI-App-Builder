import { selectIndustryTemplateBlend } from '../industryIntelligence.js';
import { selectTrendingAppReferences } from '../trendingAppReferences.js';

export const TEMPLATE_INTELLIGENCE_FUSION_POLICY=Object.freeze({
  version:'tif1',
  catalogWeight:0.7,
  trendWeight:0.3,
  maxCatalogTemplates:6,
  maxTrendReferences:5,
  inspirationOnly:true,
  exactCloneForbidden:true,
});

export function buildTemplateIntelligenceFusion(input,{variantKey=''}={}){
  const blend=selectIndustryTemplateBlend(input,{limit:TEMPLATE_INTELLIGENCE_FUSION_POLICY.maxCatalogTemplates,variantKey});
  const trends=selectTrendingAppReferences(input,{limit:TEMPLATE_INTELLIGENCE_FUSION_POLICY.maxTrendReferences});
  const catalog=blend.templates.map((template,index)=>({
    type:'laneriq_catalog',
    id:template.id,
    industry:template.industry,
    archetype:template.archetype,
    style:template.style,
    priority:Number((TEMPLATE_INTELLIGENCE_FUSION_POLICY.catalogWeight*(1-index/Math.max(1,blend.templates.length))).toFixed(4)),
  }));
  const references=trends.map((ref,index)=>({
    type:'trend_reference',
    id:ref.id,
    family:ref.family,
    patterns:[...ref.patterns],
    priority:Number((TEMPLATE_INTELLIGENCE_FUSION_POLICY.trendWeight*(1-index/Math.max(1,trends.length))).toFixed(4)),
  }));
  return {
    version:TEMPLATE_INTELLIGENCE_FUSION_POLICY.version,
    detectedIndustry:blend.industry,
    confidence:blend.confidence,
    workflow:[...blend.workflow],
    entities:[...blend.entities],
    catalog,
    references,
    diversityFingerprint:blend.diversity.fingerprint,
    rules:[
      'LANERIQ catalog patterns are the primary structural reference.',
      'Trending references are secondary inspiration only.',
      'Never reproduce third-party branding, copy, assets, source code, distinctive trade dress or exact layouts.',
      'Re-plan information architecture and interaction flow into an original LIUI result.',
    ],
  };
}

export function buildTemplateIntelligenceInstruction(input,options={}){
  const fusion=buildTemplateIntelligenceFusion(input,options);
  const lines=['LANERIQ Template Intelligence Fusion:'];
  if(fusion.detectedIndustry)lines.push(`Industry: ${fusion.detectedIndustry}.`);
  if(fusion.catalog.length)lines.push(`Primary LANERIQ templates: ${fusion.catalog.map(x=>`${x.archetype}/${x.style}`).join(' | ')}.`);
  if(fusion.references.length)lines.push(`Secondary trend patterns: ${fusion.references.map(x=>`${x.family}: ${x.patterns.join(', ')}`).join(' | ')}.`);
  lines.push(...fusion.rules);
  return lines.join('\n');
}
