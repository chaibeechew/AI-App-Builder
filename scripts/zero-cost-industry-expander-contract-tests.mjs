import assert from 'node:assert/strict';
import { buildDeterministicGenerationSamplePlan } from '../lib/ai/release-quality-intelligence.js';
import { expandZeroCostIndustrySpecification, ZERO_COST_INDUSTRY_EXPANDER_POLICY } from '../lib/ai/zero-cost-industry-expander.js';

const plan=buildDeterministicGenerationSamplePlan();
assert.equal(plan.sampleSize,50);
assert.equal(plan.industryCoverage,50);
const detected=[];
for(const item of plan.cases){
  const expanded=expandZeroCostIndustrySpecification({name:'Local Foundation',pages:[{name:'Home',route:'/',description:'Overview'}],features:[],actions:[],navigation:[{label:'Home',route:'/'}]},item.prompt);
  assert.equal(expanded.zeroCostIndustryIntelligence.matched,true,`Zero-cost industry intelligence missed ${item.industry}`);
  assert.equal(expanded.industry.name,item.industry,`Zero-cost industry mismatch for ${item.industry}: ${expanded.industry?.name||'none'}`);
  assert.ok(expanded.pages.length>=4,`${item.industry} local expansion needs industry-specific pages`);
  assert.ok(expanded.features.length>=3,`${item.industry} local expansion needs industry-specific features`);
  for(const dimension of ['stability','security','privacy','comfort','beauty','naturalness'])assert.ok(expanded.qualityPlan[dimension].length>=3,`${item.industry} ${dimension} quality evidence missing`);
  assert.equal(expanded.zeroCostIndustryIntelligence.directCopyAllowed,false);
  detected.push(expanded.industry.name);
}
assert.equal(new Set(detected).size,50,'Local expansion must preserve 50 distinct industry identities.');
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.catalogIndustries,50);
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.paidProviderRequired,false);
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.paidEmbeddingRequired,false);
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.vectorDatabaseRequired,false);
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.dedicatedServerRequired,false);
console.log(`✓ Zero-cost local industry intelligence covered ${new Set(detected).size}/50 benchmark industries with industry pages, workflows and quality plans`);
