import assert from 'node:assert/strict';
import { applyRuntimeOutcomeIntelligence, RUNTIME_OUTCOME_SELECTOR_POLICY } from '../lib/ai/runtime-outcome-selector.js';
import { expandZeroCostIndustrySpecification, ZERO_COST_INDUSTRY_EXPANDER_POLICY } from '../lib/ai/zero-cost-industry-expander.js';
import { assessGenerationQuality, GENERATION_QUALITY_JUDGE_POLICY } from '../lib/ai/generation-quality-judge.js';

const raw={
  name:'Cyber Operations',
  description:'A mobile-first cybersecurity CRM and operations workspace.',
  industry:{name:'Cybersecurity'},
  designSystem:{visualDirection:'original secure operations interface',primaryColor:'#153C5A',accentColor:'#77D1C6',backgroundColor:'#07131D',surfaceColor:'#102634',textColor:'#F4FAFC'},
  qualityPlan:{
    stability:['Provider custom stability decision','Provider custom performance decision','Provider custom recovery note'],
    security:['Provider custom security decision','Provider custom access decision','Provider custom validation note'],
    privacy:['Provider custom privacy decision','Provider custom minimization decision','Provider custom consent note'],
    comfort:['Provider custom comfort decision','Provider custom mobile decision','Provider custom usability note'],
    beauty:['Provider custom visual decision','Provider custom imagery decision','Provider custom hierarchy note'],
    naturalness:['Provider custom workflow decision','Provider custom terminology decision','Provider custom follow-up note'],
  },
  pages:[
    {name:'Home',route:'/',purpose:'Prioritise security work',components:['hero','command','timeline','card']},
    {name:'Accounts',route:'/accounts',purpose:'Manage customer accounts',components:['search','filter','list','form']},
    {name:'Cases',route:'/cases',purpose:'Manage security cases',components:['kanban','filter','card','modal']},
    {name:'Calendar',route:'/calendar',purpose:'Schedule follow-ups',components:['calendar','timeline','card']},
    {name:'Insights',route:'/insights',purpose:'Review risk and progress',components:['chart','filter','table']},
  ],
  features:[
    {name:'Case workflow',description:'Track security cases with ownership and status.'},
    {name:'Account CRM',description:'Manage customer relationships and follow-ups.'},
    {name:'Search',description:'Search records and filter results.'},
    {name:'Insights',description:'Review operational trends and exceptions.'},
  ],
  actions:[
    {name:'Create Case',intent:'create'},{name:'Search',intent:'search'},{name:'Review',intent:'approve'},{name:'Share',intent:'share'}
  ],
  navigation:[
    {label:'Home',route:'/'},{label:'Accounts',route:'/accounts'},{label:'Cases',route:'/cases'},{label:'Calendar',route:'/calendar'},{label:'Insights',route:'/insights'}
  ],
  data:{Account:{fields:['name','status','owner_id','updated_at']},Case:{fields:['title','severity','status','account_id','owner_id','updated_at']}},
};

const expanded=expandZeroCostIndustrySpecification(raw,'Create a Cybersecurity CRM app',{variationIndex:2});
const stability=expanded.qualityPlan.stability.join(' ').toLowerCase();
const security=expanded.qualityPlan.security.join(' ').toLowerCase();
const comfort=expanded.qualityPlan.comfort.join(' ').toLowerCase();
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.version,3);
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.requiredQualityEvidenceMerged,true);
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.providerQualityEvidencePreserved,true);
assert.match(stability,/loading/);
assert.match(stability,/empty/);
assert.match(stability,/error/);
assert.match(stability,/retry/);
assert.match(stability,/weak-network/);
assert.match(security,/authentication/);
assert.match(security,/ownership/);
assert.match(security,/server-side validation/);
assert.match(security,/secrets/);
assert.match(security,/rate limits/);
assert.match(comfort,/mobile-first/);
assert.match(comfort,/screen-reader/);
assert.match(comfort,/reduced-motion/);
assert.ok(expanded.qualityPlan.stability.includes('Provider custom stability decision'));
assert.ok(expanded.qualityPlan.security.includes('Provider custom security decision'));
assert.ok(expanded.qualityPlan.comfort.includes('Provider custom comfort decision'));
assert.ok(Object.values(expanded.qualityPlan).every(items=>items.length<=6));

const selected=applyRuntimeOutcomeIntelligence({aiProvider:'soolen-local',specification:raw},'Create a Cybersecurity CRM app',{requestedCandidates:3,costMode:'free'});
const meta=selected.intelligence.qualityCandidates;
assert.equal(RUNTIME_OUTCOME_SELECTOR_POLICY.version,2);
assert.equal(RUNTIME_OUTCOME_SELECTOR_POLICY.mandatoryRuntimeGuardBeforeJudging,true);
assert.equal(RUNTIME_OUTCOME_SELECTOR_POLICY.selectedHardBlockersObservable,true);
assert.equal(meta.normalizationMode,'runtime-guard-before-quality-judge');
assert.equal(meta.paidShadowCalls,0);
assert.equal(meta.candidateCount,3);
assert.ok(meta.uniqueCandidateCount>=2);
assert.ok(Array.isArray(meta.selectedHardBlockers));
assert.ok(!meta.selectedHardBlockers.includes('security_gate_failed'),'Runtime Guard must satisfy the existing MAX security gate rather than disabling it.');
assert.ok(selected.specification.security&&typeof selected.specification.security==='object','Selected specification must carry the normalized MAX security manifest.');

const judged=assessGenerationQuality(selected.specification);
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.workflowCoherenceGate,true);
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.resilienceAccessibilityGate,true);
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.replanScore,85);
assert.ok(!judged.hardBlockers.includes('security_gate_failed'));
assert.ok(!judged.hardBlockers.includes('resilience_accessibility_low'));

console.log('✓ Runtime Guard now runs before Quality Judge without weakening the existing MAX security gate');
console.log('✓ Zero-cost industry variants merge mandatory recovery/accessibility/security evidence while preserving provider decisions');
console.log('✓ Selected hard-blocker IDs are observable without storing raw prompts or specifications');
console.log('✓ Replan/accept thresholds remain unchanged; Batch 37 reduces false replans by satisfying the gate, not lowering it');
