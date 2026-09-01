import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('app/image-studio/page.js');
const generate=read('app/api/images/generate/route.js');
const save=read('app/api/images/save/route.js');
const gateway=read('lib/ai/image-generation-gateway.js');
const placement=read('lib/ai/image-placement-policy.js');
const assetMigration=read('supabase/migrations/20260901124338_harden_upload_reference_asset_contract.sql');

// Customer surface: bounded prompt, stable IDs, same-origin requests, honest model/local labeling and private persistence.
assert.match(page,/maxLength=\{4000\}/);
assert.match(page,/newRequestId\("image"\)/);
assert.match(page,/newRequestId\("image-save"\)/);
assert.match(page,/fetch\("\/api\/images\/generate"/);
assert.match(page,/fetch\("\/api\/images\/save"/);
assert.match(page,/credentials:"same-origin"/);
assert.match(page,/cache:"no-store"/);
assert.match(page,/Save to Library/);
assert.match(page,/private Asset Library/);
assert.match(page,/no model output was claimed/);
assert.match(page,/item\.source==="model"\?"Model":"Local"/);

// Generate: authenticated + verified, bounded/replay-safe, placement-aware, credit-aware model path and fail-closed refund/fallback.
assert.match(generate,/auth\.getUser\(\)/);
assert.match(generate,/confirmed_at/);
assert.match(generate,/MAX_REQUEST_BYTES=32\*1024/);
assert.match(generate,/REQUEST_ID=\/\^\[a-zA-Z0-9\._:-\]/);
assert.match(generate,/prompt\.length>4000/);
assert.match(generate,/Math\.min\(4,Math\.max\(1/);
assert.match(generate,/STYLES=new Set/);
assert.match(generate,/PALETTES=new Set/);
assert.match(generate,/getImagePlacementPolicy\(mode\)/);
assert.match(generate,/buildImagePlacementPrompt\(prompt,mode\)/);
assert.match(generate,/if\(mode!=="icon"&&gateway\.configured\)/);
assert.match(generate,/consumeAiCredits\(user\.id/);
assert.match(generate,/refundAiCredits\(user\.id/);
assert.match(generate,/source:"model"/);
assert.match(generate,/source:"local"/);
assert.match(generate,/modelFallback:Boolean\(modelFailureCode\)/);
assert.match(generate,/return noStore\(\{error:"Unable to generate image right now\."\},500\)/);
assert.doesNotMatch(generate,/return noStore\(\{error:error\?\.message/);

// Gateway: selected runtime only, bounded timeout/output, output-host allowlist before browser display, provider errors hidden.
assert.match(gateway,/assertRuntimeUrlAllowed/);
assert.match(gateway,/timeoutMs: 45000/);
assert.match(gateway,/maxDataImageLength: 8 \* 1024 \* 1024/);
assert.match(gateway,/maxCount: 4/);
assert.match(gateway,/maxDimension: 8192/);
assert.match(gateway,/IMAGE_GENERATION_OUTPUT_HOST_ALLOWLIST/);
assert.match(gateway,/isApprovedImageOutputUrl/);
assert.match(gateway,/url\.protocol !== "https:" \|\| url\.username \|\| url\.password/);
assert.match(gateway,/return isApprovedImageOutputUrl\(image\) \? image : null/);
assert.match(gateway,/data:image\\\/\(\?:png\|jpeg\|webp\);base64/);
assert.match(gateway,/redirect: "error"/);
assert.match(gateway,/cache: "no-store"/);
assert.match(gateway,/The connected image runtime rejected the request/);
assert.doesNotMatch(gateway,/data\?\.error \|\| data\?\.message/);

// Save: authenticated private user storage, strict binary/SVG validation, SSRF/output-host control and fingerprint replay safety.
assert.match(save,/auth\.getUser\(\)/);
assert.match(save,/MAX_REQUEST_BYTES=9\*1024\*1024/);
assert.match(save,/MAX_IMAGE_BYTES=8\*1024\*1024/);
assert.match(save,/imageSignatureMatches/);
assert.match(save,/89504e470d0a1a0a/);
assert.match(save,/buffer\[0\]===0xff&&buffer\[1\]===0xd8/);
assert.match(save,/toString\("ascii"\)==="RIFF"/);
assert.match(save,/toString\("ascii"\)==="WEBP"/);
assert.match(save,/sanitizeSvg/);
assert.match(save,/<script\|<foreignObject\|<iframe\|<object\|<embed\|javascript:/);
assert.match(save,/IMAGE_GENERATION_OUTPUT_HOST_ALLOWLIST/);
assert.match(save,/url\.protocol!=="https:"\|\|url\.username\|\|url\.password/);
assert.match(save,/setTimeout\(\(\)=>controller\.abort\(\),20000\)/);
assert.match(save,/createHash\("sha256"\)/);
assert.match(save,/\.eq\("user_id",user\.id\)\.eq\("content_fingerprint",fingerprint\)/);
assert.match(save,/storagePath=`\$\{user\.id\}\//);
assert.match(save,/storage\.from\("user-assets"\)\.upload/);
assert.match(save,/user_id:user\.id/);
assert.match(save,/reusableAcrossUsers:false/);
assert.match(save,/rawPrivateAssetsReusableAcrossCustomers:false/);
assert.match(save,/String\(dbError\.code\|\|""\)==="23505"/);
assert.match(save,/Cache-Control":"private, no-store/);

// Database safety inherited by every saved Image Studio asset.
assert.match(assetMigration,/asset_library_user_fingerprint_unique_idx/);
assert.match(assetMigration,/user_id, content_fingerprint/);
assert.match(assetMigration,/reusableAcrossUsers/);
assert.match(assetMigration,/rawPrivateAssetsReusableAcrossCustomers/);
assert.match(assetMigration,/revoke insert, update, delete on table public\.asset_library from anon/i);

// Placement contract must explicitly cover every Image Studio output type with responsive crop guidance.
for(const mode of ['wallpaper','background','hero','product','icon','image'])assert.match(placement,new RegExp(`${mode}:\\{usage:`));
assert.match(placement,/mobileCrop/);
assert.match(placement,/safeArea/);
assert.match(placement,/Do not add text unless the customer explicitly requests it/);

// Run exported gateway policy against hostile/approved output URLs, not only source-shape checks.
process.env.IMAGE_GENERATION_ENDPOINT='https://images.example.test/v1/generate';
process.env.IMAGE_GENERATION_OUTPUT_HOST_ALLOWLIST='cdn.example.test';
const gatewayModule=await import(`${pathToFileURL(path.join(root,'lib/ai/image-generation-gateway.js')).href}?contract=${Date.now()}`);
assert.equal(gatewayModule.isApprovedImageOutputUrl('https://images.example.test/output/a.png'),true);
assert.equal(gatewayModule.isApprovedImageOutputUrl('https://cdn.example.test/output/a.webp'),true);
assert.equal(gatewayModule.isApprovedImageOutputUrl('https://evil.example.test/track.png'),false);
assert.equal(gatewayModule.isApprovedImageOutputUrl('http://cdn.example.test/output/a.png'),false);
assert.equal(gatewayModule.isApprovedImageOutputUrl('https://user:pass@cdn.example.test/a.png'),false);
assert.equal(gatewayModule.normalizeGeneratedImageValue('https://evil.example.test/track.png'),null);
assert.ok(gatewayModule.normalizeGeneratedImageValue('data:image/png;base64,iVBORw0KGgo='));
assert.equal(gatewayModule.normalizeGeneratedImageValue('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),null);

console.log('Image Studio contract passed: auth, bounded requests, honest model/local fallback, placement policy, approved output hosts, automatic credit refund and private signature-validated Asset Library persistence are locked.');
