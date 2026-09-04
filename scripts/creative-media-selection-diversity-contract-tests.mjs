import assert from 'node:assert/strict';
import { rankCreativeMediaCandidates } from '../lib/ai/creative-candidate-selection.js';
import { selectCreativeDiverseCandidates } from '../lib/ai/creative-diversity-selector.js';
import { buildCreativeMediaParetoFront } from '../lib/ai/creative-pareto-selector.js';
import { assessCreativeHumanApproval } from '../lib/ai/creative-human-approval-gate.js';
import { buildCreativePublishCandidatePack } from '../lib/ai/creative-publish-candidate-pack.js';

const hash=char=>(/^[a-f0-9]$/i.test(String(char||''))?String(char).toLowerCase():'a').repeat(64);
const candidate=(id,{quality=90,risk=5,costClass='zero',costUsd=0,latencyMs=1200,approval=false,sensitivity=[],provenance=true}={})=>({
  candidateId:`cand:${id}`,assetId:`asset:${id}`,modality:'image',costClass,costUsd,latencyMs,requiresHumanApproval:approval,sensitivity,
  metrics:{qualityScore:quality,consistencyScore:92,promptAdherence:93,brandFit:91,providerReliability:95,riskScore:risk},
  evidence:{safetyPassed:true,provenanceVerified:provenance,ownerScopeVerified:true,outputValidated:true,durablePersisted:true,contentSha256:hash(id[0]||'a'),qualityAssessmentId:`qa:${id}`},
});

const zero=rankCreativeMediaCandidates({costMode:'zero',candidates:[
  candidate('alpha',{quality:96}),candidate('beta',{quality:94}),candidate('gamma',{quality:89}),
  candidate('premium',{quality:100,costClass:'premium',costUsd:4}),candidate('bad',{quality:99,provenance:false}),
]});
assert.equal(zero.ok,true);
assert.deepEqual(zero.ranked.map(row=>row.candidateId),['cand:alpha','cand:beta','cand:gamma']);
assert.ok(zero.rejected.some(row=>row.candidateId==='cand:premium'&&row.code==='CREATIVE_SELECTION_COST_POLICY_BLOCKED'));
assert.ok(zero.rejected.some(row=>row.candidateId==='cand:bad'&&row.code==='CREATIVE_SELECTION_HARD_EVIDENCE_REQUIRED'));
assert.equal(zero.liveQualityVerified,false);

const diversity=selectCreativeDiverseCandidates({topK:2,nearDuplicateThreshold:0.92,candidates:zero.ranked,similarities:[
  {a:'cand:alpha',b:'cand:beta',score:0.97,measurementId:'sim:ab'},
  {a:'cand:alpha',b:'cand:gamma',score:0.31,measurementId:'sim:ag'},
]});
assert.equal(diversity.ok,true);
assert.deepEqual(diversity.selected.map(row=>row.candidateId),['cand:alpha','cand:gamma']);
assert.ok(diversity.rejected.some(row=>row.candidateId==='cand:beta'&&row.reason==='near-duplicate'));
assert.equal(diversity.perceptualMeasurementPerformedHere,false);

const paid=rankCreativeMediaCandidates({costMode:'paid',candidates:[candidate('hero',{quality:98,costClass:'premium',costUsd:3,latencyMs:800}),candidate('cheap',{quality:92,costClass:'zero',costUsd:0,latencyMs:900})]});
const pareto=buildCreativeMediaParetoFront({candidates:paid.ranked});
assert.equal(pareto.ok,true);
assert.equal(pareto.frontier.length,2,'Higher-quality premium and lower-cost zero candidates should both survive the Pareto front when neither dominates all dimensions.');
assert.equal(pareto.liveOptimizationVerified,false);

const sensitive={...zero.ranked[0],requiresHumanApproval:true,sensitivity:['likeness']};
const blocked=assessCreativeHumanApproval({candidate:sensitive});
assert.equal(blocked.releaseAllowed,false);
assert.equal(blocked.approvalCannotBeInferred,true);
const approved=assessCreativeHumanApproval({candidate:sensitive,approval:{approved:true,approvalId:'approval:1',approverUserId:'user:owner',candidateId:sensitive.candidateId,decisionSha256:hash('f')}});
assert.equal(approved.releaseAllowed,true);

const pack=buildCreativePublishCandidatePack({candidates:[{...sensitive,diversityScore:80},{...zero.ranked[2],diversityScore:98}],approvals:{[sensitive.candidateId]:{approved:true,approvalId:'approval:1',approverUserId:'user:owner',candidateId:sensitive.candidateId,decisionSha256:hash('f')}}});
assert.equal(pack.ok,true);
assert.equal(pack.roles.hero,'cand:alpha');
assert.equal(pack.roles.diversity,'cand:gamma');
assert.equal(pack.automaticPublishPerformed,false);
assert.equal(pack.humanApprovalPreserved,true);

const noApprovalPack=buildCreativePublishCandidatePack({candidates:[sensitive]});
assert.equal(noApprovalPack.ok,false);
assert.equal(noApprovalPack.code,'CREATIVE_PUBLISH_NO_APPROVED_CANDIDATE');

console.log('Creative Media Selection & Diversity 100 contract tests passed.');
