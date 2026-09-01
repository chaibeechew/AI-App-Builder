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
const gateway=read('lib/video/render-gateway.js');
const compute=read('lib/video/compute-policy.js');
const migration=read('supabase/migrations/20260901130646_harden_video_generator_runtime_contract.sql');

// Customer surface: canonical brand, bounded inputs, stable request IDs and the actual status endpoint.
assert.match(page,/LANERIQ AI · VIDEO STUDIO/);
assert.doesNotMatch(page,/AI BUILD APP & WEB · VIDEO STUDIO/);
assert.match(page,/maxLength=\{4000\}/);
assert.match(page,/newRequestId\("video-storyboard"\)/);
assert.match(page,/newRequestId\("video-compile"\)/);
assert.match(page,/credentials:"same-origin"/);
assert.match(page,/cache:"no-store"/);
assert.match(page,/\/compile\?versionId=\$\{encodeURIComponent\(versionId\)\}/);
assert.doesNotMatch(page,/\/versions\/\$\{versionId\}/);
assert.match(page,/authorized server renderer accepted a real job/);
assert.doesNotMatch(page,/plan\.provider/);
assert.doesNotMatch(page,/renderVersion\.provider/);

// Storyboard: authenticated/verified, bounded, exact-project memory, request-bound credits and safe output parsing.
assert.match(storyboard,/auth\.getUser\(\)/);
assert.match(storyboard,/confirmed_at/);
assert.match(storyboard,/MAX_REQUEST_BYTES=24\*1024/);
assert.match(storyboard,/REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(storyboard,/cleanText\(body\?\.prompt,4000\)/);
assert.match(storyboard,/\.eq\("id",appId\)\.eq\("owner_id",user\.id\)/);
assert.match(storyboard,/project_memory/);
assert.match(storyboard,/consumeAiCredits\(user\.id/);
assert.match(storyboard,/refundAiCredits\(userId/);
assert.match(storyboard,/scenes\.slice\(0,20\)/);
assert.match(storyboard,/Math\.min\(maxClipSeconds/);
assert.match(storyboard,/Cache-Control":"private, no-store/);
assert.doesNotMatch(storyboard,/provider, storyboard/);
assert.doesNotMatch(storyboard,/error:error\?\.message/);

// Project persistence: owner-bound app link, bounded body, verified account, allowed aspect ratio.
assert.match(projects,/auth\.getUser\(\)/);
assert.match(projects,/MAX_REQUEST_BYTES=16\*1024/);
assert.match(projects,/confirmed_at/);
assert.match(projects,/\.eq\("id",requestedAppId\)\.eq\("owner_id",user\.id\)/);
assert.match(projects,/\["9:16","16:9","1:1"\]\.includes/);
assert.match(projects,/owner_id:user\.id/);
assert.match(projects,/Cache-Control":"private, no-store/);

// Compile/render: bounded request, owned project/assets, approved media hosts, atomic replay RPC and render credits/refunds.
assert.match(compile,/MAX_REQUEST_BYTES=256\*1024/);
assert.match(compile,/REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(compile,/auth\.getUser\(\)/);
assert.match(compile,/confirmed_at/);
assert.match(compile,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(compile,/VIDEO_SOURCE_HOST_ALLOWLIST/);
assert.match(compile,/url\.protocol!=="https:"\|\|url\.username\|\|url\.password/);
assert.match(compile,/\.from\("asset_library"\)\.select\("id"\)\.eq\("user_id",userId\)/);
assert.match(compile,/server_create_video_version/);
assert.match(compile,/version\.replayed/);
assert.match(compile,/consumeAiCredits\(user\.id/);
assert.match(compile,/refundAiCredits/);
assert.match(compile,/rendererConfigured:false,renderStarted:false,jobAccepted:false/);
assert.match(compile,/does not claim that an MP4 is rendering or complete/);
assert.match(compile,/normalizeVideoOutputPath/);
assert.match(compile,/publicVersion/);
assert.doesNotMatch(compile,/provider:render\.provider/);
assert.doesNotMatch(compile,/provider:renderer\.provider/);
assert.doesNotMatch(compile,/error:renderError\?\.message/);

// Provider gateway: cost-aware, HTTPS runtime allowlist, output host allowlist, bounded job IDs and hidden provider errors.
assert.match(gateway,/assertRuntimeUrlAllowed/);
assert.match(gateway,/renderTimeoutMs:45000/);
assert.match(gateway,/statusTimeoutMs:15000/);
assert.match(gateway,/VIDEO_RENDER_OUTPUT_HOST_ALLOWLIST/);
assert.match(gateway,/normalizeVideoOutputPath/);
assert.match(gateway,/JOB_ID=\/\^\[A-Za-z0-9\._:-\]/);
assert.match(gateway,/redirect: "error"/);
assert.match(gateway,/cache: "no-store"/);
assert.match(gateway,/VIDEO_RENDER_COST_POLICY_BLOCKED/);
assert.match(gateway,/VIDEO_RENDER_INVALID_RESPONSE/);
assert.doesNotMatch(gateway,/data\?\.error \|\| data\?\.message/);

// Device policy keeps phones light and heavy final work server-side.
assert.match(compute,/mobile:[\s\S]*maxClipSeconds: 12/);
assert.match(compute,/mobile:[\s\S]*maxProjectSeconds: 60/);
assert.match(compute,/finalRenderLocation: "server"/);
for(const task of ['generation','upscale','denoise','complex-effects','final-encode','final-compile'])assert.match(compute,new RegExp(`"${task}"`));

// Database contract: owner/project/asset RLS, no anon access, bounded edit JSON, replay-safe atomic service RPC.
assert.match(migration,/add column if not exists source_request_id text/i);
assert.match(migration,/video_versions_owner_project_request_unique_idx/);
assert.match(migration,/pg_column_size\(edit_json\) <= 524288/);
assert.match(migration,/revoke insert, update, delete, select on table public\.video_projects from anon/i);
assert.match(migration,/revoke insert, update, delete, select on table public\.video_versions from anon/i);
assert.match(migration,/revoke insert, update, delete, select on table public\.video_clips from anon/i);
assert.match(migration,/exists \(select 1 from public\.apps a where a\.id = video_projects\.app_id and a\.owner_id = \(select auth\.uid\(\)\)\)/i);
assert.match(migration,/exists \(select 1 from public\.video_projects p where p\.id = video_versions\.project_id and p\.owner_id = \(select auth\.uid\(\)\)\)/i);
assert.match(migration,/asset_library a where a\.id = video_clips\.asset_id and a\.user_id = \(select auth\.uid\(\)\)/i);
assert.match(migration,/server_create_video_version/);
assert.match(migration,/for update/i);
assert.match(migration,/source_request_id = p_request_id/);
assert.match(migration,/replayed', true/);
assert.match(migration,/set search_path = ''/i);
assert.match(migration,/revoke all on function public\.server_create_video_version[\s\S]*from public, anon, authenticated/i);
assert.match(migration,/grant execute on function public\.server_create_video_version[\s\S]*to service_role/i);

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

console.log('AI Video Generator contract passed: authenticated storyboard, owner-bound media, replay-safe versions, safe renderer I/O, honest render states, credit recovery and device-safe server rendering are locked.');
