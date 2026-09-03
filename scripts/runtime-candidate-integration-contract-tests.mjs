import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildGenerationCandidateBudget, evaluateGenerationCandidatePool, GENERATION_CANDIDATE_ORCHESTRATOR_POLICY } from '../lib/ai/generation-candidate-orchestrator.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const budget=buildGenerationCandidateBudget({costMode:'free',requestedCandidates:3});
assert.equal(budget.maxMeteredRemoteCalls,1);
assert.equal(budget.localShadowCandidates,2);
assert.equal(budget.parallelMeteredCalls,false);
assert.equal(budget.stopWhenAccepted,true);
assert.match(GENERATION_CANDIDATE_ORCHESTRATOR_POLICY.activation,/runtime-integrated/);

const mutable={name:'Mutable',pages:[{name:'Home',route:'/',purpose:'Home workflow',components:['hero','search']},{name:'Cases',route:'/cases',purpose:'Cases workflow',components:['list','filter']},{name:'Detail',route:'/detail',purpose:'Detail workflow',components:['timeline','form']}],features:[{name:'Search',description:'loading empty error retry mobile accessible'},{name:'Case flow',description:'offline recovery'}],actions:[{name:'Search'},{name:'Create'},{name:'Share'}],navigation:[{label:'Home',route:'/'},{label:'Cases',route:'/cases'},{label:'Detail',route:'/detail'}],data:{Case:{fields:['name','owner_id','status']}}};
const pool=evaluateGenerationCandidatePool([{id:'mutable',provider:'soolen-local',sourceKind:'zero-cost-local',specification:mutable}]);
assert.equal(Object.isFrozen(pool.selectedSpecification),false,'Candidate selection must not freeze the specification before wallpaper/game/runtime normalization.');
pool.selectedSpecification.designSystem={wallpaperPreset:'moon-city'};
assert.equal(pool.selectedSpecification.designSystem.wallpaperPreset,'moon-city');

const autonomous=read('engine/autonomous-engine.js');
assert.match(autonomous,/buildCostSafeCandidatePool/);
assert.match(autonomous,/providers:\["soolen-local"\]/);
assert.match(autonomous,/expandZeroCostIndustrySpecification/);
assert.match(autonomous,/industryHint:promptOptions\.industry/,'Runtime local expansion must receive a validated structured industry hint when the caller supplied one.');
assert.match(autonomous,/one-primary-plus-zero-cost-local-shadows/);
assert.match(autonomous,/paidShadowCalls:0/);
assert.match(autonomous,/candidatePool\?\.selectedProvider\|\|primary\.provider/);
assert.doesNotMatch(autonomous,/Promise\.all\([^\n]*generateWithFallback/,'Metered candidate generation must not be fan-out parallel.');
const firstJudge=autonomous.indexOf('let pool=evaluateGenerationCandidatePool(candidates)');
const shadowLoop=autonomous.indexOf('for(let index=0;index<budget.localShadowCandidates;index++)');
assert.ok(firstJudge>=0&&shadowLoop>firstJudge,'Primary candidate must be judged before any zero-cost shadow is generated.');
assert.match(autonomous,/budget\.stopWhenAccepted&&pool\.selectedDecision==="accept"/,'Runtime must stop candidate expansion as soon as the Judge accepts the current pool.');
assert.ok((autonomous.match(/pool=evaluateGenerationCandidatePool\(candidates\)/g)||[]).length>=2,'Candidate pool must be re-judged after each added shadow candidate.');
console.log('✓ Runtime generation judges the primary first, stops on acceptance, and only then expands sequential zero-cost local shadows when quality needs improvement');