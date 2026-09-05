import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REFERENCE_LIMITS, REFERENCE_IMAGE_MIME_TYPES, REFERENCE_VIDEO_MIME_TYPES, buildReferenceAssetIntelligence, buildReferenceBrief, referenceKindFromMime, sanitizeReferenceAnalysisInput, validateReferenceFileMeta } from '../lib/media/reference-policy.js';
import { buildReferenceReusePlan, hasReusableReferenceIntelligence, normalizeReferenceFingerprint, referenceIntelligenceFromAsset } from '../lib/media/reference-reuse.js';

const uploader = await readFile(new URL('../app/components/ReferenceUploader.js', import.meta.url), 'utf8');
const analyzeRoute = await readFile(new URL('../app/api/reference-analyze/route.js', import.meta.url), 'utf8');
const generateRoute = await readFile(new URL('../app/api/generate/route.js', import.meta.url), 'utf8');
const builderDomain = await readFile(new URL('../lib/cloud/builder-projects.js', import.meta.url), 'utf8');
const builderAdapter = await readFile(new URL('../lib/cloud-adapters/builder-project-data.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260901124338_harden_upload_reference_asset_contract.sql', import.meta.url), 'utf8');

assert.equal(REFERENCE_LIMITS.maxFiles,8);
assert.equal(REFERENCE_LIMITS.maxImageBytes,12*1024*1024);
assert.equal(REFERENCE_LIMITS.maxVideoBytes,80*1024*1024);
assert.equal(REFERENCE_LIMITS.maxTotalSourceBytes,160*1024*1024);
assert.equal(REFERENCE_LIMITS.maxAnalysisReferences,12);
assert.ok(REFERENCE_LIMITS.maxRequestBytes<=8*1024*1024);
assert.ok(REFERENCE_IMAGE_MIME_TYPES.includes('image/heic'));
assert.ok(REFERENCE_VIDEO_MIME_TYPES.includes('video/quicktime'));
assert.equal(referenceKindFromMime('image/jpeg'),'image');
assert.equal(referenceKindFromMime('video/mp4'),'video');
assert.equal(referenceKindFromMime('text/html'),'unsupported');
assert.equal(validateReferenceFileMeta({mimeType:'image/jpeg',size:1024}).ok,true);
assert.equal(validateReferenceFileMeta({mimeType:'image/svg+xml',size:1024}).ok,false);
assert.equal(validateReferenceFileMeta({mimeType:'video/mp4',size:REFERENCE_LIMITS.maxVideoBytes+1}).ok,false);
const base64=Buffer.from('tiny-safe-reference').toString('base64');
const sanitized=sanitizeReferenceAnalysisInput([{mimeType:'image/jpeg',data:base64,sourceName:'brand-logo.jpg',kind:'image-or-sketch'}]);
assert.equal(sanitized.references.length,1);
assert.equal(sanitizeReferenceAnalysisInput([{mimeType:'text/html',data:base64,sourceName:'x'}]).references.length,0);
assert.equal(buildReferenceAssetIntelligence('brand-logo.jpg').role,'brand');
assert.match(buildReferenceBrief([buildReferenceAssetIntelligence('brand-logo.jpg')]),/never be reused across customers/i);

const fpA='a'.repeat(64);
const fpB='b'.repeat(64);
const existingAsset={id:'asset-1',file_name:'hero.jpg',mime_type:'image/jpeg',category:'image',content_fingerprint:fpA,intelligence:{role:'hero',description:'Customer-owned hero context',tags:['customer-owned'],suggestedSections:['Home'],confidence:.8}};
assert.equal(normalizeReferenceFingerprint(fpA.toUpperCase()),fpA);
assert.equal(normalizeReferenceFingerprint('not-a-fingerprint'),'');
assert.equal(hasReusableReferenceIntelligence(existingAsset),true);
assert.equal(referenceIntelligenceFromAsset(existingAsset).sourceName,'hero.jpg');
const reusePlan=buildReferenceReusePlan([
  {name:'hero.jpg',fingerprint:fpA},
  {name:'hero-copy.jpg',fingerprint:fpA},
  {name:'new.jpg',fingerprint:fpB},
],[existingAsset]);
assert.equal(reusePlan.reuseCount,1);
assert.equal(reusePlan.analysisCount,1);
assert.equal(reusePlan.duplicateSelectionCount,1);
assert.equal(reusePlan.allResolvedWithoutAnalysis,false);
assert.equal(reusePlan.privacy.crossUserReuseAllowed,false);
assert.equal(reusePlan.privacy.rawPrivateBytesShared,false);
const allReusePlan=buildReferenceReusePlan([{name:'hero.jpg',fingerprint:fpA}],[existingAsset]);
assert.equal(allReusePlan.allResolvedWithoutAnalysis,true);
assert.equal(allReusePlan.analysisCount,0);

assert.match(analyzeRoute,/createClient/);
assert.match(analyzeRoute,/supabase\.auth\.getUser\(\)/);
assert.match(analyzeRoute,/REFERENCE_LIMITS\.maxRequestBytes/);
assert.match(analyzeRoute,/sanitizeReferenceAnalysisInput\(body\.references\)/);
assert.match(analyzeRoute,/rawBytesRetained:false/);
assert.match(analyzeRoute,/reusableAcrossUsers:false/);
assert.match(analyzeRoute,/tier:"Z0_DETERMINISTIC"/);
assert.match(analyzeRoute,/externalProviderCalls:0/);
assert.match(analyzeRoute,/modelInferenceUsed:false/);
assert.match(analyzeRoute,/Cache-Control","private, no-store, max-age=0/);
assert.doesNotMatch(analyzeRoute,/GEMINI_API_KEY|OPENROUTER_API_KEY|Authorization:\s*`Bearer/);

assert.match(uploader,/validateReferenceFileMeta/);
assert.match(uploader,/REFERENCE_LIMITS\.maxTotalSourceBytes/);
assert.match(uploader,/REFERENCE_LIMITS\.maxAnalysisBase64Chars/);
assert.match(uploader,/supabase\.auth\.getUser\(\)/);
assert.match(uploader,/throw new Error\("Authentication required\."\)/);
assert.match(uploader,/buildReferenceReusePlan\(fingerprinted, existingAssets\)/);
assert.match(uploader,/\.in\("content_fingerprint", fingerprints\)/);
assert.match(uploader,/for \(const item of reusePlan\.analysisItems\)/);
assert.match(uploader,/if \(reusePlan\.analysisItems\.length\)/);
assert.match(uploader,/fetch\("\/api\/reference-analyze"/);
assert.match(uploader,/credentials\s*:\s*"same-origin"/);
assert.match(uploader,/cache\s*:\s*"no-store"/);
assert.match(uploader,/storage\.from\("user-assets"\)\.upload/);
assert.match(uploader,/\.eq\("user_id",\s*user\.id\)\.eq\("content_fingerprint",\s*fingerprint\)/);
assert.match(uploader,/content_fingerprint\s*:\s*fingerprint/);
assert.match(uploader,/reusableAcrossUsers\s*:\s*false/);
assert.match(uploader,/privateCustomerAsset\s*:\s*true/);
assert.match(uploader,/soolenReferenceReuseStats/);
assert.match(uploader,/duplicateSelectionsSkipped/);
assert.match(uploader,/crossUserReuseAllowed:\s*false/);
assert.match(uploader,/soolenPendingAssetIds/);
assert.match(uploader,/soolenReferenceAnalysis/);
assert.match(uploader,/URL\.revokeObjectURL/);
assert.doesNotMatch(uploader,/accept="image\/\*,video\/\*"/);

// Generate is provider-opaque: asset IDs cross LANERIQ Cloud, then the adapter re-authenticates and owner-scopes every asset read/write.
assert.match(generateRoute,/assetIds=Array\.isArray\(body\?\.assetIds\)/);
assert.match(generateRoute,/loadBuilderGenerationInputs\(\{assetIds\}\)/);
assert.match(generateRoute,/const brandKit=inputs\.brandKit\|\|null,ownedAssets=inputs\.ownedAssets\|\|\[\]/);
assert.match(generateRoute,/saveBuilderGeneratedProjectContext\(\{projectId:app\.id,assignments:mediaAssignments/);
assert.match(generateRoute,/mediaPreferences:mediaAssignments/);
assert.doesNotMatch(generateRoute,/from\("asset_library"\)|from\("project_assets"\)|lib\/supabase\/|@supabase\/|createAdminClient/);
assert.match(builderDomain,/loadBuilderGenerationInputs/);
assert.match(builderDomain,/saveBuilderGeneratedProjectContext/);
assert.match(builderAdapter,/async loadGenerationInputs/);
assert.match(builderAdapter,/resolvePrincipal\(client, \{ requireVerified: true \}\)/);
assert.match(builderAdapter,/from\("asset_library"\)\.select\("id,file_name,mime_type,category"\)\.eq\("user_id", userId\)\.in\("id", assetIds\)/);
const contextBlock=builderAdapter.slice(builderAdapter.indexOf('async saveGeneratedProjectContext'),builderAdapter.indexOf('async loadModificationContext'));
assert.match(contextBlock,/\.eq\("id", projectId\)\.eq\("owner_id", userId\)/);
assert.match(contextBlock,/owner_id: userId/);
assert.match(contextBlock,/from\("project_assets"\)\.upsert\(rows/);

assert.match(migration,/revoke insert, update, delete on table public\.asset_library from anon/i);
assert.match(migration,/revoke insert, update, delete on table public\.project_assets from anon/i);
assert.match(migration,/create unique index if not exists asset_library_user_fingerprint_unique_idx/i);
assert.match(migration,/storage_path like \(user_id::text \|\| '\/%'\)/i);
assert.match(migration,/content_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'/i);
assert.match(migration,/reusableAcrossUsers/);
assert.match(migration,/rawPrivateAssetsReusableAcrossCustomers/);
assert.match(migration,/validate constraint asset_library_reference_safety_check/i);

console.log('✓ Upload Ref has exact MIME, file-count, source-size and compact-analysis payload bounds');
console.log('✓ Same-user exact fingerprint reuse is planned before media compression/frame extraction, including duplicate-selection suppression');
console.log('✓ Reference analysis is authenticated, deterministic Z0 compute with zero external provider/model calls');
console.log('✓ Private files save only to the current user folder/library and duplicate fingerprints remain replay safe');
console.log('✓ Generate remains provider-opaque while LANERIQ Cloud re-authenticates, owner-scopes assets and binds project mappings');
console.log('✓ Database contract blocks anonymous writes and cross-customer private-reference reuse flags');
