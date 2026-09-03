import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('app/video-studio/page.js');
const storyboard=read('app/api/video/storyboard/route.js');
const projects=read('app/api/video/projects/route.js');
const compile=read('app/api/video/projects/[id]/compile/route.js');
const assetRoute=read('app/api/video/assets/[id]/route.js');
const readiness=read('app/api/video/readiness/route.js');
const gateway=read('lib/video/render-gateway.js');
const outputPersistence=read('lib/video/output-persistence.js');
const compute=read('lib/video/compute-policy.js');
const baseMigration=read('supabase/migrations/20260901130646_harden_video_generator_runtime_contract.sql');
const deliveryMigration=read('supabase/migrations/20260903015445_harden_video_renderer_delivery.sql');

// Customer surface: canonical brand, mobile-safe controls and stable request recovery across storyboard/project/compile.
assert.match(page,/LANERIQ AI · VIDEO STUDIO/);
assert.doesNotMatch(page,/AI BUILD APP & WEB · VIDEO STUDIO/);
assert.match(page,/useRef/);
assert.match(page,/maxLength=\{4000\}/);
assert.match(page,/newRequestId\("video-storyboard"\)/);
assert.match(page,/newRequestId\("video-project"\)/);
assert.match(page,/newRequestId\("video-compile"\)/);
assert.match(page,/storyboardRequestId\.current\|\|newRequestId/);
assert.match(page,/projectRequestId\.current\|\|newRequestId/);
assert.match(page,/compileRequestId\.current\|\|newRequestId/);
assert.match(page,/VIDEO_STORYBOARD_IN_PROGRESS/);
assert.match(page,/Retry will resume the same storyboard request instead of starting a duplicate/);
assert.match(page,/Retry will resume the same compile request instead of creating another version or renderer job/);
assert.match(page,/credentials:"same-origin"/);
assert.match(page,/cache:"no-store"/);
assert.match(page,/\/compile\?versionId=\$\{encodeURIComponent\(versionId\)\}/);
assert.doesNotMatch(page,/\/versions\/\$\{versionId\}/);
assert.match(page,/authorized server renderer accepted or already owns this replay-safe submission/);
assert.match(page,/<video controls playsInline preload="metadata"/);
assert.match(page,/Private Asset Library/);
assert.match(page,/font-size:16px/);
assert.match(page,/min-height:44px/);
assert.doesNotMatch(page,/plan\.provider/);
assert.doesNotMatch(page,/renderVersion\.provider/);

// Storyboard: authenticated/verified, exact-project memory, request ledger replay, credits and bounded output.
assert.match(storyboard,/auth\.getUser\(\)/);
assert.match(storyboard,/confirmed_at/);
assert.match(storyboard,/createAdminClient/);
assert.match(storyboard,/MAX_REQUEST_BYTES=24\*1024/);
assert.match(storyboard,/REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(storyboard,/cleanText\(body\?\.prompt,4000\)/);
assert.match(storyboard,/\.eq\("id",appId\)\.eq\("owner_id",user\.id\)/);
assert.match(storyboard,/project_memory/);
assert.match(storyboard,/video_storyboard_requests/);
assert.match(storyboard,/requestHash\(/);
assert.match(storyboard,/claimStoryboard\(/);
assert.match(storyboard,/VIDEO_STORYBOARD_REQUEST_CONFLICT/);
assert.match(storyboard,/VIDEO_STORYBOARD_IN_PROGRESS/);
assert.match(storyboard,/VIDEO_STORYBOARD_RETRY_NEW_ID/);
assert.match(storyboard,/Recovered the same storyboard request without running the AI provider twice/);
assert.match(storyboard,/consumeAiCredits\(user\.id/);
assert.match(storyboard,/refundAiCredits\(userId/);
assert.match(storyboard,/scenes\.slice\(0,20\)/);
assert.match(storyboard,/Math\.min\(maxClipSeconds/);
assert.match(storyboard,/Cache-Control":"private, no-store/);
assert.doesNotMatch(storyboard,/provider, storyboard/);
assert.doesNotMatch(storyboard,/error:error\?\.message/);
assert.ok(storyboard.indexOf('claimStoryboard(admin')<storyboard.indexOf('generateWithFallback(instruction)'),'Storyboard request must be claimed before AI provider execution.');

// Project persistence: stable request ID + hash, owner-bound app link and atomic service RPC replay.
assert.match(projects,/auth\.getUser\(\)/);
assert.match(projects,/createAdminClient/);
assert.match(projects,/MAX_REQUEST_BYTES=16\*1024/);
assert.match(projects,/REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(projects,/confirmed_at/);
assert.match(projects,/\.eq\("id",requestedAppId\)\.eq\("owner_id",user\.id\)/);
assert.match(projects,/\["9:16","16:9","1:1"\]\.includes/);
assert.match(projects,/hashRequest\(/);
assert.match(projects,/server_create_video_project_v2/);
assert.match(projects,/VIDEO_PROJECT_REQUEST_CONFLICT/);
assert.match(projects,/replayed:Boolean\(data\.replayed\)/);
assert.match(projects,/Cache-Control":"private, no-store/);

// Compile/render: owned assets, request hash, atomic version replay, one render claim, durable completion and refunds.
assert.match(compile,/MAX_REQUEST_BYTES=256\*1024/);
assert.match(compile,/REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(compile,/auth\.getUser\(\)/);
assert.match(compile,/confirmed_at/);
assert.match(compile,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(compile,/VIDEO_SOURCE_HOST_ALLOWLIST/);
assert.match(compile,/url\.protocol!=="https:"\|\|url\.username\|\|url\.password/);
assert.match(compile,/\.from\("asset_library"\)\.select\("id"\)\.eq\("user_id",userId\)/);
assert.match(compile,/requestHash\(/);
assert.match(compile,/server_create_video_version_v2/);
assert.match(compile,/server_claim_video_render_v2/);
assert.match(compile,/server_finalize_video_render_v2/);
assert.match(compile,/VIDEO_COMPILE_REQUEST_CONFLICT/);
assert.match(compile,/submissionClaimed/);
assert.match(compile,/will not start a second provider job/);
assert.match(compile,/consumeAiCredits\(user\.id/);
assert.match(compile,/refundAiCredits/);
assert.match(compile,/persistRenderedVideo/);
assert.match(compile,/providerOutputCaptured:true/);
assert.match(compile,/durableOutput:true/);
assert.match(compile,/private Asset Library/);
assert.match(compile,/rendererConfigured:false,renderStarted:false,jobAccepted:false/);
assert.match(compile,/does not claim that an MP4 is rendering or complete/);
assert.match(compile,/normalizeVideoOutputPath/);
assert.match(compile,/publicVersion/);
assert.doesNotMatch(compile,/provider:render\.provider/);
assert.doesNotMatch(compile,/provider:renderer\.provider/);
assert.doesNotMatch(compile,/error:renderError\?\.message/);
const claimIndex=compile.indexOf('server_claim_video_render_v2');
const providerIndex=compile.indexOf('startVideoRender({project');
const captureIndex=compile.indexOf('persistRenderedVideo({admin',providerIndex);
const completeIndex=compile.indexOf('renderStatus:"completed"',captureIndex);
assert.ok(claimIndex>=0&&providerIndex>claimIndex,'Renderer provider execution must happen only after an atomic render claim.');
assert.ok(captureIndex>providerIndex&&completeIndex>captureIndex,'Completed provider MP4 must be durably captured before the version is finalized completed.');

// Provider gateway: cost-aware allowlists plus downstream Idempotency-Key/request ID.
assert.match(gateway,/assertRuntimeUrlAllowed/);
assert.match(gateway,/renderTimeoutMs:45000/);
assert.match(gateway,/statusTimeoutMs:15000/);
assert.match(gateway,/VIDEO_RENDER_OUTPUT_HOST_ALLOWLIST/);
assert.match(gateway,/normalizeVideoOutputPath/);
assert.match(gateway,/JOB_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(gateway,/REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(gateway,/headers\["Idempotency-Key"\]=stable/);
assert.match(gateway,/idempotencyKey: stableRequestId/);
assert.match(gateway,/requestId: stableRequestId/);
assert.match(gateway,/durableCaptureRequired: true/);
assert.match(gateway,/redirect: "error"/);
assert.match(gateway,/cache: "no-store"/);
assert.match(gateway,/VIDEO_RENDER_COST_POLICY_BLOCKED/);
assert.match(gateway,/VIDEO_RENDER_INVALID_RESPONSE/);
assert.doesNotMatch(gateway,/data\?\.error \|\| data\?\.message/);

// Final MP4 persistence: approved output only, strict MP4 signature/size, private storage, fingerprint dedupe and stable asset route.
assert.match(outputPersistence,/MAX_VIDEO_BYTES=64\*1024\*1024/);
assert.match(outputPersistence,/subarray\(4,8\)\.toString\("ascii"\)==="ftyp"/);
assert.match(outputPersistence,/normalizeVideoOutputPath/);
assert.match(outputPersistence,/redirect:"error"/);
assert.match(outputPersistence,/cache:"no-store"/);
assert.match(outputPersistence,/content-length/);
assert.match(outputPersistence,/video\/mp4/);
assert.match(outputPersistence,/createHash\("sha256"\)/);
assert.match(outputPersistence,/storage\.from\("user-assets"\)\.upload/);
assert.match(outputPersistence,/category:"video"/);
assert.match(outputPersistence,/purpose:"video_render_output"/);
assert.match(outputPersistence,/reusableAcrossUsers:false/);
assert.match(outputPersistence,/rawPrivateAssetsReusableAcrossCustomers:false/);
assert.match(outputPersistence,/stablePath:`\/api\/video\/assets\/\$\{asset\.id\}`/);
assert.match(outputPersistence,/trusted\.has\(url\.hostname\.toLowerCase\(\)\)/);

// Stable private output route must re-check owner/type/purpose and only emit short signed URLs.
assert.match(assetRoute,/auth\.getUser\(\)/);
assert.match(assetRoute,/\.eq\("id",id\)\.eq\("user_id",user\.id\)/);
assert.match(assetRoute,/asset\.mime_type!=="video\/mp4"/);
assert.match(assetRoute,/asset\.intelligence\?\.purpose!=="video_render_output"/);
assert.match(assetRoute,/createSignedUrl\(asset\.storage_path,600/);
assert.match(assetRoute,/download:asset\.file_name/);
assert.match(assetRoute,/NextResponse\.redirect\(signed\.signedUrl,307\)/);
assert.match(assetRoute,/private, no-store, max-age=0/);

// Device policy keeps phones light and heavy final work server-side.
assert.match(compute,/mobile:[\s\S]*maxClipSeconds: 12/);
assert.match(compute,/mobile:[\s\S]*maxProjectSeconds: 60/);
assert.match(compute,/finalRenderLocation: "server"/);
for(const task of ['generation','upscale','denoise','complex-effects','final-encode','final-compile'])assert.match(compute,new RegExp(`"${task}"`));

// Database: original owner RLS plus v2 project/version request hashes, storyboard ledger, atomic render claim/finalize service RPCs.
assert.match(baseMigration,/video_versions_owner_project_request_unique_idx/);
assert.match(baseMigration,/pg_column_size\(edit_json\) <= 524288/);
assert.match(baseMigration,/revoke insert, update, delete, select on table public\.video_projects from anon/i);
assert.match(baseMigration,/revoke insert, update, delete, select on table public\.video_versions from anon/i);
assert.match(baseMigration,/revoke insert, update, delete, select on table public\.video_clips from anon/i);
assert.match(baseMigration,/asset_library a where a\.id = video_clips\.asset_id and a\.user_id = \(select auth\.uid\(\)\)/i);
assert.match(deliveryMigration,/add column if not exists source_request_id text/i);
assert.match(deliveryMigration,/video_projects_owner_request_unique_idx/);
assert.match(deliveryMigration,/source_request_hash/);
assert.match(deliveryMigration,/render_claim_token uuid/);
assert.match(deliveryMigration,/render_claimed_at timestamptz/);
assert.match(deliveryMigration,/output_asset_id uuid references public\.asset_library/i);
assert.match(deliveryMigration,/create table if not exists public\.video_storyboard_requests/i);
assert.match(deliveryMigration,/revoke all on table public\.video_storyboard_requests from public, anon, authenticated/i);
assert.match(deliveryMigration,/server_create_video_project_v2/);
assert.match(deliveryMigration,/server_create_video_version_v2/);
assert.match(deliveryMigration,/server_claim_video_render_v2/);
assert.match(deliveryMigration,/server_finalize_video_render_v2/);
assert.match(deliveryMigration,/for update/i);
assert.match(deliveryMigration,/video_completed_output_must_be_durable/);
assert.match(deliveryMigration,/video_output_asset_not_owned/);
assert.match(deliveryMigration,/set search_path = ''/i);
for(const fn of ['server_create_video_project_v2','server_create_video_version_v2','server_claim_video_render_v2','server_finalize_video_render_v2']){
  assert.match(deliveryMigration,new RegExp(`revoke all on function public\\.${fn}[\\s\\S]*from public,anon,authenticated`,'i'));
  assert.match(deliveryMigration,new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*to service_role`,'i'));
}

// Safe production readiness contains only booleans/cost mode, never tokens/endpoints.
for(const pattern of [/externalRendererConnected:config\.connected/,/externalRendererAllowed:config\.configured/,/durableMp4Capture:true/,/atomicRenderClaim:true/,/replaySafeStoryboard:true/,/replaySafeProject:true/,/downstreamIdempotencyKey:true/,/Cache-Control":"private, no-store/])assert.match(readiness,pattern);
assert.doesNotMatch(readiness,/VIDEO_RENDER_TOKEN|VIDEO_RENDER_ENDPOINT|SUPABASE_SERVICE_ROLE_KEY/);

// Exercise renderer output filtering rather than only matching source code.
process.env.VIDEO_RENDER_ENDPOINT='https://renderer.example.test/render';
process.env.VIDEO_RENDER_STATUS_ENDPOINT='https://renderer.example.test/status/{jobId}';
process.env.VIDEO_RENDER_OUTPUT_HOST_ALLOWLIST='cdn.example.test';
const module=await import(`${pathToFileURL(path.join(root,'lib/video/render-gateway.js')).href}?contract=${Date.now()}`);
assert.equal(module.normalizeVideoOutputPath('https://renderer.example.test/out/video.mp4'),'https://renderer.example.test/out/video.mp4');
assert.equal(module.normalizeVideoOutputPath('https://cdn.example.test/out/video.mp4'),'https://cdn.example.test/out/video.mp4');
assert.equal(module.normalizeVideoOutputPath('https://evil.example.test/track.mp4'),null);
assert.equal(module.normalizeVideoOutputPath('https://user:pass@cdn.example.test/out.mp4'),null);
assert.equal(module.normalizeVideoOutputPath('../secret.mp4'),null);
assert.equal(module.normalizeVideoOutputPath('/renders/output.mp4'),'/renders/output.mp4');
assert.equal(module.normalizeVideoOutputPath('/api/video/assets/11111111-1111-4111-8111-111111111111'),'/api/video/assets/11111111-1111-4111-8111-111111111111');

console.log('AI Video Generator contract passed: storyboard/project/compile replay safety, one atomic renderer claim, downstream idempotency, durable private MP4 capture, owner-scoped stable output and mobile-safe recovery are locked.');
