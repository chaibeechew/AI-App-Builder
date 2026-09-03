import assert from 'node:assert/strict';
import { LIUI_STANDARD_NAME, LIUI_VERSION, LIUI_SCORE_REQUIRED, LIUI_SCORE_DIMENSIONS, LIUI_RISK_LEVELS, LIUI_DESIGN_BRAIN_STEPS, LIUI_ANTI_PATTERNS, LIUI_AI_INSTRUCTION, applyLivingIntelligenceStandard, assessLiuiQuality } from '../lib/ai/liui-standard.js';
import { normalizeAppSpec } from '../lib/generator/runtime-guard.js';
import { evaluateReleaseReadiness, RELEASE_DIMENSIONS_REQUIRED } from '../lib/release-readiness.js';

assert.equal(LIUI_STANDARD_NAME,'LANERIQ AI Living Intelligence UI™');
assert.equal(LIUI_VERSION,'2.0');
assert.equal(LIUI_SCORE_REQUIRED,95);
assert.equal(LIUI_SCORE_DIMENSIONS.reduce((sum,item)=>sum+item.weight,0),100,'LIUI dimension weights must total 100.');
assert.deepEqual(LIUI_SCORE_DIMENSIONS.map(item=>item.weight),[15,15,10,10,10,10,10,5,5,5,5]);
assert.equal(LIUI_RISK_LEVELS[3].execution,'confirmation_required');
assert.equal(LIUI_RISK_LEVELS[4].execution,'strong_confirmation_required');
assert.equal(LIUI_DESIGN_BRAIN_STEPS.length,16);
assert.ok(LIUI_ANTI_PATTERNS.includes('beautiful_homepage_weak_inner_pages'));
assert.ok(LIUI_ANTI_PATTERNS.includes('unconfirmed_high_risk_execution'));

const qualityPlan={
  stability:['Loading, empty and error states include retry and recovery','Offline and timeout states preserve queued work and clear sync status','Failed AI, upload, payment and deployment states explain what happened and what to do next'],
  security:['Least privilege permissions with server validation','Risk-level confirmation for external or sensitive actions','No secrets in generated client data'],
  privacy:['Private-by-default data','Purpose-limited personal data','Delete/export and permission controls where relevant'],
  comfort:['Phone uses thumb-first responsive controls and safe-area spacing','Tablet and desktop use distinct adaptive layouts instead of scaled copies','Accessible readable 44px touch targets and clear navigation'],
  beauty:['Premium original visual hierarchy with restrained glass','Coordinated brand palette, typography, cards and imagery','Inner pages share the same quality floor as the homepage'],
  naturalness:['Intent-first next actions reduce menu hunting','Human context-aware workflow language','Predictive suggestions prepare work without silently executing external actions'],
};
const normalized=normalizeAppSpec({
  name:'LIUI Real Estate Workspace',
  description:'Intent-first real estate workspace that adapts around client meetings, property workflows and follow-up actions.',
  industry:{name:'Real Estate',category:'Property CRM',confidence:0.99},
  designSystem:{mood:'premium trustworthy',visualDirection:'premium warm property imagery with strong hierarchy',backgroundDirection:'content-first layered surface',heroDirection:'property and client context hero',layoutSignature:'adaptive phone tablet desktop workspace',fontDirection:'readable responsive type scale',iconStyle:'clear line icons',themeMode:'auto',colorPreference:'premium warm trustworthy',paletteRationale:'accessible customer-brand palette',cardStyle:'living cards with restrained depth',imageStyle:'original property and people imagery',wallpaperPreset:'moon-city',motionDirection:'semantic motion only'},
  qualityPlan,
  pages:[
    {id:'home',name:'Home',route:'/',purpose:'Show the most important current task',description:'Upcoming meeting, client context, property, route, documents and suggested next action.',components:['intent summary','living cards','suggested action'],layout:'phone bottom navigation; tablet split view; desktop multi-panel',visualTreatment:'premium accessible hierarchy',backgroundTreatment:'content-first restrained glass'},
    {id:'leads',name:'Leads',route:'/leads',purpose:'Manage leads',components:['filters','lead cards'],layout:'adaptive list/grid',visualTreatment:'living status cards'},
    {id:'properties',name:'Properties',route:'/properties',purpose:'Manage properties',components:['map','property cards'],layout:'adaptive map/list split',visualTreatment:'brand-consistent media cards'},
    {id:'calendar',name:'Calendar',route:'/calendar',purpose:'Manage appointments',components:['calendar','agenda'],layout:'adaptive agenda',visualTreatment:'clear time hierarchy'},
    {id:'settings',name:'Settings',route:'/settings',purpose:'Control preferences and Personal UI Memory',components:['preferences','memory controls'],layout:'focused settings sections',visualTreatment:'same product quality floor'},
  ],
  features:[
    {name:'AI Command Layer',description:'Natural language searches and actions across leads and properties',uiPattern:'command bar with preview and confirmation'},
    {name:'Predictive Follow-up',description:'Suggest or prepare next actions after viewings',uiPattern:'suggested action card'},
    {name:'Personal UI Memory',description:'View, modify, disable or reset learned layout preferences',uiPattern:'transparent preference controls'},
    {name:'Offline workspace',description:'Queue edits and show sync status',uiPattern:'network-aware status'},
    {name:'Voice workflow',description:'Speak, understand, preview, confirm high-risk actions, execute',uiPattern:'live transcription and action preview'},
  ],
  data:{Lead:{fields:['id','name','status']},Property:{fields:['id','title','status']}},
  actions:[{name:'Open client meeting',route:'/'},{name:'Open leads',route:'/leads'},{name:'Open properties',route:'/properties'}],
  navigation:[{label:'Home',route:'/'},{label:'Leads',route:'/leads'},{label:'Properties',route:'/properties'},{label:'Calendar',route:'/calendar'},{label:'Settings',route:'/settings'}]
});

assert.equal(normalized.designSystem.designStandard,LIUI_STANDARD_NAME);
assert.equal(normalized.liui.version,'2.0');
assert.equal(normalized.liui.intentModel.intentFirst,true);
assert.equal(normalized.liui.adaptiveLayout.enabled,true);
assert.equal(normalized.liui.livingCards.enabled,true);
assert.equal(normalized.liui.voiceNative.highRiskFlow.includes('confirm'),true);
assert.equal(normalized.liui.performanceAdaptive.mode,'balanced');
assert.equal(normalized.liui.zeroDeadEnd.enabled,true);
assert.equal(normalized.liui.personalUiMemory.userControl.includes('reset'),true);
assert.equal(normalized.liui.homepageParity.enabled,true);

const score=assessLiuiQuality(normalized);
assert.ok(score.score>=95,`Rich LIUI specification should reach Premium gate, got ${score.score}.`);
assert.equal(score.passed,true);
assert.equal(score.releaseBand,'LANERIQ_PREMIUM');
assert.equal(score.evidenceLevel,'design_spec');
assert.equal(score.productionProof,false,'Design-spec scoring must never claim Production proof.');
assert.equal(score.dimensions.length,11);

const releaseReport={overall:100,dimensions:RELEASE_DIMENSIONS_REQUIRED.map(id=>({id,score:100})),liui:{score:94,releaseBand:'AUTO_OPTIMIZE'}};
assert.equal(evaluateReleaseReadiness(releaseReport).releaseReady,false,'LIUI 94 must block deterministic release readiness.');
releaseReport.liui.score=95;releaseReport.liui.releaseBand='LANERIQ_PREMIUM';
assert.equal(evaluateReleaseReadiness(releaseReport).releaseReady,true,'LIUI 95 plus the existing 100 gate should pass design-spec release readiness.');

for(const phrase of ['Software adapts to human','Intent → AI understands → UI adapts → Action appears','Smooth > Fancy','Invisible intelligence. Visible consequences.','HOMEPAGE ≠ PRODUCT QUALITY','DESIGN SPEC, CODE, EMULATION, BROWSER VERIFIED, DEVICE VERIFIED, PROVIDER READY, LIVE and PRODUCTION'])assert.ok(LIUI_AI_INSTRUCTION.includes(phrase),`Missing LIUI master instruction: ${phrase}`);

const applied=applyLivingIntelligenceStandard({name:'Minimal'});
assert.equal(applied.liui.trustPermission.riskLevels[4].execution,'strong_confirmation_required');
assert.equal(applied.liui.networkAdaptive.offline.includes('queued_actions'),true);
assert.equal(applied.liui.accessibilityIntelligence.systemPreferenceAware,true);

console.log('✓ LIUI v2.0 is the default normalized design standard');
console.log('✓ All 11 LIUI score dimensions and exact 100-point weighting are enforced');
console.log('✓ 95–100 LIUI Premium gate is separate from the existing six-dimension 100 gate');
console.log('✓ Intent-first, adaptive layout, living cards, voice, AI command, predictive actions, UI memory, performance/network adaptation, accessibility and risk controls are encoded');
console.log('✓ LIUI design-spec evidence never impersonates browser, device, provider, Live or Production evidence');