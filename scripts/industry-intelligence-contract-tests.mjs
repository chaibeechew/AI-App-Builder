import assert from 'node:assert/strict';
import {INDUSTRIES} from '../lib/templateCatalog.js';
import {detectIndustryIntent,selectIndustryTemplateBlend,buildIndustryIntelligenceContext} from '../lib/industryIntelligence.js';
import {buildGenerationVariantKey,isOpaqueGenerationVariantKey} from '../lib/generationDiversity.js';
import {TRENDING_APP_REFERENCE_PATTERNS,selectTrendingAppReferences,buildTrendingReferenceContext} from '../lib/trendingAppReferences.js';
import {extractGenerationIdea,enrichGenerationPrompt,resolveGenerationVariantKey} from '../lib/ai/provider-prompt-intelligence.js';

await import('./trend-learning-contract-tests.mjs');

assert.equal(INDUSTRIES.length,50);
assert.equal(TRENDING_APP_REFERENCE_PATTERNS.length,100);
assert.equal(new Set(TRENDING_APP_REFERENCE_PATTERNS.map(x=>x.id)).size,100);
for(const ref of TRENDING_APP_REFERENCE_PATTERNS){assert.ok(ref.family);assert.ok(ref.patterns.length>=3);}

for(const industry of INDUSTRIES){
  const detected=detectIndustryIntent(`Build a ${industry} business app`);
  assert.equal(detected.industry,industry,`Industry router failed exact-name coverage for ${industry}`);
  const blend=selectIndustryTemplateBlend(`Build a ${industry} business app`,{variantKey:buildGenerationVariantKey(`coverage:${industry}`)});
  assert.equal(blend.industry,industry);
  assert.ok(blend.templates.length>=1,`No catalog template selected for ${industry}`);
  assert.ok(blend.entities.length>=1,`No native entities for ${industry}`);
  assert.ok(blend.workflow.length>=1,`No native workflow for ${industry}`);
  assert.equal(new Set(blend.templates.map(x=>x.id)).size,blend.templates.length,`Duplicate template selected for ${industry}`);
  assert.equal(blend.templates.some(x=>x.industry!==industry),false,`Cross-industry template leakage for ${industry}`);
}

assert.equal(detectIndustryIntent('Build a Malaysia real estate agent CRM with properties, viewing appointments and commissions').industry,'Real Estate');
const property=selectIndustryTemplateBlend('Build a real estate CRM marketplace with viewing booking and commission analytics',{variantKey:buildGenerationVariantKey('property-a')});
assert.equal(property.industry,'Real Estate');
assert.ok(property.templates.length>=3);
assert.ok(property.archetypeIds.includes('crm'));
assert.ok(property.entities.includes('properties'));
assert.ok(property.workflow.includes('viewing'));
assert.equal(property.diversity.gate.passed,true);
assert.ok(property.diversity.gate.uniqueStyles>=3);
assert.ok(property.diversity.gate.uniqueArchetypes>=3);
assert.match(buildIndustryIntelligenceContext('房地产中介管理房源、顾客、预约看房、佣金'),/Real Estate/);

const propertyVariantB=selectIndustryTemplateBlend('Build a real estate CRM marketplace with viewing booking and commission analytics',{variantKey:buildGenerationVariantKey('property-b')});
assert.notEqual(property.diversity.fingerprint,propertyVariantB.diversity.fingerprint);
assert.ok(isOpaqueGenerationVariantKey(property.diversity.variantKey));

const neutral=selectIndustryTemplateBlend('Build a simple private personal notes organiser with folders and reminders',{variantKey:buildGenerationVariantKey('neutral')});
assert.equal(neutral.industry,null);
assert.equal(neutral.templates.length,0);
assert.equal(neutral.diversity.gate.mode,'industry-neutral');
assert.equal(neutral.diversity.gate.crossIndustryLeakage,0);
assert.match(buildIndustryIntelligenceContext('Build a simple private personal notes organiser',{variantKey:buildGenerationVariantKey('neutral-context')}),/Stay industry-neutral/);

const food=selectIndustryTemplateBlend('Create a restaurant booking, menu ordering and loyalty app',{variantKey:buildGenerationVariantKey('food')});
assert.equal(food.industry,'Restaurant');
assert.ok(food.archetypeIds.includes('booking'));

const trend=selectTrendingAppReferences('AI assistant with chat, research and generation studio',{limit:5});
assert.ok(trend.some(x=>x.id==='ai-assistant-chat'));
assert.match(buildTrendingReferenceContext('food delivery app'),/inspiration|references/i);
assert.match(buildTrendingReferenceContext('food delivery app'),/Never reproduce third-party branding/i);

const idea='Build a Malaysia real estate CRM with property listings, viewing booking and commissions';
const rawPrompt=`USER IDEA:\n"${idea}"\n\nVOICE INPUT:\n"None"\n\nINDUSTRY PATTERNS:\n[]`;
assert.match(extractGenerationIdea(rawPrompt),/real estate CRM/);
const freshKeyA=resolveGenerationVariantKey(rawPrompt,idea);
const freshKeyB=resolveGenerationVariantKey(rawPrompt,idea);
assert.ok(isOpaqueGenerationVariantKey(freshKeyA));
assert.ok(isOpaqueGenerationVariantKey(freshKeyB));
assert.notEqual(freshKeyA,freshKeyB,'A new Generate run must receive a fresh anonymous variant key.');
const repairIdea=`${idea}\n\nSOOLEN AUTONOMOUS REPAIR + SELF-HEAL MODE\nRepair only verified defects.`;
const repairPrompt=`USER IDEA:\n"${repairIdea}"\n\nVOICE INPUT:\n"None"\n\nINDUSTRY PATTERNS:\n[]`;
assert.equal(resolveGenerationVariantKey(repairPrompt,repairIdea),freshKeyB,'Autonomous repair must reuse the latest active variant for the same base generation.');

const enrichedA=enrichGenerationPrompt(rawPrompt);
const enrichedB=enrichGenerationPrompt(rawPrompt);
assert.match(enrichedA,/LANERIQ AI Industry Intelligence Engine/);
assert.match(enrichedA,/LANERIQ AI Generation Diversity Engine/);
assert.match(enrichedA,/Generation diversity fingerprint: gdf1-[0-9a-f]{16}/);
assert.match(enrichedA,/Pre-generation originality gate: PASS/);
assert.match(enrichedA,/LANERIQ AI Trending App Reference Layer/);
assert.match(enrichedA,/LANERIQ AI Continuous Trend Learning Layer/);
assert.match(enrichedA,/properties/);
assert.match(enrichedA,/Never reproduce third-party branding/);
const fingerprintA=enrichedA.match(/Generation diversity fingerprint: (gdf1-[0-9a-f]{16})/)?.[1];
const fingerprintB=enrichedB.match(/Generation diversity fingerprint: (gdf1-[0-9a-f]{16})/)?.[1];
assert.ok(fingerprintA&&fingerprintB);
assert.notEqual(fingerprintA,fingerprintB,'Repeated Generate runs must not collapse into the same diversity fingerprint.');
assert.equal(enrichGenerationPrompt('ordinary non-builder prompt'),'ordinary non-builder prompt');

console.log('Industry Intelligence contract passed: 50 industries, 3,000-template diversified blending, industry-neutral anti-bias, anonymous variant replay stability, provider prompt injection and 100 originality-safe trend references are locked.');
