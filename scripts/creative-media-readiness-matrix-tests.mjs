import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCreativeMediaReadinessMatrix, filterCreativeMediaReadiness, validateMediaOutputEvidence } from '../lib/ai/creative-media-readiness-matrix.js';
import { listCreativeMediaTasks } from '../lib/ai/creative-media-control-plane.js';

const digest='a'.repeat(64);
const sha='b'.repeat(40);
const tasks=listCreativeMediaTasks();
assert.ok(tasks.length>0,'Creative Media must expose at least one task');

const providers={
  image:{configured:true,connected:true,blockedByCostPolicy:false,capabilities:tasks.filter(t=>t.modality==='image').map(t=>t.capability)},
  videoGeneration:{configured:true,connected:true,blockedByCostPolicy:false,capabilities:tasks.filter(t=>t.modality==='video'||t.modality==='audio').map(t=>t.capability)},
  videoRenderer:{configured:true,connected:true,blockedByCostPolicy:false,capabilities:['timeline-render']},
};

const noEvidence=buildCreativeMediaReadinessMatrix({providers,outputEvidence:[],ciVerified:true});
assert.equal(noEvidence.total,tasks.length);
assert.equal(noEvidence.summary.codeReady,tasks.length);
assert.equal(noEvidence.summary.ciReady,tasks.length);
assert.equal(noEvidence.summary.liveProviderVerified,0,'Connected providers alone must never imply LIVE verification');
assert.equal(noEvidence.summary.realOutputQualityVerified,0);

const first=tasks[0];
assert.equal(validateMediaOutputEvidence({capability:first.capability,provider:'test',environment:'production',producedAt:new Date().toISOString(),outputDigest:digest,productionSha:sha,artifactValidated:true,safetyPassed:true,qualityPassed:true}).valid,true);
assert.equal(validateMediaOutputEvidence({capability:first.capability,provider:'test',environment:'preview',producedAt:new Date().toISOString(),outputDigest:digest,productionSha:sha,artifactValidated:true,safetyPassed:true,qualityPassed:true}).valid,false,'Preview output cannot verify Production LIVE');

const verified=buildCreativeMediaReadinessMatrix({providers,ciVerified:true,outputEvidence:[{capability:first.capability,provider:'test-provider',environment:'production',producedAt:new Date().toISOString(),outputDigest:digest,productionSha:sha,artifactValidated:true,safetyPassed:true,qualityPassed:true}]});
const verifiedTask=verified.tasks.find(t=>t.capability===first.capability);
assert.equal(verifiedTask.liveProviderVerified,true);
assert.equal(verifiedTask.realOutputQualityVerified,true);

const image=filterCreativeMediaReadiness(noEvidence,{surface:'image'});
assert.ok(image.tasks.every(t=>t.modality==='image'));
const video=filterCreativeMediaReadiness(noEvidence,{surface:'video'});
assert.ok(video.tasks.every(t=>t.modality==='video'||t.modality==='audio'));

for(const path of ['app/api/media/readiness-matrix/route.js','app/api/images/capabilities/route.js','app/api/video/capabilities/route.js']){
  const source=fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
  assert.ok(!/API_KEY|SECRET|TOKEN|PASSWORD/.test(source),'Readiness APIs must never expose or name secret values');
}

console.log(`Creative media readiness matrix tests passed for ${tasks.length} canonical tasks.`);
