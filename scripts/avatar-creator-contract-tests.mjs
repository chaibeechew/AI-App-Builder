import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('app/avatar-studio/page.js');
const api=read('app/api/avatar/generate/route.js');
const characterCore=read('lib/ai/avatar-character-core.js');
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

// Living Character core contract: deterministic states, transition graph, animation/voice/memory interfaces and mobile thermal profiles.
assert.match(characterCore,/laneriq\.living-character/);
for(const state of ['idle','listening','thinking','speaking','acting','success','concerned'])assert.match(characterCore,new RegExp(`"${state}"`));
assert.match(characterCore,/CHARACTER_TRANSITIONS/);
assert.match(characterCore,/canTransitionCharacter/);
assert.match(characterCore,/blendshape-v1/);
assert.match(characterCore,/viseme-timeline-v1/);
assert.match(characterCore,/target-vector-v1/);
assert.match(characterCore,/tts-stream-v1/);
assert.match(characterCore,/character-memory-v1/);
assert.match(characterCore,/laneriq-agent-action-v1/);
assert.match(characterCore,/ownerScoped:true/);
assert.match(characterCore,/optInPersistentMemory:true/);
assert.match(characterCore,/eco:\{targetFps:24/);
assert.match(characterCore,/balanced:\{targetFps:30/);
assert.match(characterCore,/performance:\{targetFps:60/);
assert.match(characterCore,/thermalPolicy:"reduce-before-hot"/);
assert.match(characterCore,/adaptiveThermal:true/);
assert.match(characterCore,/adaptiveBattery:true/);
assert.match(characterCore,/reducedMotionSupported:true/);
assert.match(characterCore,/realtime3DRenderer:false/);
assert.match(characterCore,/liveVoiceProvider:false/);
assert.match(characterCore,/motionGenerator:false/);

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

console.log('AI Avatar Creator contract passed: consent-safe generation, replay-safe recovery, durable private output, stable Living Character DNA, behavior states, provider-neutral voice/face/memory interfaces and adaptive mobile runtime profiles are locked.');
