import assert from 'node:assert/strict';
import {routeEngineeringKnowledge,buildKnowledgePacket} from '../lib/ai/laneriq-knowledge-router.js';
import {createExperienceCandidate} from '../lib/ai/laneriq-experience-ledger.js';
import {evaluateKnowledgePromotion,promoteKnowledgeCandidate} from '../lib/ai/laneriq-knowledge-promotion.js';
import {learnFromBenchmark,learnFromIncident,assessLearningOutcome} from '../lib/ai/laneriq-learning-loop.js';
import {getLaneriqEngineeringKnowledge,engineeringKnowledgeForPrompt} from '../lib/ai/laneriq-engineering-knowledge.js';
import {GENERATION_QUALITY_RULES} from '../lib/buildStandards.js';

const routed=routeEngineeringKnowledge({task:'Deploy an iOS avatar with zero-cost local voice, owner-scoped memory and Production evidence',platform:'ios',mode:'zero'});
for(const id of ['avatar_living_character','mobile_local_compute','cost_governance','production_evidence','security'])assert.ok(routed.selectedDomains.includes(id),`missing routed domain ${id}`);
assert.ok(routed.selectedDomains.length<=8);
const packet=buildKnowledgePacket({task:'secure database migration with exact SHA release evidence',platform:'web',mode:'balanced'});
assert.match(packet.instruction,/AI output remains a candidate/i);
assert.match(packet.instruction,/Never self-promote/i);

const secretCandidate=createExperienceCandidate({domain:'security',title:'Token leak sk_12345678901234567890',lesson:'Never log authorization bearer token_12345678901234567890 or service_role secret values.',source:'incident',risk:'high',evidence:[{kind:'contract',ref:'redaction-contract',passed:true},{kind:'incident',ref:'incident-42',passed:true}]});
assert.equal(secretCandidate.status,'candidate');
assert.equal(secretCandidate.autoPromotable,false);
assert.doesNotMatch(`${secretCandidate.title} ${secretCandidate.lesson}`,/sk_12345678901234567890|token_12345678901234567890|service_role secret/i);

const blocked=evaluateKnowledgePromotion(secretCandidate,{target:'production_rule',reviewerApproved:false});
assert.equal(blocked.allowed,false);
assert.ok(blocked.blockers.includes('human-review-approval-required'));
assert.ok(blocked.blockers.includes('independent-exact-sha-production-evidence-required'));

const eligible=createExperienceCandidate({domain:'production_evidence',title:'Exact SHA promotion lesson',lesson:'Promote only when deterministic, runtime and exact-SHA Production evidence agree.',source:'runtime',risk:'normal',evidence:[{kind:'contract',ref:'contract-gate',passed:true,independent:true},{kind:'runtime',ref:'runtime-probe',passed:true,independent:true},{kind:'production_exact_sha',ref:'sha:abc123',passed:true,exactSha:true,independent:true},{kind:'manual_review',ref:'review-1',passed:true,independent:true}]});
const allowed=evaluateKnowledgePromotion(eligible,{target:'production_rule',reviewerApproved:true});
assert.equal(allowed.allowed,true);
assert.equal(promoteKnowledgeCandidate(eligible,{target:'production_rule',reviewerApproved:true}).status,'production_rule');

const regression=learnFromBenchmark({domain:'frontend_liui',hypothesis:'Reduce motion complexity',baselineScore:96,candidateScore:97,regressionCount:1,evidence:[{kind:'contract',ref:'liui-contract',passed:true,independent:true}]});
assert.equal(regression.materiallyBetter,false);
assert.equal(regression.candidate.evidence[0].passed,false);
const improvement=learnFromBenchmark({domain:'frontend_liui',hypothesis:'Reduce motion complexity',baselineScore:96,candidateScore:98,regressionCount:0,evidence:[{kind:'contract',ref:'liui-contract',passed:true,independent:true}]});
assert.equal(improvement.materiallyBetter,true);
assert.equal(assessLearningOutcome(improvement.candidate).writesPermanentKnowledge,false);

const incident=learnFromIncident({domain:'cloud_infrastructure',rootCause:'retry storm exceeded bounded concurrency',prevention:'enforce admission and idempotent retry budget',severity:'critical',evidence:[{kind:'contract',ref:'retry-contract',passed:true,independent:true}]});
const critical=evaluateKnowledgePromotion(incident,{target:'validated'});
assert.equal(critical.allowed,false);
assert.ok(critical.blockers.includes('critical-risk-manual-review-evidence-required'));

const knowledge=getLaneriqEngineeringKnowledge();
assert.equal(knowledge.learningContract,'laneriq-governed-experience-learning-v1');
assert.ok(engineeringKnowledgeForPrompt().includes('governed candidate lesson'));
assert.match(GENERATION_QUALITY_RULES,/EXPERIENCE LEARNING LOOP/i);
assert.match(GENERATION_QUALITY_RULES,/Production rules require explicit human approval/i);
assert.match(GENERATION_QUALITY_RULES,/Failed or regressing benchmarks do not teach a positive rule/i);

console.log('LANERIQ Knowledge Fabric v2 gate passed: task-scoped routing, bounded experience capture, incident/benchmark learning and fail-closed human+evidence promotion are locked.');
