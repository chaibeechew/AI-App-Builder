import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contractSource=read('lib/ai/idea-planning-contract.js');
const contract=await import(`data:text/javascript;base64,${Buffer.from(contractSource).toString('base64')}`);
const zero=read('engine/zero-cost-provider.js');
const voice=read('app/lib/voice-understanding-engine.js');
const orchestrate=read('app/api/orchestrate/route.js');
const home=read('app/page.js');

const {buildIdeaPlan,evaluateIdeaReadiness,IDEA_PLANNING_LIMITS}=contract;

// Long, polished but vague prompts must not self-authorize a build.
const vague=buildIdeaPlan('Build me a beautiful premium modern App and Website. Make it amazing, responsive and very professional.');
assert.equal(vague.readyToBuild,false);
assert.ok(vague.questions.length>=1&&vague.questions.length<=3);
assert.equal(vague.audience,'');

// Concrete user/workflow evidence is enough even when the prompt is concise.
const property=buildIdeaPlan('Build a property CRM for real estate agents to manage listings and follow up leads.');
assert.equal(property.readyToBuild,true);
assert.equal(property.appType,'Real Estate');
assert.equal(property.audience,'agents');
assert.ok(property.features.includes('crm'));
assert.ok(property.features.includes('listings'));
assert.equal(property.questions.length,0);

// A single generic product label is not enough when the core user/workflow is unknown.
const crmOnly=buildIdeaPlan('Build a CRM app.');
assert.equal(crmOnly.readyToBuild,false);
assert.equal(crmOnly.audience,'');
assert.ok(crmOnly.questions.some(q=>/main user|主要给谁|Siapa pengguna/i.test(q)));

// Chinese input keeps Chinese planning/questions and can become ready from concrete evidence.
const chinese=buildIdeaPlan('做一个房地产客户管理 App，给客户查看房源、预约看房，并让经纪跟进潜在客户。');
assert.equal(chinese.language,'zh-CN');
assert.equal(chinese.readyToBuild,true);
assert.ok(chinese.features.length>=2);
const chineseMissing=buildIdeaPlan('我想做一个很高级很好看的 App 和 Website。');
assert.equal(chineseMissing.readyToBuild,false);
assert.equal(chineseMissing.language,'zh-CN');
assert.ok(chineseMissing.questions.every(q=>/[\u4e00-\u9fff]/.test(q)));

// Model output may suggest structure, but cannot override deterministic readiness.
const modelTryingToApprove=buildIdeaPlan('Build me something beautiful.',{modelPlan:{readyToBuild:true,audience:'everyone',appType:'Commerce',features:['payments','messaging'],api_token:'do-not-store',entities:['Order']}});
assert.equal(modelTryingToApprove.readyToBuild,false);
assert.equal(modelTryingToApprove.audience,'');
assert.ok(!JSON.stringify(modelTryingToApprove).includes('do-not-store'));
assert.equal(modelTryingToApprove.rawPrivateAssetsReusableAcrossCustomers,false);

// Confirmed history can be refined, while explicit current corrections win and negated features are removed.
const previous={appType:'Real Estate',audience:'customers',intent:'Manage property leads',features:['crm','listings','messaging'],corrections:[]};
const corrected=buildIdeaPlan('Actually, staff only. No chat, use booking and reports instead.',{previousPlan:previous});
assert.equal(corrected.readyToBuild,true);
assert.equal(corrected.audience,'staff');
assert.ok(corrected.features.includes('booking'));
assert.ok(corrected.features.includes('reports'));
assert.ok(!corrected.features.includes('messaging'));
assert.ok(corrected.corrections.length>=1);

// Lists, questions and input are bounded.
const oversizedModel={features:Array.from({length:50},(_,i)=>`feature-${i}`),entities:Array.from({length:50},(_,i)=>`entity-${i}`),constraints:Array.from({length:50},(_,i)=>`constraint-${i}`)};
const bounded=buildIdeaPlan('Business staff need CRM, booking, reports and search.',{modelPlan:oversizedModel});
assert.ok(bounded.features.length<=10);
assert.ok(bounded.entities.length<=10);
assert.ok(bounded.constraints.length<=10);
assert.ok(bounded.questions.length<=3);
assert.equal(IDEA_PLANNING_LIMITS.MAX_IDEA_LENGTH,6000);

// Game planning identifies intent but only marks that the downstream Professional gate is required.
const game=buildIdeaPlan('Build a 5v5 mobile MOBA game for players with matches, scores and team battles.');
assert.equal(game.readyToBuild,true);
assert.equal(game.gameIntent,true);
assert.match(orchestrate,/requiresProfessionalGate:Boolean\(planning\.gameIntent\)/);
assert.doesNotMatch(orchestrate,/professional-fair-use/);

// All planning paths use the same contract; old length/count shortcuts are gone.
assert.match(zero,/buildIdeaPlan/);
assert.doesNotMatch(zero,/message\.length\s*>?=\s*18/);
assert.match(voice,/buildIdeaPlan/);
assert.doesNotMatch(voice,/features\.length\s*>?=\s*1/);
assert.doesNotMatch(voice,/General users/);

// Main orchestrator recomputes readiness from the current customer idea and fails closed before module planning.
assert.match(orchestrate,/buildIdeaPlan\(idea\)/);
assert.doesNotMatch(orchestrate,/body\?\.previousPlan/);
assert.match(orchestrate,/IDEA_NEEDS_DETAILS/);
assert.match(orchestrate,/status:422/);
assert.match(orchestrate,/planning\.questions/);
assert.match(orchestrate,/IDEA_PLANNING_LIMITS\.MAX_IDEA_LENGTH/);
const planningIndex=orchestrate.indexOf('const planning=buildIdeaPlan(idea)');
const moduleIndex=orchestrate.indexOf('const plan=buildAutonomousPlan');
assert.ok(planningIndex>0&&moduleIndex>planningIndex,'Readiness must be decided before autonomous module planning.');

// Home always asks the orchestrator before Generate and a non-2xx planning result blocks the Generate call.
const homePlan=home.indexOf('fetch("/api/orchestrate"');
const homePlanGuard=home.indexOf('if(!planResponse.ok)throw');
const homeGenerate=home.indexOf('fetch("/api/generate"');
assert.ok(homePlan>0&&homePlanGuard>homePlan&&homeGenerate>homePlanGuard,'Main build flow must not bypass Idea Planning.');

// Direct evaluator agrees with the plan output on core readiness semantics.
assert.equal(evaluateIdeaReadiness('Make an app').readyToBuild,false);
assert.equal(evaluateIdeaReadiness('Restaurant staff need booking, orders and reports.').readyToBuild,true);

console.log('✓ Vague or model-inflated prompts cannot self-authorize a build');
console.log('✓ Concrete audience, purpose and workflow evidence deterministically controls readiness');
console.log('✓ Voice and zero-cost planning share one bounded readiness contract');
console.log('✓ Current corrections override confirmed history and remove explicitly negated features');
console.log('✓ Multilingual questions, privacy invariants, list bounds and game-gate signaling are enforced');
console.log('✓ Main orchestrator fails closed before module planning and the homepage cannot bypass it');
