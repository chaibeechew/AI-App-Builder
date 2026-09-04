import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CREATIVE_MEDIA_LIFECYCLE_STATES,CREATIVE_MEDIA_LIFECYCLE_TRUTH,
  buildCreativeMediaHistoryEntry,buildCreativeMediaUndoPlan,buildCreativeMediaRetryPlan,
  buildAssetLibraryHandoff,buildAppBuilderMediaInsertContract,buildCreativeMediaExportManifest,
  assessCreativeMediaLifecycleReadiness,
} from '../lib/ai/creative-media-lifecycle.js';

for(const state of ['draft','queued','running','completed','failed','blocked_by_policy','cancelled'])assert.ok(CREATIVE_MEDIA_LIFECYCLE_STATES.includes(state));
for(const truth of ['CODE_READY','CI_READY','PROVIDER_READY','PROVIDER_CONNECTED','LIVE_PROVIDER_VERIFIED','PRODUCTION_VERIFIED','REAL_OUTPUT_QUALITY_VERIFIED'])assert.ok(CREATIVE_MEDIA_LIFECYCLE_TRUTH.includes(truth));

const v1=buildCreativeMediaHistoryEntry({requestId:'image:req:1',task:'image.generate',modality:'image',assetIds:['asset-1'],prompt:'private customer prompt',truth:['CODE_READY'],quality:{score:94,decision:'accept',gatePassed:true},createdAt:'2026-09-04T00:00:00Z'});
assert.equal(v1.rawPromptStored,false);assert.equal(v1.signedUrlStored,false);assert.equal(v1.reusableAcrossUsers,false);assert.match(v1.promptHash,/^[0-9a-f]{64}$/);assert.match(v1.evidenceDigest,/^[0-9a-f]{64}$/);assert.equal(JSON.stringify(v1).includes('private customer prompt'),false);
const v2=buildCreativeMediaHistoryEntry({requestId:'image:req:2',task:'image.inpaint',modality:'image',assetIds:['asset-2'],parentAssetIds:['asset-1'],retryOf:'image:req:1',promptHash:v1.promptHash,versionNo:2});
const undo=buildCreativeMediaUndoPlan([v1,v2],'image:req:2');assert.equal(undo.ok,true);assert.deepEqual(undo.restoreAssetIds,['asset-1']);assert.equal(undo.destructiveDelete,false);
assert.equal(buildCreativeMediaRetryPlan(v2,{sameProviderAvailable:true,costAllowed:true}).strategy,'same-provider-regenerate');
assert.equal(buildCreativeMediaRetryPlan(v2,{sameProviderAvailable:false,fallbackAvailable:true,costAllowed:true}).strategy,'provider-fallback');
assert.equal(buildCreativeMediaRetryPlan(v2,{costAllowed:false}).code,'MEDIA_RETRY_COST_POLICY_BLOCKED');

const handoff=buildAssetLibraryHandoff({projectId:'project-1',assetId:'asset-2',suggestedPage:'home',suggestedRole:'hero'});assert.equal(handoff.ownerValidationRequired,true);assert.equal(handoff.assetOwnershipValidationRequired,true);assert.equal(handoff.projectOwnershipValidationRequired,true);assert.equal(handoff.storesSignedUrl,false);
const insert=buildAppBuilderMediaInsertContract({projectId:'project-1',assetId:'asset-2',suggestedPage:'home',suggestedRole:'hero'});assert.equal(insert.contract,'LANERIQ_MEDIA_ASSET_INSERT_V1');assert.ok(insert.allowedTargets.includes('game'));assert.equal(insert.appBuilderCoreMutation,false);
const manifest=buildCreativeMediaExportManifest({projectId:'project-1',assets:[{id:'asset-2',mimeType:'image/png',fileName:'hero.png',fileSize:1024,contentFingerprint:'a'.repeat(64)}]});assert.equal(manifest.assetCount,1);assert.equal(manifest.signedUrlsExcluded,true);assert.equal(manifest.providerCredentialsExcluded,true);assert.match(manifest.manifestDigest,/^[0-9a-f]{64}$/);
const readiness=assessCreativeMediaLifecycleReadiness();assert.equal(readiness.codeScore,100);assert.equal(readiness.codeReady,true);assert.equal(readiness.productionComplete,false);assert.equal(readiness.liveProviderVerified,false);

const adapter=fs.readFileSync('lib/ai/creative-media-lifecycle-adapter.js','utf8');
for(const pattern of [/auth\.getUser\(\)/,/confirmed_at/,/asset_library/,/\.eq\('user_id',principal\.userId\)/,/apps/,/\.eq\('owner_id',userId\)/,/project_assets/,/onConflict:'app_id,asset_id'/,/signedUrl:null/,/reusableAcrossUsers:false/,/rawPrivateAssetsReusableAcrossCustomers:false/])assert.match(adapter,pattern);
assert.doesNotMatch(adapter,/createSignedUrl/);assert.doesNotMatch(adapter,/service_role/);

const imagePersistence=fs.readFileSync('lib/ai/image-output-persistence.js','utf8');
for(const pattern of [/resolveOwnedParentIds/,/\.eq\("user_id",userId\)\.in\("id",input\)/,/IMAGE_LINEAGE_OWNER_MISMATCH/,/lifecycleVersion:1/,/parentAssetIds/,/retryOf:life\.retryOf/,/supersedes:life\.supersedes/,/promptHash:life\.promptHash/,/evidenceDigest:life\.evidenceDigest/,/rawPromptStored:false/])assert.match(imagePersistence,pattern);
const videoPersistence=fs.readFileSync('lib/video/output-persistence.js','utf8');
for(const pattern of [/resolveOwnedParentIds/,/\.eq\("user_id",userId\)\.in\("id",input\)/,/VIDEO_LINEAGE_OWNER_MISMATCH/,/lifecycleVersion:1/,/parentAssetIds/,/retryOf:life\.retryOf/,/supersedes:life\.supersedes/,/promptHash:life\.promptHash/,/evidenceDigest:life\.evidenceDigest/,/rawPromptStored:false/])assert.match(videoPersistence,pattern);

const historyRoute=fs.readFileSync('app/api/media/history/route.js','utf8');assert.match(historyRoute,/Cache-Control':'private, no-store/);assert.match(historyRoute,/rawPromptReturned:false/);assert.match(historyRoute,/signedUrlReturned:false/);
const projectRoute=fs.readFileSync('app/api/media/project-assets/route.js','utf8');assert.match(projectRoute,/MAX_REQUEST_BYTES=16\*1024/);assert.match(projectRoute,/ownerValidated:true/);assert.match(projectRoute,/destructiveAssetDelete:false/);assert.doesNotMatch(projectRoute,/storage_path/);
const exportRoute=fs.readFileSync('app/api/media/export-manifest/route.js','utf8');assert.match(exportRoute,/signedUrlsExcluded:true/);assert.match(exportRoute,/providerCredentialsExcluded:true/);assert.match(exportRoute,/rawPromptsExcluded:true/);

console.log('Creative media lifecycle integration contract tests passed.');
