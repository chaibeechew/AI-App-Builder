import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  bootstrapAppBuilderRealityEnvelope,advanceAppBuilderRealityEnvelope,serializeAppBuilderRealityEnvelope,
  summarizeAppBuilderRealityEnvelope,verifyAppBuilderRealityEnvelope,hashAppBuilderArtifact,
} from '../lib/intelligence/app-builder-world-bridge.js';
import { sanitizeMemoryJson,mergeProjectMemory,buildProjectMemoryBrief } from '../lib/project-memory.js';

const baseSpec={name:'World App',description:'baseline',pages:[{name:'Home'}],features:[{name:'Search'}],designSystem:{themeMode:'auto'}};
const nextSpec={...baseSpec,description:'version two',features:[...baseSpec.features,{name:'Saved Items'}]};
const thirdSpec={...nextSpec,description:'version three',pages:[...nextSpec.pages,{name:'Saved'}]};
const verification={selfTestPassed:true,selfHealPassed:true,executionPassed:true,executionRequired:true,qualityAccepted:true,qualityScore:100};

const initial=bootstrapAppBuilderRealityEnvelope({identitySeed:'generate-request-001',specification:baseSpec,appVersionNo:1,verification});
const initialSummary=summarizeAppBuilderRealityEnvelope(initial);
assert.equal(initialSummary.valid,true);
assert.equal(initialSummary.appVersionNo,1);
assert.equal(initialSummary.worldVersion,1);
assert.equal(initialSummary.eventCount,0);
assert.equal(initialSummary.evidenceCount,1);
assert.equal(initialSummary.artifactHash,hashAppBuilderArtifact(baseSpec));
assert.equal(initial.providerIndependentIdentity,true);

const serialized=serializeAppBuilderRealityEnvelope(initial);
const memory=mergeProjectMemory(null,{requestedName:'World App',realityEnvelope:serialized});
assert.equal(memory.realityEnvelope,serialized);
assert.doesNotMatch(buildProjectMemoryBrief({memory_json:memory}),/app-world:|evidenceLedger|eventLog|realityEnvelope/);
const injected=JSON.parse(serialized);injected.identity.rawPrompt='private user prompt';
assert.equal(sanitizeMemoryJson({realityEnvelope:JSON.stringify(injected)}).realityEnvelope,'');

const advanced=advanceAppBuilderRealityEnvelope({
  existingEnvelope:serialized,legacyIdentitySeed:'legacy-unused',baseSpecification:baseSpec,nextSpecification:nextSpec,
  baseAppVersionNo:1,nextAppVersionNo:2,requestId:'modify-request-002',
  verification:{selfTestPassed:true,selfHealPassed:true,executionRequired:false,qualityAccepted:true,qualityScore:100,releaseReady:true},
});
const advancedSummary=summarizeAppBuilderRealityEnvelope(advanced);
assert.equal(advancedSummary.valid,true);
assert.equal(advancedSummary.appVersionNo,2);
assert.equal(advancedSummary.worldVersion,2);
assert.equal(advancedSummary.eventCount,1);
assert.equal(advancedSummary.evidenceCount,2);
assert.equal(advancedSummary.worldId,initialSummary.worldId);
assert.equal(advancedSummary.projectId,initialSummary.projectId);
assert.equal(advancedSummary.artifactHash,hashAppBuilderArtifact(nextSpec));

const third=advanceAppBuilderRealityEnvelope({
  existingEnvelope:serializeAppBuilderRealityEnvelope(advanced),baseSpecification:nextSpec,nextSpecification:thirdSpec,
  baseAppVersionNo:2,nextAppVersionNo:3,requestId:'modify-request-003',
  verification:{selfTestPassed:true,selfHealPassed:true,executionRequired:false,qualityAccepted:true,qualityScore:100},
});
const thirdSummary=summarizeAppBuilderRealityEnvelope(third);
assert.equal(thirdSummary.worldVersion,3);
assert.equal(thirdSummary.appVersionNo,3);
assert.equal(thirdSummary.eventCount,2);
assert.equal(thirdSummary.evidenceCount,3);
assert.equal(thirdSummary.worldId,initialSummary.worldId);

assert.throws(()=>advanceAppBuilderRealityEnvelope({
  existingEnvelope:serializeAppBuilderRealityEnvelope(advanced),baseSpecification:{...nextSpec,description:'tampered base'},nextSpecification:thirdSpec,
  baseAppVersionNo:2,nextAppVersionNo:3,requestId:'modify-request-bad-base',verification:{selfTestPassed:true,selfHealPassed:true,qualityAccepted:true},
}),/APP_BUILDER_WORLD_BASE_MISMATCH/);
assert.throws(()=>advanceAppBuilderRealityEnvelope({
  existingEnvelope:serializeAppBuilderRealityEnvelope(advanced),baseSpecification:nextSpec,nextSpecification:thirdSpec,
  baseAppVersionNo:2,nextAppVersionNo:4,requestId:'modify-request-bad-version',verification:{selfTestPassed:true,selfHealPassed:true,qualityAccepted:true},
}),/APP_BUILDER_WORLD_APP_VERSION_SEQUENCE_INVALID/);
assert.throws(()=>bootstrapAppBuilderRealityEnvelope({identitySeed:'bad-quality',specification:baseSpec,verification:{selfTestPassed:true,selfHealPassed:true,qualityAccepted:false}}),/APP_BUILDER_WORLD_QUALITY_ACCEPTANCE_REQUIRED/);

const tampered=JSON.parse(serializeAppBuilderRealityEnvelope(third));
tampered.eventLog.events[0].patch.entity.attributes.artifactHash='0'.repeat(64);
assert.equal(verifyAppBuilderRealityEnvelope(tampered).ok,false);

const legacy=advanceAppBuilderRealityEnvelope({
  existingEnvelope:null,legacyIdentitySeed:'11111111-1111-4111-8111-111111111111',baseSpecification:baseSpec,nextSpecification:nextSpec,
  baseAppVersionNo:7,nextAppVersionNo:8,requestId:'legacy-modify-008',verification:{selfTestPassed:true,selfHealPassed:true,qualityAccepted:true,qualityScore:99},
});
const legacySummary=summarizeAppBuilderRealityEnvelope(legacy);
assert.equal(legacySummary.valid,true);
assert.equal(legacySummary.baselineImported,true);
assert.equal(legacySummary.appVersionNo,8);
assert.equal(legacySummary.worldVersion,2);

const generate=fs.readFileSync('app/api/generate/route.js','utf8');
const modify=fs.readFileSync('app/api/modify/route.js','utf8');
const domain=fs.readFileSync('lib/cloud/builder-projects.js','utf8');
const adapter=fs.readFileSync('lib/cloud-adapters/builder-project-world-data.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260905064500_app_builder_unified_world_atomic_persistence.sql','utf8');
const projectMemory=fs.readFileSync('lib/project-memory.js','utf8');

assert.match(generate,/bootstrapAppBuilderRealityEnvelope/);
assert.match(generate,/serializeAppBuilderRealityEnvelope/);
assert.match(generate,/memoryJson:memoryPayload/);
assert.match(generate,/learningScope:memoryScope/);
assert.match(generate,/persisted\.memory_saved!==true/);
assert.ok(generate.indexOf('bootstrapAppBuilderRealityEnvelope')<generate.indexOf('persistBuilderGeneratedProject({requestId:chargeRequestId'));
assert.doesNotMatch(generate,/createAdminClient|@supabase\/|lib\/supabase\//);

assert.match(modify,/advanceAppBuilderRealityEnvelope/);
assert.match(modify,/baseAppVersionNo:baseVersionNo/);
assert.match(modify,/nextAppVersionNo:nextVersionNo/);
assert.match(modify,/realityEnvelope:serializeAppBuilderRealityEnvelope/);
assert.match(modify,/worldMemoryAtomic/);
assert.ok(modify.indexOf('advanceAppBuilderRealityEnvelope')<modify.indexOf('saveBuilderModification({appId'));
assert.doesNotMatch(modify,/createAdminClient|@supabase\/|lib\/supabase\//);

assert.match(domain,/builder-project-world-data\.js/);
assert.match(domain,/memoryJson: payload\?\.memoryJson \|\| \{\}/);
assert.match(domain,/worldMemoryAtomic/);
assert.match(adapter,/server_persist_generated_project_world/);
assert.match(adapter,/server_save_app_modification_world/);
assert.match(adapter,/p_memory_json:memoryJson\|\|\{\}/);
assert.match(adapter,/p_learning_scope:String\(learningScope\|\|'project_only'\)/);
assert.match(adapter,/select\('id,version_no,specification,created_at'\)/);
assert.match(adapter,/worldMemoryAtomic:true/);

assert.match(migration,/server_persist_generated_project_world\([\s\S]*p_memory_json jsonb/);
assert.match(migration,/server_save_app_modification_world\([\s\S]*p_memory_json jsonb/);
assert.match(migration,/security definer/i);
assert.match(migration,/set search_path=''/i);
assert.match(migration,/insert into public\.project_memory/);
assert.match(migration,/on conflict\(app_id\) do update/);
assert.match(migration,/current_version is not distinct from existing_version\.id/);
assert.match(migration,/select v\.version_no\+1 into next_version/);
assert.doesNotMatch(migration,/auth\.role\(\)/);
assert.match(migration,/revoke all on function public\.server_persist_generated_project_world[\s\S]*from public, anon, authenticated/);
assert.match(migration,/grant execute on function public\.server_persist_generated_project_world[\s\S]*to service_role/);
assert.match(migration,/revoke all on function public\.server_save_app_modification_world[\s\S]*from public, anon, authenticated/);
assert.match(migration,/grant execute on function public\.server_save_app_modification_world[\s\S]*to service_role/);
assert.doesNotMatch(migration,/create or replace function public\.server_persist_generated_project\(/);
assert.doesNotMatch(migration,/create or replace function public\.server_save_app_modification\(/);
assert.match(projectMemory,/PRIVATE_REALITY_KEY/);
assert.match(projectMemory,/realityEnvelope:cleanRealityEnvelope/);

console.log('✓ App Builder initial generation establishes a provider-independent canonical World + observed Evidence baseline');
console.log('✓ Verified modifications advance the same World/Event/Evidence chain exactly once per accepted app version');
console.log('✓ Tampered chains, stale specification hashes, skipped version numbers and failed quality evidence are fail-closed');
console.log('✓ Legacy projects receive a one-time baseline import without pretending their earlier history was observed by the new ledger');
console.log('✓ Reality Envelope stays project-scoped, bounded and excluded from prompt-facing Project Memory briefs');
console.log('✓ App version and Unified World memory persist in isolated service-role database transactions with explicit EXECUTE grants and no auth.role runtime dependency');
