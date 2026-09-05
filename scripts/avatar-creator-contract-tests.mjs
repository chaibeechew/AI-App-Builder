import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {buildLivingCharacterManifest} from '../lib/ai/avatar-character-core.js';
import {buildAvatarFaceFrame,createAvatarRuntimeState,normalizeVisemeTimeline,reduceAvatarRuntime,selectAvatarPerformanceProfile} from '../lib/ai/avatar-runtime-engine.js';
import {advanceAvatarFaceRuntime,buildFaceRigCommand,createAvatarFaceRuntime} from '../lib/ai/avatar-face-runtime.js';
import {appendAvatarVoiceChunk,buildAvatarVoiceProviderRequest,createAvatarVoiceStream,getAvatarVoicePlaybackFrame,interruptAvatarVoice} from '../lib/ai/avatar-voice-runtime.js';
import {buildAvatarRenderPacket,buildMobileAvatarSurfaceContract,createAvatarRendererPlan,shouldReplanAvatarRenderer} from '../lib/ai/avatar-renderer-adapter.js';
import {buildCharacterAgentActionEnvelope,buildCharacterAgentContext,buildCharacterMemoryWriteIntent,mapAgentPhaseToAvatarEvent} from '../lib/ai/avatar-agent-bridge.js';
import {appendLivingAvatarVoiceChunk,applyAgentUpdateToLivingAvatar,applyLivingAvatarEvent,createLivingAvatarSession,interruptLivingAvatarSpeech,tickLivingAvatarSession} from '../lib/ai/avatar-session-orchestrator.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('app/avatar-studio/page.js');
const api=read('app/api/avatar/generate/route.js');
const characterCore=read('lib/ai/avatar-character-core.js');
const runtimeEngine=read('lib/ai/avatar-runtime-engine.js');
const faceRuntimeSource=read('lib/ai/avatar-face-runtime.js');
const voiceRuntimeSource=read('lib/ai/avatar-voice-runtime.js');
const rendererSource=read('lib/ai/avatar-renderer-adapter.js');
const agentBridgeSource=read('lib/ai/avatar-agent-bridge.js');
const orchestratorSource=read('lib/ai/avatar-session-orchestrator.js');
const gateway=read('lib/ai/image-generation-gateway.js');
const persistence=read('lib/ai/image-output-persistence.js');
const save=read('app/api/images/save/route.js');
const assetMigration=read('supabase/migrations/20260901124338_harden_upload_reference_asset_contract.sql');
const replayMigration=read('supabase/migrations/20260903093000_image_generation_request_replay.sql');

// Customer surface: stable mobile request identity, consent, truthful source labels and already-durable model output.
assert.match(page,/AI Avatar Creator/);
assert.match(page,/LANERIQ AI CREATIVE STUDIO/);
assert.match(page,/← LANERIQ AI/);
assert.doesNotMatch(page,/AI BUILD APP&WEB/);
assert.doesNotMatch(page,/SOOLENAI CREATIVE STUDIO/);
assert.match(page,/useRef/);
assert.match(page,/generationRequestId\.current\|\|newRequestId\("avatar"\)/);
assert.match(page,/generationRequestId\.current=requestId/);
assert.match(page,/AVATAR_GENERATION_IN_PROGRESS/);
assert.match(page,/return postGeneration\(payload,attempt\+1\)/);
assert.match(page,/Retry will resume the same avatar request instead of creating a duplicate/);
assert.match(page,/maxLength=\{1200\}/);
assert.match(page,/newRequestId\("avatar-save"\)/);
assert.match(page,/fetch\("\/api\/avatar\/generate"/);
assert.match(page,/fetch\("\/api\/images\/save"/);
assert.match(page,/credentials:"same-origin"/);
assert.match(page,/cache:"no-store"/);
assert.match(page,/Fictional \/ Original/);
assert.match(page,/Based on Me/);
assert.match(page,/Person With Permission/);
assert.match(page,/consentConfirmed/);
assert.match(page,/Saved to Private Library/);
assert.match(page,/already secured in your private Asset Library/);
assert.match(page,/source==="model"\?"AI model output":"Local visual concept"/);
assert.match(page,/min-height:44px/);
assert.match(page,/font-size:16px/);

// Living Character customer controls and truthful phased readiness.
for(const control of ['Persona','Voice direction','Motion profile','Character language'])assert.match(page,new RegExp(control));
assert.match(page,/Create Living Avatar/);
assert.match(page,/LIVING CHARACTER CORE/);
assert.match(page,/Behavior state preview/);
assert.match(page,/Real face\/body animation attaches to the same state machine in the renderer phase/);
assert.match(page,/Voice and real-time 3D are capability contracts in this phase, not falsely presented as active providers/);
assert.match(page,/setDemoState/);
assert.match(page,/result\?\.character/);
assert.match(page,/character\.characterId/);
assert.match(page,/character\.runtime\?\.profiles\?\.balanced/);

// Server API: verified auth, bounded request, likeness policy and one server-only replay claim before any provider execution.
assert.match(api,/auth\.getUser\(\)/);
assert.match(api,/confirmed_at/);
assert.match(api,/createAdminClient/);
assert.match(api,/MAX_REQUEST_BYTES=24\*1024/);
assert.match(api,/REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(api,/STALE_PENDING_MS=90\*1000/);
assert.match(api,/requestHash\(/);
assert.match(api,/image_generation_requests/);
assert.match(api,/claimRequest\(admin/);
assert.match(api,/AVATAR_REQUEST_ID_CONFLICT/);
assert.match(api,/AVATAR_RETRY_NEW_ID/);
assert.match(api,/AVATAR_GENERATION_IN_PROGRESS/);
assert.match(api,/claim\.state==="replay"/);
assert.match(api,/clean\(body\?\.idea,1200\)/);
for(const type of ['profile','game','npc','presenter','mascot'])assert.match(api,new RegExp(`"${type}"`));
for(const style of ['cinematic','3d','cartoon','fantasy','minimal','realistic'])assert.match(api,new RegExp(`"${style}"`));
assert.match(api,/LIKENESS_MODES=new Set\(\["fictional","self","consented_person"\]\)/);
assert.match(api,/likenessMode!=="fictional"&&!consentConfirmed/);
assert.match(api,/Confirm that you have permission to create this real-person likeness/);
assert.match(api,/Do not infer sensitive personal attributes or identity facts/);
assert.match(api,/Do not imitate a celebrity, public figure, copyrighted character or third-party mascot/);
assert.match(api,/rawReferenceStored:false/);
assert.match(api,/Cache-Control":"private, no-store/);

// Living Character API: stable identity, normalized character options and provider-neutral manifest on every success/fallback/replay path.
assert.match(api,/avatar-character-core\.js/);
assert.match(api,/normalizeCharacterOptions/);
assert.match(api,/buildLivingCharacterManifest/);
assert.match(api,/function buildCharacterId/);
assert.match(api,/characterId=buildCharacterId/);
assert.match(api,/continuityKey:hash\.slice\(0,32\)/);
assert.match(api,/character,replayed:true/);
assert.match(api,/character,replayed:false/);
assert.match(api,/characterId/);

// Living Character v2 contract: stable DNA plus implemented local runtime layers while external providers stay truthful.
assert.match(characterCore,/CHARACTER_SCHEMA_VERSION=2/);
assert.match(characterCore,/laneriq\.living-character/);
for(const state of ['idle','listening','thinking','speaking','acting','success','concerned'])assert.match(characterCore,new RegExp(`"${state}"`));
assert.match(characterCore,/CHARACTER_TRANSITIONS/);
assert.match(characterCore,/canTransitionCharacter/);
assert.match(characterCore,/blendshape-v1/);
assert.match(characterCore,/procedural-face-runtime-v1/);
assert.match(characterCore,/viseme-timeline-v1/);
assert.match(characterCore,/tts-stream-v1/);
assert.match(characterCore,/laneriq-avatar-renderer-v1/);
assert.match(characterCore,/laneriq-mobile-avatar-surface-v1/);
assert.match(characterCore,/character-memory-v1/);
assert.match(characterCore,/laneriq-agent-action-v1/);
assert.match(characterCore,/laneriq-living-avatar-session-v1/);
assert.match(characterCore,/userConfirmedWrites:true/);
assert.match(characterCore,/sensitiveMemoryBlocked:true/);
assert.match(characterCore,/eco:\{targetFps:24/);
assert.match(characterCore,/balanced:\{targetFps:30/);
assert.match(characterCore,/performance:\{targetFps:60/);
assert.match(characterCore,/proceduralFaceRuntime:true/);
assert.match(characterCore,/streamingVoiceRuntime:true/);
assert.match(characterCore,/voiceBargeInRuntime:true/);
assert.match(characterCore,/adaptiveRendererAdapter:true/);
assert.match(characterCore,/agentMemoryBridge:true/);
assert.match(characterCore,/sessionOrchestrator:true/);
assert.match(characterCore,/realtime3DRenderer:false/);
assert.match(characterCore,/liveVoiceProvider:false/);
assert.match(characterCore,/motionGenerator:false/);

// Executable base runtime: event state transitions, mobile profile selection, viseme normalization and renderer-neutral face frames.
assert.match(runtimeEngine,/AVATAR_RUNTIME_EVENTS/);
assert.match(runtimeEngine,/USER_SPEECH_START:"listening"/);
assert.match(runtimeEngine,/AI_RESPONSE_START:"speaking"/);
assert.match(runtimeEngine,/ACTION_ERROR:"concerned"/);
assert.match(runtimeEngine,/selectAvatarPerformanceProfile/);
assert.match(runtimeEngine,/normalizeVisemeTimeline/);
assert.match(runtimeEngine,/buildAvatarFaceFrame/);
const manifest=buildLivingCharacterManifest({characterId:'lc_contract',type:'game',style:'3d',persona:'confident',voiceStyle:'warm',motionProfile:'expressive',language:'en',continuityKey:'contract'});
assert.equal(manifest.schemaVersion,2);
assert.equal(manifest.characterId,'lc_contract');
assert.equal(manifest.dna.persona,'confident');
assert.equal(manifest.runtime.defaultProfile,'balanced');
assert.equal(manifest.readiness.proceduralFaceRuntime,true);
assert.equal(manifest.readiness.liveVoiceProvider,false);
let runtime=createAvatarRuntimeState(manifest);
assert.equal(runtime.state,'idle');
runtime=reduceAvatarRuntime(runtime,'USER_SPEECH_START');assert.equal(runtime.state,'listening');assert.equal(runtime.listening,true);
runtime=reduceAvatarRuntime(runtime,'USER_SPEECH_END');assert.equal(runtime.state,'thinking');assert.equal(runtime.emotion,'focused');
runtime=reduceAvatarRuntime(runtime,'AI_RESPONSE_START',{emotion:'warm'});assert.equal(runtime.state,'speaking');assert.equal(runtime.speaking,true);assert.equal(runtime.emotion,'warm');
runtime=reduceAvatarRuntime(runtime,'AI_RESPONSE_END');assert.equal(runtime.state,'idle');
assert.equal(selectAvatarPerformanceProfile({thermalState:'serious',batteryLevel:.9,deviceTier:'high'}),'eco');
assert.equal(selectAvatarPerformanceProfile({thermalState:'nominal',batteryLevel:.8,deviceTier:'high'}),'performance');
assert.equal(selectAvatarPerformanceProfile({thermalState:'fair',batteryLevel:.8,deviceTier:'mid'}),'balanced');
const visemes=normalizeVisemeTimeline([{atMs:900,viseme:'aa',weight:2},{atMs:100,viseme:'mbp',weight:.5},{atMs:500,viseme:'unknown',weight:1}],{durationMs:1000});
assert.deepEqual(visemes.map(item=>item.atMs),[100,500,900]);assert.equal(visemes[1].viseme,'sil');assert.equal(visemes[2].weight,1);
const face=buildAvatarFaceFrame({state:'speaking',emotion:'warm',viseme:'aa',visemeWeight:1,gazeX:2,blink:.25});
assert.equal(face.channels['jaw-open'],.7);assert.equal(face.channels['eye-look-x'],1);assert.equal(face.channels['blink-left'],.25);assert.ok(face.channels['mouth-smile']>0);

// Procedural face runtime: deterministic blink/gaze/head micro motion with a bounded face-rig command.
assert.match(faceRuntimeSource,/createAvatarFaceRuntime/);
assert.match(faceRuntimeSource,/advanceAvatarFaceRuntime/);
assert.match(faceRuntimeSource,/normalizeAttentionTarget/);
assert.match(faceRuntimeSource,/buildFaceRigCommand/);
let faceRuntime=createAvatarFaceRuntime(manifest,{nowMs:0});
faceRuntime=advanceAvatarFaceRuntime(faceRuntime,{nowMs:3000,behaviorState:'listening',emotion:'warm',attentionTarget:{x:.8,y:-.3,confidence:1,kind:'user'}});
assert.equal(faceRuntime.characterId,manifest.characterId);
assert.ok(faceRuntime.frame.channels['eye-look-x']>0);
const rig=buildFaceRigCommand(faceRuntime.frame,{maxChannels:8});
assert.equal(rig.contract,'blendshape-v1');assert.ok(rig.channels.length<=8);

// Streaming voice runtime: replay-safe chunks, viseme playback, provider-neutral request and user barge-in.
assert.match(voiceRuntimeSource,/createAvatarVoiceStream/);
assert.match(voiceRuntimeSource,/appendAvatarVoiceChunk/);
assert.match(voiceRuntimeSource,/interruptAvatarVoice/);
assert.match(voiceRuntimeSource,/buildAvatarVoiceProviderRequest/);
let voice=createAvatarVoiceStream({sessionId:'voice-contract',language:'en',style:'warm'});
voice=appendAvatarVoiceChunk(voice,{chunkId:'c1',startMs:0,durationMs:1000,visemes:[{atMs:0,viseme:'aa',weight:.8},{atMs:500,viseme:'mbp',weight:.7}],final:true});
const voiceReplay=appendAvatarVoiceChunk(voice,{chunkId:'c1',startMs:0,durationMs:1000,visemes:[]});assert.equal(voiceReplay.replayedChunkId,'c1');
const voiceFrame=getAvatarVoicePlaybackFrame(voice,{playbackMs:250});assert.equal(voiceFrame.speaking,true);assert.equal(voiceFrame.viseme,'aa');
assert.equal(getAvatarVoicePlaybackFrame(voice,{playbackMs:1200}).finished,true);
const providerRequest=buildAvatarVoiceProviderRequest(manifest,{text:'Hello there',requestId:'voice:req:1'});assert.equal(providerRequest.contract,'tts-stream-v1');assert.equal(providerRequest.providerIdentityExposed,false);
const interrupted=interruptAvatarVoice(voice,{atMs:300});assert.equal(getAvatarVoicePlaybackFrame(interrupted,{playbackMs:400}).interrupted,true);

// Renderer adapter: device-aware LOD, bounded budgets and semantic motion render packets.
assert.match(rendererSource,/RENDERER_BUDGETS/);
assert.match(rendererSource,/createAvatarRendererPlan/);
assert.match(rendererSource,/buildAvatarRenderPacket/);
assert.match(rendererSource,/buildMobileAvatarSurfaceContract/);
const rendererPlan=createAvatarRendererPlan(manifest,{thermalState:'nominal',batteryLevel:.8,deviceTier:'high',viewportWidth:390,viewportHeight:844});
assert.equal(rendererPlan.profile,'performance');assert.equal(rendererPlan.renderer,'3d');assert.ok(rendererPlan.viewport.internalWidth>0);
const renderPacket=buildAvatarRenderPacket({plan:rendererPlan,runtimeState:{characterId:manifest.characterId,state:'speaking'},faceFrame:faceRuntime.frame,nowMs:3200});
assert.equal(renderPacket.contract,'laneriq-avatar-renderer-v1');assert.equal(renderPacket.semanticMotion,'speech-support');
assert.equal(shouldReplanAvatarRenderer(rendererPlan,{thermalState:'serious',batteryLevel:.8,deviceTier:'high'}),true);
const iosSurface=buildMobileAvatarSurfaceContract({platform:'ios'});assert.equal(iosSurface.continuousCharacterRendering,'in-app-only');

// Memory/Agent bridge: owner scope, explicit persistent opt-in, user-confirmed writes and sensitive-memory blocking.
assert.match(agentBridgeSource,/SAFE_MEMORY_CATEGORIES/);
assert.match(agentBridgeSource,/SENSITIVE_MEMORY_BLOCK/);
assert.match(agentBridgeSource,/avatarAuthority:"presentation-only"/);
assert.equal(mapAgentPhaseToAvatarEvent('action_success'),'ACTION_SUCCESS');
const agentContext=buildCharacterAgentContext({manifest,runtimeState:{state:'thinking',emotion:'focused'},persistentMemoryOptIn:true,persistentMemory:[{category:'preference',text:'Prefers concise summaries'},{category:'project',text:'API key secret should not persist'}]});
assert.equal(agentContext.memory.ownerScoped,true);assert.equal(agentContext.memory.persistent.length,1);
const memoryAllowed=buildCharacterMemoryWriteIntent({manifest,category:'preference',text:'Prefers concise summaries',persistentMemoryOptIn:true,userConfirmed:true});assert.equal(memoryAllowed.allowed,true);
const memoryBlocked=buildCharacterMemoryWriteIntent({manifest,category:'project',text:'My password is 1234',persistentMemoryOptIn:true,userConfirmed:true});assert.equal(memoryBlocked.allowed,false);
const actionEnvelope=buildCharacterAgentActionEnvelope({manifest,actionId:'a1',name:'open-project',args:{projectId:'p1'},requiresConfirmation:true});assert.equal(actionEnvelope.executionAuthority,'laneriq-agent');assert.equal(actionEnvelope.avatarAuthority,'presentation-only');

// Session orchestrator: one pure pipeline joins Agent state, streaming voice, face runtime and adaptive render packets.
assert.match(orchestratorSource,/createLivingAvatarSession/);
assert.match(orchestratorSource,/tickLivingAvatarSession/);
assert.match(orchestratorSource,/interruptLivingAvatarSpeech/);
let session=createLivingAvatarSession(manifest,{sessionId:'session-contract',nowMs:0,performanceSignals:{deviceTier:'mid',batteryLevel:.8}});
session=applyLivingAvatarEvent(session,'USER_SPEECH_START');assert.equal(session.runtime.state,'listening');
session=applyAgentUpdateToLivingAvatar(session,{phase:'understood'});assert.equal(session.runtime.state,'thinking');
session=appendLivingAvatarVoiceChunk(session,{chunkId:'s1',startMs:0,durationMs:600,visemes:[{atMs:0,viseme:'aa',weight:.8},{atMs:300,viseme:'ee',weight:.7}],final:true});
const tick=tickLivingAvatarSession(session,{nowMs:200,playbackMs:200,attentionTarget:{x:.4,y:0,confidence:1}});
assert.equal(tick.frame.state,'speaking');assert.equal(tick.frame.voice.speaking,true);assert.equal(tick.frame.render.contract,'laneriq-avatar-renderer-v1');
const stopped=interruptLivingAvatarSpeech(tick.session,{atMs:250});assert.equal(stopped.voice.interrupted,true);assert.notEqual(stopped.runtime.state,'speaking');

// Model path: billing/refund, durable private capture before browser response, replay from private assets and honest fallback.
assert.match(api,/getImageGenerationConfig\(\)/);
assert.match(api,/generateExternalImages/);
assert.match(api,/buildImagePlacementPrompt/);
assert.match(api,/consumeAiCredits\(user\.id/);
assert.match(api,/refundAiCredits\(user\.id/);
assert.match(api,/persistGeneratedImages/);
assert.match(api,/replayPersistedImages/);
assert.match(api,/completeRequest\(admin/);
assert.match(api,/failRequest\(admin/);
assert.match(api,/durable:true/);
assert.match(api,/source:"model"/);
assert.match(api,/source:"local"/);
assert.match(api,/explicitly labeled local concept/);
assert.match(api,/Provider identity and credentials remain server-side/);
assert.doesNotMatch(api,/provider:/);
assert.doesNotMatch(api,/error:error\?\.message/);
const providerCall=api.indexOf('const generated=await generateExternalImages');
const claimIndex=api.indexOf('claimRequest(admin');
const durableIndex=api.indexOf('persistGeneratedImages({admin',providerCall);
const firstModelResponse=api.indexOf('replayed:false,durable:true',durableIndex);
assert.ok(claimIndex>=0&&providerCall>claimIndex,'Avatar provider execution must be downstream of the replay claim.');
assert.ok(durableIndex>providerCall&&firstModelResponse>durableIndex,'Avatar provider bytes must be private/durable before first model response.');
assert.match(gateway,/IMAGE_GENERATION_OUTPUT_HOST_ALLOWLIST/);
assert.match(gateway,/isApprovedImageOutputUrl/);
assert.match(gateway,/redirect: "error"/);
assert.match(persistence,/storage\.from\("user-assets"\)\.upload/);
assert.match(persistence,/createSignedUrl/);
assert.match(persistence,/reusableAcrossUsers:false/);
assert.match(persistence,/rawPrivateAssetsReusableAcrossCustomers:false/);

// Local fallback is a real, bounded original SVG concept and never embeds customer free text.
assert.match(api,/function localAvatarSvg/);
assert.match(api,/ORIGINAL \$\{style\.toUpperCase\(\)\} CONCEPT/);
const localStart=api.indexOf('function localAvatarSvg');
const localEnd=api.indexOf('\nasync function readRequest',localStart);
assert.ok(localStart>=0&&localEnd>localStart);
const localSvgSource=api.slice(localStart,localEnd);
assert.doesNotMatch(localSvgSource,/\$\{idea\}/);
assert.doesNotMatch(localSvgSource,/Customer description/);

// Manual local saving inherits private owner storage; provider output is already saved before display.
assert.match(save,/auth\.getUser\(\)/);
assert.match(save,/storagePath=`\$\{user\.id\}\//);
assert.match(save,/storage\.from\("user-assets"\)\.upload/);
assert.match(save,/createHash\("sha256"\)/);
assert.match(save,/sanitizeSvg/);
assert.match(save,/reusableAcrossUsers:false/);
assert.match(save,/rawPrivateAssetsReusableAcrossCustomers:false/);
assert.match(assetMigration,/asset_library_user_fingerprint_unique_idx/);
assert.match(assetMigration,/storage_path like \(user_id::text \|\| '\/%'\)/);
assert.match(assetMigration,/reusableAcrossUsers/);
assert.match(assetMigration,/rawPrivateAssetsReusableAcrossCustomers/);
assert.match(assetMigration,/revoke insert, update, delete on table public\.asset_library from anon/i);
assert.match(replayMigration,/create table if not exists public\.image_generation_requests/i);
assert.match(replayMigration,/unique \(user_id, request_id\)/i);
assert.match(replayMigration,/revoke all on table public\.image_generation_requests from public, anon, authenticated/i);
assert.match(replayMigration,/service_role/i);

console.log('AI Avatar Creator contract passed: Living Character Runtime v2 now locks stable DNA, executable behavior, procedural face/gaze, streaming viseme voice with barge-in, adaptive mobile renderer plans, owner-scoped memory/Agent boundaries and one orchestrated session pipeline while live providers remain truthfully disabled until connected.');
