import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('app/avatar-studio/page.js');
const api=read('app/api/avatar/generate/route.js');
const gateway=read('lib/ai/image-generation-gateway.js');
const save=read('app/api/images/save/route.js');
const assetMigration=read('supabase/migrations/20260901124338_harden_upload_reference_asset_contract.sql');

// Customer surface: canonical brand, bounded description, stable request IDs, explicit likeness declaration and private save.
assert.match(page,/AI Avatar Creator/);
assert.match(page,/← LANERIQ AI/);
assert.doesNotMatch(page,/AI BUILD APP&WEB/);
assert.match(page,/maxLength=\{1200\}/);
assert.match(page,/newRequestId\("avatar"\)/);
assert.match(page,/newRequestId\("avatar-save"\)/);
assert.match(page,/fetch\("\/api\/avatar\/generate"/);
assert.match(page,/fetch\("\/api\/images\/save"/);
assert.match(page,/credentials:"same-origin"/);
assert.match(page,/cache:"no-store"/);
assert.match(page,/Fictional \/ Original/);
assert.match(page,/Based on Me/);
assert.match(page,/Person With Permission/);
assert.match(page,/consentConfirmed/);
assert.match(page,/Save to Private Library/);
assert.match(page,/source==="model"\?"AI model output":"Local visual concept"/);

// Server API: auth + verified account, bounded request, allowlisted types/styles, real-person permission and safe server-side prompt policy.
assert.match(api,/auth\.getUser\(\)/);
assert.match(api,/confirmed_at/);
assert.match(api,/MAX_REQUEST_BYTES=24\*1024/);
assert.match(api,/REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]/);
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

// Model path: shared output-host security, billing, refund and honest provider-hidden local fallback.
assert.match(api,/getImageGenerationConfig\(\)/);
assert.match(api,/generateExternalImages/);
assert.match(api,/buildImagePlacementPrompt/);
assert.match(api,/consumeAiCredits\(user\.id/);
assert.match(api,/refundAiCredits\(user\.id/);
assert.match(api,/source:"model"/);
assert.match(api,/source:"local"/);
assert.match(api,/modelFallback:Boolean\(modelFailureCode\)/);
assert.match(api,/explicitly labeled local concept/);
assert.match(api,/Provider identity and credentials remain server-side/);
assert.doesNotMatch(api,/provider:/);
assert.doesNotMatch(api,/error:error\?\.message/);
assert.match(gateway,/IMAGE_GENERATION_OUTPUT_HOST_ALLOWLIST/);
assert.match(gateway,/isApprovedImageOutputUrl/);
assert.match(gateway,/redirect: "error"/);

// Local fallback is a real, bounded original SVG concept and never embeds customer free text.
assert.match(api,/function localAvatarSvg/);
assert.match(api,/ORIGINAL \$\{style\.toUpperCase\(\)\} CONCEPT/);
assert.doesNotMatch(api,/\$\{idea\}/);

// Saving inherits private owner storage, signature/SVG sanitization and cross-customer reuse blocks.
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

console.log('AI Avatar Creator contract passed: authenticated bounded generation, explicit likeness permission, provider-hidden cost-safe model routing, honest local fallback and private owner-scoped persistence are locked.');
