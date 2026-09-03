import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REFERENCE_LIMITS, REFERENCE_IMAGE_MIME_TYPES, REFERENCE_VIDEO_MIME_TYPES, buildReferenceAssetIntelligence, buildReferenceBrief, referenceKindFromMime, sanitizeReferenceAnalysisInput, validateReferenceFileMeta } from '../lib/media/reference-policy.js';

const uploader = await readFile(new URL('../app/components/ReferenceUploader.js', import.meta.url), 'utf8');
const analyzeRoute = await readFile(new URL('../app/api/reference-analyze/route.js', import.meta.url), 'utf8');
const generateRoute = await readFile(new URL('../app/api/generate/route.js', import.meta.url), 'utf8');
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

assert.match(analyzeRoute,/createClient/);
assert.match(analyzeRoute,/supabase\.auth\.getUser\(\)/);
assert.match(analyzeRoute,/REFERENCE_LIMITS\.maxRequestBytes/);
assert.match(analyzeRoute,/sanitizeReferenceAnalysisInput\(body\.references\)/);
assert.match(analyzeRoute,/rawBytesRetained:false/);
assert.match(analyzeRoute,/reusableAcrossUsers:false/);
assert.match(analyzeRoute,/Cache-Control","private, no-store, max-age=0/);
assert.doesNotMatch(analyzeRoute,/GEMINI_API_KEY|OPENROUTER_API_KEY|Authorization:\s*`Bearer/);

assert.match(uploader,/validateReferenceFileMeta/);
assert.match(uploader,/REFERENCE_LIMITS\.maxTotalSourceBytes/);
assert.match(uploader,/REFERENCE_LIMITS\.maxAnalysisBase64Chars/);
assert.match(uploader,/supabase\.auth\.getUser\(\)/);
assert.match(uploader,/throw new Error\("Authentication required\."\)/);
assert.match(uploader,/fetch\("\/api\/reference-analyze"/);
assert.match(uploader,/credentials\s*:\s*"same-origin"/);
assert.match(uploader,/cache\s*:\s*"no-store"/);
assert.match(uploader,/storage\.from\("user-assets"\)\.upload/);
assert.match(uploader,/\.eq\("user_id",\s*user\.id\)\.eq\("content_fingerprint",\s*fingerprint\)/);
assert.match(uploader,/content_fingerprint\s*:\s*fingerprint/);
assert.match(uploader,/reusableAcrossUsers\s*:\s*false/);
assert.match(uploader,/privateCustomerAsset\s*:\s*true/);
assert.match(uploader,/soolenPendingAssetIds/);
assert.match(uploader,/soolenReferenceAnalysis/);
assert.match(uploader,/URL\.revokeObjectURL/);
assert.doesNotMatch(uploader,/accept="image\/\*,video\/\*"/);

assert.match(generateRoute,/assetIds=Array\.isArray\(body\?\.assetIds\)/);
assert.match(generateRoute,/from\("asset_library"\)[\s\S]*\.eq\("user_id",user\.id\)\.in\("id",assetIds\)/);
assert.match(generateRoute,/from\("project_assets"\)\.upsert\(mediaAssignments/);
assert.match(generateRoute,/owner_id:user\.id/);
assert.match(generateRoute,/mediaPreferences:mediaAssignments/);

assert.match(migration,/revoke insert, update, delete on table public\.asset_library from anon/i);
assert.match(migration,/revoke insert, update, delete on table public\.project_assets from anon/i);
assert.match(migration,/create unique index if not exists asset_library_user_fingerprint_unique_idx/i);
assert.match(migration,/storage_path like \(user_id::text \|\| '\/%'\)/i);
assert.match(migration,/content_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'/i);
assert.match(migration,/reusableAcrossUsers/);
assert.match(migration,/rawPrivateAssetsReusableAcrossCustomers/);
assert.match(migration,/validate constraint asset_library_reference_safety_check/i);

console.log('✓ Upload Ref has exact MIME, file-count, source-size and compact-analysis payload bounds');
console.log('✓ Missing reference analysis endpoint is restored with server auth and no-store private processing');
console.log('✓ Private files save only to the current user folder/library and duplicate fingerprints are replay safe');
console.log('✓ Generate re-validates asset ownership before mapping references into the new project');
console.log('✓ Database contract blocks anonymous writes and cross-customer private-reference reuse flags');
