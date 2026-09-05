import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {buildLivingCharacterManifest} from '../lib/ai/avatar-character-core.js';
import {buildAvatarFaceFrame,createAvatarRuntimeState,normalizeVisemeTimeline,reduceAvatarRuntime,selectAvatarPerformanceProfile} from '../lib/ai/avatar-runtime-engine.js';
import {advanceAvatarFaceRuntime,buildFaceRigCommand,createAvatarFaceRuntime} from '../lib/ai/avatar-face-runtime.js';
import {expandAvatarFaceFrame52,LANERIQ_FACE_52_CHANNELS,validateAvatarFace52Command} from '../lib/ai/avatar-face-52-runtime.js';
import {appendAvatarVoiceChunk,buildAvatarVoiceProviderRequest,createAvatarVoiceStream,getAvatarVoicePlaybackFrame,interruptAvatarVoice} from '../lib/ai/avatar-voice-runtime.js';
import {createAvatarAudioClock,advanceAvatarAudioClock,getAvatarAudioClockFrame,shouldHardResyncAvatarAudio} from '../lib/ai/avatar-audio-clock.js';
import {advanceAvatarBodyRuntime,buildAvatarBodyRigCommand,createAvatarBodyRuntime} from '../lib/ai/avatar-body-runtime.js';
import {buildAvatarRenderPacket,buildMobileAvatarSurfaceContract,createAvatarRendererPlan,shouldReplanAvatarRenderer} from '../lib/ai/avatar-renderer-adapter.js';
import {buildAvatar2_5DSurfaceFrame,createAvatarSurfaceRuntime,recordAvatarSurfaceFrame,recommendAvatarSurfaceDegrade} from '../lib/ai/avatar-surface-runtime.js';
import {buildCharacterAgentActionEnvelope,buildCharacterAgentContext,buildCharacterMemoryWriteIntent,mapAgentPhaseToAvatarEvent} from '../lib/ai/avatar-agent-bridge.js';
import {buildCharacterContinuitySnapshot,buildCharacterDeviceHandoff,mergeCharacterContinuitySnapshots,validateCharacterHandoff} from '../lib/ai/avatar-cross-device-runtime.js';
import {buildAvatarCapabilityTruthLedger,buildAvatarRecoverySnapshot,chooseAvatarRecoveryMode,evaluateAvatarProductionMetrics} from '../lib/ai/avatar-production-quality.js';
import {appendLivingAvatarVoiceChunk,applyAgentUpdateToLivingAvatar,applyLivingAvatarEvent,createLivingAvatarSession,interruptLivingAvatarSpeech,recordLivingAvatarFrameTiming,tickLivingAvatarSession} from '../lib/ai/avatar-session-orchestrator.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('app/avatar-studio/page.js');
const api=read('app/api/avatar/generate/route.js');
const characterApi=read('app/api/avatar/character/route.js');
const continuityApi=read('app/api/avatar/continuity/route.js');
const characterCore=read('lib/ai/avatar-character-core.js');
const runtimeEngine=read('lib/ai/avatar-runtime-engine.js');
const faceRuntimeSource=read('lib/ai/avatar-face-runtime.js');
const face52Source=read('lib/ai/avatar-face-52-runtime.js');
const voiceRuntimeSource=read('lib/ai/avatar-voice-runtime.js');
const audioClockSource=read('lib/ai/avatar-audio-clock.js');
const bodyRuntimeSource=read('lib/ai/avatar-body-runtime.js');
const rendererSource=read('lib/ai/avatar-renderer-adapter.js');
const surfaceSource=read('lib/ai/avatar-surface-runtime.js');
const agentBridgeSource=read('lib/ai/avatar-agent-bridge.js');
const continuitySource=read('lib/ai/avatar-cross-device-runtime.js');
const productionSource=read('lib/ai/avatar-production-quality.js');
const orchestratorSource=read('lib/ai/avatar-session-orchestrator.js');
const gateway=read('lib/ai/image-generation-gateway.js');
const persistence=read('lib/ai/image-output-persistence.js');
const save=read('app/api/images/save/route.js');
const assetMigration=read('supabase/migrations/20260901124338_harden_upload_reference_asset_contract.sql');
const replayMigration=read('supabase/migrations/20260903093000_image_generation_request_replay.sql');
const characterMigration=read('supabase/migrations/20260905142500_living_character_persistence.sql');

// Customer surface: stable mobile request identity, consent, truthful source labels and durable private output.
assert.match(page,/AI Avatar Creator/);assert.match(page,/LANERIQ AI CREATIVE STUDIO/);assert.match(page,/← LANERIQ AI/);assert.doesNotMatch(page,/SOOLENAI CREATIVE STUDIO/);
assert.match(page,/generationRequestId\.current\|\|newRequestId\("avatar"\)/);assert.match(page,/AVATAR_GENERATION_IN_PROGRESS/);assert.match(page,/Retry will resume the same avatar request instead of creating a duplicate/);assert.match(page,/maxLength=\{1200\}/);
assert.match(page,/fetch\("\/api\/avatar\/generate"/);assert.match(page,/fetch\("\/api\/images\/save"/);assert.match(page,/credentials:"same-origin"/);assert.match(page,/cache:"no-store"/);
for(const text of ['Fictional / Original','Based on Me','Person With Permission','Create Living Avatar','LIVING CHARACTER CORE','Behavior state preview'])assert.match(page,new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(page,/result\?\.character/);assert.match(page,/character\.characterId/);assert.match(page,/character\?\.runtime\?\.profiles\?\.balanced/);assert.match(page,/min-height:44px/);assert.match(page,/font-size:16px/);

// Generation API keeps auth, replay-safety, likeness consent, private durable capture and truthful fallback.
assert.match(api,/auth\.getUser\(\)/);assert.match(api,/confirmed_at/);assert.match(api,/MAX_REQUEST_BYTES=24\*1024/);assert.match(api,/image_generation_requests/);assert.match(api,/claimRequest\(admin/);assert.match(api,/AVATAR_REQUEST_ID_CONFLICT/);assert.match(api,/AVATAR_GENERATION_IN_PROGRESS/);
assert.match(api,/LIKENESS_MODES=new Set\(\["fictional","self","consented_person"\]\)/);assert.match(api,/Do not infer sensitive personal attributes or identity facts/);assert.match(api,/Do not imitate a celebrity, public figure, copyrighted character or third-party mascot/);assert.match(api,/rawReferenceStored:false/);
assert.match(api,/buildLivingCharacterManifest/);assert.match(api,/function buildCharacterId/);assert.match(api,/continuityKey:hash\.slice\(0,32\)/);assert.match(api,/character,replayed:true/);assert.match(api,/character,replayed:false/);

// Full-system manifest v3 truth boundary.
assert.match(characterCore,/CHARACTER_SCHEMA_VERSION=3/);assert.match(characterCore,/laneriq\.living-character/);assert.match(characterCore,/laneriq-avatar-audio-clock-v1/);assert.match(characterCore,/laneriq-avatar-body-runtime-v1/);assert.match(characterCore,/laneriq-avatar-surface-runtime-v1/);assert.match(characterCore,/laneriq-character-persistence-v1/);assert.match(characterCore,/laneriq-character-continuity-v1/);assert.match(characterCore,/laneriq-living-avatar-session-v2/);assert.match(characterCore,/laneriq-avatar-production-quality-v1/);
for(const state of ['idle','listening','thinking','speaking','acting','success','concerned'])assert.match(characterCore,new RegExp(`"${state}"`));
assert.match(characterCore,/audioClockRuntime:true/);assert.match(characterCore,/bodyGestureRuntime:true/);assert.match(characterCore,/surface2_5dRuntime:true/);assert.match(characterCore,/persistenceApiCode:true/);assert.match(characterCore,/crossDeviceContinuityCode:true/);assert.match(characterCore,/productionQualityGate:true/);
assert.match(characterCore,/persistenceMigrationApplied:false/);assert.match(characterCore,/crossDeviceEncryptedHandoffLive:false/);assert.match(characterCore,/realtime3DRenderer:false/);assert.match(characterCore,/liveVoiceProvider:false/);assert.match(characterCore,/motionGenerator:false/);assert.match(characterCore,/physicalDeviceBenchmark:false/);

const manifest=buildLivingCharacterManifest({characterId:'lc_contract',type:'game',style:'3d',persona:'confident',voiceStyle:'warm',motionProfile:'expressive',language:'en',continuityKey:'contract'});
assert.equal(manifest.schemaVersion,3);assert.equal(manifest.characterId,'lc_contract');assert.equal(manifest.dna.persona,'confident');assert.equal(manifest.runtime.defaultProfile,'balanced');assert.equal(manifest.readiness.bodyGestureRuntime,true);assert.equal(manifest.readiness.liveVoiceProvider,false);

// State engine + mobile performance + base face/viseme.
assert.match(runtimeEngine,/AVATAR_RUNTIME_EVENTS/);let runtime=createAvatarRuntimeState(manifest);runtime=reduceAvatarRuntime(runtime,'USER_SPEECH_START');assert.equal(runtime.state,'listening');runtime=reduceAvatarRuntime(runtime,'USER_SPEECH_END');assert.equal(runtime.state,'thinking');runtime=reduceAvatarRuntime(runtime,'AI_RESPONSE_START',{emotion:'warm'});assert.equal(runtime.state,'speaking');runtime=reduceAvatarRuntime(runtime,'AI_RESPONSE_END');assert.equal(runtime.state,'idle');
assert.equal(selectAvatarPerformanceProfile({thermalState:'serious',batteryLevel:.9,deviceTier:'high'}),'eco');assert.equal(selectAvatarPerformanceProfile({thermalState:'nominal',batteryLevel:.8,deviceTier:'high'}),'performance');assert.equal(selectAvatarPerformanceProfile({thermalState:'fair',batteryLevel:.8,deviceTier:'mid'}),'balanced');
const visemes=normalizeVisemeTimeline([{atMs:900,viseme:'aa',weight:2},{atMs:100,viseme:'mbp',weight:.5},{atMs:500,viseme:'unknown',weight:1}],{durationMs:1000});assert.deepEqual(visemes.map(x=>x.atMs),[100,500,900]);assert.equal(visemes[1].viseme,'sil');
const face=buildAvatarFaceFrame({state:'speaking',emotion:'warm',viseme:'aa',visemeWeight:1,gazeX:2,blink:.25});assert.equal(face.channels['jaw-open'],.7);assert.equal(face.channels['eye-look-x'],1);

// Layer 3: procedural face + 52-channel advanced face expansion.
assert.match(faceRuntimeSource,/createAvatarFaceRuntime/);let faceRuntime=createAvatarFaceRuntime(manifest,{nowMs:0});faceRuntime=advanceAvatarFaceRuntime(faceRuntime,{nowMs:3000,behaviorState:'listening',emotion:'warm',attentionTarget:{x:.8,y:-.3,confidence:1,kind:'user'}});assert.ok(faceRuntime.frame.channels['eye-look-x']>0);
const rig=buildFaceRigCommand(faceRuntime.frame,{maxChannels:13});assert.equal(rig.contract,'blendshape-v1');assert.ok(rig.channels.length<=13);
assert.match(face52Source,/LANERIQ_FACE_52_CHANNELS/);assert.equal(LANERIQ_FACE_52_CHANNELS.length,52);const face52=expandAvatarFaceFrame52({...faceRuntime.frame,emotion:'excited'});assert.equal(face52.channels.length,52);assert.equal(validateAvatarFace52Command(face52),true);

// Layer 2: streamed voice + Audio Clock drift/jitter correction + barge-in.
assert.match(voiceRuntimeSource,/createAvatarVoiceStream/);let voice=createAvatarVoiceStream({sessionId:'voice-contract',language:'en',style:'warm'});voice=appendAvatarVoiceChunk(voice,{chunkId:'c1',startMs:0,durationMs:1000,visemes:[{atMs:0,viseme:'aa',weight:.8},{atMs:500,viseme:'mbp',weight:.7}],final:true});const voiceReplay=appendAvatarVoiceChunk(voice,{chunkId:'c1',startMs:0,durationMs:1000,visemes:[]});assert.equal(voiceReplay.replayedChunkId,'c1');assert.equal(getAvatarVoicePlaybackFrame(voice,{playbackMs:250}).speaking,true);const providerRequest=buildAvatarVoiceProviderRequest(manifest,{text:'Hello there',requestId:'voice:req:1'});assert.equal(providerRequest.providerIdentityExposed,false);assert.equal(getAvatarVoicePlaybackFrame(interruptAvatarVoice(voice,{atMs:300}),{playbackMs:400}).interrupted,true);
assert.match(audioClockSource,/advanceAvatarAudioClock/);let clock=createAvatarAudioClock({sessionId:'clock-contract',nowMs:0});clock=advanceAvatarAudioClock(clock,{nowMs:1000,reportedPlaybackMs:930});assert.equal(getAvatarAudioClockFrame(clock).stable,true);clock=advanceAvatarAudioClock(clock,{nowMs:1100,reportedPlaybackMs:1500});assert.equal(clock.resyncCount,1);assert.equal(shouldHardResyncAvatarAudio(clock),true);

// Layer 4: body/gesture runtime.
assert.match(bodyRuntimeSource,/speech-emphasis/);let body=createAvatarBodyRuntime(manifest,{nowMs:0});body=advanceAvatarBodyRuntime(body,{nowMs:500,state:'speaking',emotion:'warm',speechEnergy:.9});assert.equal(body.gesture,'speech-emphasis');const bodyCommand=buildAvatarBodyRigCommand(body);assert.equal(bodyCommand.contract,'laneriq-avatar-body-rig-v1');assert.ok(Object.keys(bodyCommand.joints).length>=10);

// Layer 1: adaptive renderer plus executable 2.5D surface frame and frame-pressure degrade path.
const rendererPlan=createAvatarRendererPlan(manifest,{thermalState:'nominal',batteryLevel:.8,deviceTier:'high',viewportWidth:390,viewportHeight:844});assert.equal(rendererPlan.profile,'performance');assert.equal(rendererPlan.renderer,'3d');const renderPacket=buildAvatarRenderPacket({plan:rendererPlan,runtimeState:{characterId:manifest.characterId,state:'speaking'},faceFrame:faceRuntime.frame,nowMs:3200});assert.equal(renderPacket.contract,'laneriq-avatar-renderer-v1');assert.equal(shouldReplanAvatarRenderer(rendererPlan,{thermalState:'serious',batteryLevel:.8,deviceTier:'high'}),true);assert.equal(buildMobileAvatarSurfaceContract({platform:'ios'}).continuousCharacterRendering,'in-app-only');
assert.match(surfaceSource,/laneriq-avatar-2\.5d-frame-v1/);let surface=createAvatarSurfaceRuntime({characterId:manifest.characterId,renderer:'2.5d',targetFps:30});const surfaceFrame=buildAvatar2_5DSurfaceFrame({renderPacket:{...renderPacket,renderer:'2.5d'},bodyCommand,faceCommand:rig});assert.equal(surfaceFrame.contract,'laneriq-avatar-2.5d-frame-v1');surface=recordAvatarSurfaceFrame(surface,{frameDurationMs:60,rendered:true});assert.equal(recommendAvatarSurfaceDegrade(surface).degrade,true);

// Layer 7: memory/Agent bridge keeps execution authority out of the avatar and blocks sensitive memory.
assert.match(agentBridgeSource,/SAFE_MEMORY_CATEGORIES/);assert.match(agentBridgeSource,/SENSITIVE_HINT/);assert.match(agentBridgeSource,/avatarAuthority:"presentation-only"/);assert.equal(mapAgentPhaseToAvatarEvent('action_success'),'ACTION_SUCCESS');const agentContext=buildCharacterAgentContext({manifest,runtimeState:{state:'thinking',emotion:'focused'},persistentMemoryOptIn:true,persistentMemory:[{category:'preference',text:'Prefers concise summaries'},{category:'project',text:'API key secret should not persist'}]});assert.equal(agentContext.memory.persistent.length,1);assert.equal(buildCharacterMemoryWriteIntent({manifest,category:'preference',text:'Prefers concise summaries',persistentMemoryOptIn:true,userConfirmed:true}).allowed,true);assert.equal(buildCharacterMemoryWriteIntent({manifest,category:'project',text:'My password is 1234',persistentMemoryOptIn:true,userConfirmed:true}).allowed,false);const actionEnvelope=buildCharacterAgentActionEnvelope({manifest,actionId:'a1',name:'open-project',args:{projectId:'p1'},requiresConfirmation:true});assert.equal(actionEnvelope.executionAuthority,'laneriq-agent');assert.equal(actionEnvelope.avatarAuthority,'presentation-only');

// Layers 5-6: service-role-only character persistence + pseudonymous cross-device continuity.
assert.match(characterMigration,/create table if not exists public\.living_characters/i);assert.match(characterMigration,/create table if not exists public\.living_character_devices/i);assert.match(characterMigration,/force row level security/i);assert.match(characterMigration,/revoke all on table public\.living_characters from public, anon, authenticated/i);assert.match(characterMigration,/Persistent memory contents are not stored here/i);
assert.match(characterApi,/auth\.getUser\(\)/);assert.match(characterApi,/CHARACTER_REVISION_CONFLICT/);assert.match(characterApi,/living_characters/);assert.match(characterApi,/Buffer\.byteLength\(JSON\.stringify\(manifest\)/);assert.match(characterApi,/Cache-Control":"private, no-store/);
assert.match(continuityApi,/living_character_devices/);assert.match(continuityApi,/DEVICE_HASH=\/\^\[a-f0-9\]\{64\}\$\//);assert.match(continuityApi,/persistentMemoryIncluded===true/);assert.match(continuityApi,/rawAssetIncluded===true/);assert.match(continuityApi,/upsert/);
const localContinuity=buildCharacterContinuitySnapshot({manifest,runtimeState:{state:'thinking'},deviceClass:'ios',revision:1,updatedAtMs:100});const remoteContinuity=buildCharacterContinuitySnapshot({manifest,runtimeState:{state:'speaking'},deviceClass:'desktop',revision:2,updatedAtMs:90});const merged=mergeCharacterContinuitySnapshots(localContinuity,remoteContinuity);assert.equal(merged.revision,2);assert.equal(merged.privacy.persistentMemoryIncluded,false);const handoff=buildCharacterDeviceHandoff({snapshot:merged,targetDeviceClass:'android'});assert.equal(validateCharacterHandoff(handoff,{characterId:manifest.characterId,ageMs:1000}).valid,true);assert.equal(validateCharacterHandoff(handoff,{characterId:'wrong',ageMs:1000}).valid,false);assert.match(continuitySource,/encrypted-owner-session-only/);

// Full Session v2 joins Agent → state → audio clock → voice → face → body → renderer → mobile surface.
assert.match(orchestratorSource,/laneriq-living-avatar-session-v2/);assert.match(orchestratorSource,/createAvatarAudioClock/);assert.match(orchestratorSource,/createAvatarBodyRuntime/);assert.match(orchestratorSource,/buildAvatar2_5DSurfaceFrame/);let session=createLivingAvatarSession(manifest,{sessionId:'session-contract',nowMs:0,performanceSignals:{deviceTier:'mid',batteryLevel:.8}});session=applyLivingAvatarEvent(session,'USER_SPEECH_START');session=applyAgentUpdateToLivingAvatar(session,{phase:'understood'});session=appendLivingAvatarVoiceChunk(session,{chunkId:'s1',startMs:0,durationMs:600,visemes:[{atMs:0,viseme:'aa',weight:.8},{atMs:300,viseme:'ee',weight:.7}],final:true});const tick=tickLivingAvatarSession(session,{nowMs:200,playbackMs:200,attentionTarget:{x:.4,y:0,confidence:1},speechEnergy:.9});assert.equal(tick.frame.state,'speaking');assert.equal(tick.frame.audioClock.contract,'laneriq-avatar-audio-clock-v1');assert.equal(tick.frame.body.contract,'laneriq-avatar-body-rig-v1');assert.equal(tick.frame.surface.contract,'laneriq-avatar-2.5d-frame-v1');const timing=recordLivingAvatarFrameTiming(tick.session,{frameDurationMs:70});assert.equal(timing.recommendation.degrade,true);const stopped=interruptLivingAvatarSpeech(tick.session,{atMs:250});assert.equal(stopped.voice.interrupted,true);assert.notEqual(stopped.runtime.state,'speaking');

// Layer 8: Production quality/trust is fail-closed and CODE never auto-promotes LIVE.
assert.match(productionSource,/failClosed:true/);const good=evaluateAvatarProductionMetrics({p95FrameMs:30,p95VoiceStartMs:500,p95LipSyncErrorMs:70,p95BargeInStopMs:100,crashRate:.001,thermalSeriousRate:.01,batteryDrainPctPerHour:10,peakMemoryMb:250,sessionRecoveryRate:.999,continuitySuccessRate:.999});assert.equal(good.passed,true);const bad=evaluateAvatarProductionMetrics({});assert.equal(bad.passed,false);const truth=buildAvatarCapabilityTruthLedger({manifest});assert.equal(truth.live.realtime3DRenderer,false);assert.equal(truth.live.liveVoiceProvider,false);const recovery=buildAvatarRecoverySnapshot({session:tick.session,continuity:merged,audioClockFrame:tick.frame.audioClock});assert.equal(recovery.containsRawAudio,false);assert.equal(recovery.containsRawMemory,false);assert.equal(chooseAvatarRecoveryMode({crashed:true,snapshotAvailable:true}).mode,'restore-session');

// Existing model path remains billing/refund-safe, durable/private and provider-opaque.
assert.match(api,/getImageGenerationConfig\(\)/);assert.match(api,/generateExternalImages/);assert.match(api,/consumeAiCredits\(user\.id/);assert.match(api,/refundAiCredits\(user\.id/);assert.match(api,/persistGeneratedImages/);assert.match(api,/replayPersistedImages/);assert.match(api,/durable:true/);assert.doesNotMatch(api,/provider:/);assert.doesNotMatch(api,/error:error\?\.message/);
const providerCall=api.indexOf('const generated=await generateExternalImages'),claimIndex=api.indexOf('claimRequest(admin'),durableIndex=api.indexOf('persistGeneratedImages({admin',providerCall),firstModelResponse=api.indexOf('replayed:false,durable:true',durableIndex);assert.ok(claimIndex>=0&&providerCall>claimIndex);assert.ok(durableIndex>providerCall&&firstModelResponse>durableIndex);assert.match(gateway,/IMAGE_GENERATION_OUTPUT_HOST_ALLOWLIST/);assert.match(gateway,/isApprovedImageOutputUrl/);assert.match(persistence,/storage\.from\("user-assets"\)\.upload/);assert.match(persistence,/rawPrivateAssetsReusableAcrossCustomers:false/);

// Local fallback never embeds customer free text; manual save remains owner-scoped.
assert.match(api,/function localAvatarSvg/);const localStart=api.indexOf('function localAvatarSvg'),localEnd=api.indexOf('\nasync function readRequest',localStart);assert.ok(localStart>=0&&localEnd>localStart);const localSvgSource=api.slice(localStart,localEnd);assert.doesNotMatch(localSvgSource,/\$\{idea\}/);assert.doesNotMatch(localSvgSource,/Customer description/);
assert.match(save,/auth\.getUser\(\)/);assert.match(save,/storagePath=`\$\{user\.id\}\//);assert.match(save,/sanitizeSvg/);assert.match(assetMigration,/asset_library_user_fingerprint_unique_idx/);assert.match(assetMigration,/rawPrivateAssetsReusableAcrossCustomers/);assert.match(replayMigration,/unique \(user_id, request_id\)/i);assert.match(replayMigration,/service_role/i);

console.log('AI Avatar Full-System contract passed: layers 1-8 lock Living Character v3 renderer/surface, audio-clock voice sync, 52-channel face, body gestures, owner-scoped persistence, cross-device continuity, Agent/memory boundaries, session v2 orchestration and fail-closed Production trust while real 3D/TTS/device evidence remain truthfully LIVE PENDING.');
