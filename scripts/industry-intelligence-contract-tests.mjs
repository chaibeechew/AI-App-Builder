import assert from 'node:assert/strict';
import {detectIndustryIntent,selectIndustryTemplateBlend,buildIndustryIntelligenceContext} from '../lib/industryIntelligence.js';
import {TRENDING_APP_REFERENCE_PATTERNS,selectTrendingAppReferences,buildTrendingReferenceContext} from '../lib/trendingAppReferences.js';
import {extractGenerationIdea,enrichGenerationPrompt} from '../lib/ai/provider-prompt-intelligence.js';

assert.equal(TRENDING_APP_REFERENCE_PATTERNS.length,100);
assert.equal(new Set(TRENDING_APP_REFERENCE_PATTERNS.map(x=>x.id)).size,100);
for(const ref of TRENDING_APP_REFERENCE_PATTERNS){assert.ok(ref.family);assert.ok(ref.patterns.length>=3);}

assert.equal(detectIndustryIntent('Build a Malaysia real estate agent CRM with properties, viewing appointments and commissions').industry,'Real Estate');
const property=selectIndustryTemplateBlend('Build a luxury real estate CRM marketplace with viewing booking and commission analytics');
assert.equal(property.industry,'Real Estate');
assert.ok(property.templates.length>=3);
assert.ok(property.archetypeIds.includes('crm'));
assert.ok(property.entities.includes('properties'));
assert.ok(property.workflow.includes('viewing'));
assert.match(buildIndustryIntelligenceContext('房地产中介管理房源、顾客、预约看房、佣金'),'Real Estate');

const food=selectIndustryTemplateBlend('Create a restaurant booking, menu ordering and loyalty app');
assert.equal(food.industry,'Restaurant');
assert.ok(food.archetypeIds.includes('booking'));

const trend=selectTrendingAppReferences('AI assistant with chat, research and generation studio',{limit:5});
assert.ok(trend.some(x=>x.id==='ai-assistant-chat'));
assert.match(buildTrendingReferenceContext('food delivery app'),/inspiration|references/i);
assert.match(buildTrendingReferenceContext('food delivery app'),/Never reproduce third-party branding/i);

const rawPrompt='USER IDEA:\n"Build a Malaysia real estate CRM with property listings, viewing booking and commissions"\n\nVOICE INPUT:\n"None"\n\nINDUSTRY PATTERNS:\n[]';
assert.match(extractGenerationIdea(rawPrompt),/real estate CRM/);
const enriched=enrichGenerationPrompt(rawPrompt);
assert.match(enriched,/LANERIQ AI Industry Intelligence Engine/);
assert.match(enriched,/LANERIQ AI Trending App Reference Layer/);
assert.match(enriched,/properties/);
assert.match(enriched,/Never reproduce third-party branding/);
assert.equal(enrichGenerationPrompt('ordinary non-builder prompt'),'ordinary non-builder prompt');

console.log('Industry Intelligence contract passed: auto industry routing, multi-template blending, provider prompt injection and 100 originality-safe trending references are locked.');
