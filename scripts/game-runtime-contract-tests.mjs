import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {compileGameRuntimeV1} from '../lib/game/runtime-v1.js';
import {evaluateGameQuality100} from '../lib/game/quality-100.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const route=read('app/api/game/generate/route.js');
const builder=read('app/game-builder/page.js');
const mainGenerate=read('app/api/generate/route.js');
const player=read('app/a/[id]/GameRuntimeClient.js');
const generatedPage=read('app/a/[id]/page.js');
const reservationMigration=read('supabase/migrations/20260901133519_harden_game_creator_runtime_contract.sql');
const cooldownMigration=read('supabase/migrations/20260901141106_add_game_fair_use_cooldown_and_full_access.sql');
const cooldownWindowMigration=read('supabase/migrations/20260901141141_fix_game_cooldown_usage_window.sql');

const runtime=compileGameRuntimeV1({name:'Contract Game',productType:'mobile_game',game:{enabled:true,genre:'Action',maxHealth:100,enemyCount:3,maxLevel:4,coreLoop:['move','fight','collect','finish']}});
assert.equal(runtime.playable,true);
assert.deepEqual(runtime.platforms,['ios','android','web-preview']);
for(const system of ['touch-controls','physics','collision','win-lose-state','autosave','accessibility','performance-budget','lifecycle-recovery','deterministic-spawns'])assert.ok(runtime.systems.includes(system),`Missing ${system}`);
const quality=evaluateGameQuality100(runtime);assert.equal(quality.score,100);assert.equal(quality.passed,true);
assert.match(player,/requestAnimationFrame/);assert.match(player,/setPointerCapture/);assert.match(player,/pointerCancel/);assert.match(player,/pagehide/);assert.match(player,/prefers-reduced-motion/);assert.match(player,/YOU WIN/);assert.match(player,/GAME OVER/);assert.match(generatedPage,/resolveGeneratedRuntime/);

// Game-only Fair Use ledger: not ordinary App counts, serialized per user, replay safe, recoverable and service-only.
assert.match(reservationMigration,/create table if not exists public\.game_creation_reservations/);
assert.match(reservationMigration,/unique \(user_id, request_id\)/i);
assert.match(reservationMigration,/alter table public\.game_creation_reservations enable row level security/i);
assert.match(reservationMigration,/revoke all on table public\.game_creation_reservations from public, anon, authenticated/i);
assert.match(reservationMigration,/server_reserve_game_creation/);assert.match(reservationMigration,/server_finalize_game_creation/);assert.match(reservationMigration,/server_release_game_creation/);
assert.match(reservationMigration,/pg_advisory_xact_lock\(hashtextextended\(uid::text, 77191\)\)/);
assert.match(reservationMigration,/status in \('reserved','completed'\)/);
assert.match(reservationMigration,/existing\.status='completed'/);assert.match(reservationMigration,/'replayed',true/);assert.match(reservationMigration,/'reason','in_progress'/);
assert.match(reservationMigration,/a\.id=p_app_id and a\.owner_id=uid/);
for(const signature of ['server_reserve_game_creation(uuid,text,integer)','server_finalize_game_creation(uuid,text,uuid)','server_release_game_creation(uuid,text)']){
  assert.ok(reservationMigration.includes(`revoke all on function public.${signature} from public, anon, authenticated;`),`${signature} must be revoked from public/anon/authenticated`);
  assert.ok(reservationMigration.includes(`grant execute on function public.${signature} to service_role;`),`${signature} must be service-role only`);
}
assert.doesNotMatch(reservationMigration,/from public\.apps\s+where[^;]*created_at>=now\(\)-interval '1 hour'/is);

// Creator-first cooldown contract: Professional escalates only Game creation; Full Access bypasses ordinary cooldown.
assert.match(cooldownMigration,/game_access_plan text not null default 'professional'/);
assert.match(cooldownMigration,/game_cooldown_level integer not null default 0/);
assert.match(cooldownMigration,/game_access_plan in \('professional','full'\)/);
assert.match(cooldownMigration,/server_set_game_access_plan/);
assert.match(cooldownMigration,/when 1 then 30 when 2 then 60 when 3 then 120 when 4 then 240 else 480/);
assert.match(cooldownMigration,/'normal_features_available',true/);
assert.match(cooldownMigration,/'upgrade_plan','full','upgrade_price_usd',199/);
assert.match(cooldownMigration,/access_row\.game_access_plan='professional' and active_count>=p_hourly_limit/);
assert.match(cooldownMigration,/'ordinary_cooldown_exempt',access_row\.game_access_plan='full'/);
assert.match(cooldownMigration,/game_last_limit_at < now\(\)-interval '7 days'/);
assert.match(cooldownWindowMigration,/usage_window_start := now\(\)-interval '1 hour'/);
assert.match(cooldownWindowMigration,/usage_window_start := greatest\(usage_window_start,access_row\.game_cooldown_until\)/);
assert.match(cooldownWindowMigration,/reserved_at>=usage_window_start/);
assert.match(cooldownWindowMigration,/revoke all on function public\.server_reserve_game_creation\(uuid,text,integer\) from public, anon, authenticated/);

// Gateway must authenticate/verify/creator-plan-gate before reserving, require bounded stable identity, and finalize/release around the real Generate response.
assert.match(route,/auth\.getUser\(\)/);assert.match(route,/confirmed_at/);assert.match(route,/getAppBuilderAccess/);assert.match(route,/!access\.professional\.active/);
assert.match(route,/MAX_REQUEST_BYTES=32\*1024/);assert.match(route,/REQUEST_ID=/);assert.match(route,/A stable Game Creator request ID is required/);
assert.match(route,/createAdminClient/);assert.match(route,/server_reserve_game_creation/);assert.match(route,/p_hourly_limit:GAME_CREATOR_POLICY\.fairUse\.maxNewGameStartsPerHour/);
assert.ok(route.indexOf('server_reserve_game_creation')<route.indexOf('generateApp(forwarded)'),'Fair Use reservation must happen before generation');
assert.match(route,/reservation\?\.status==="completed"&&reservation\?\.app_id/);assert.match(route,/GAME_REQUEST_IN_PROGRESS/);assert.match(route,/GAME_CREATOR_COOLDOWN/);assert.match(route,/GAME_FAIR_USE_TEMPORARY_LIMIT/);
assert.match(route,/server_finalize_game_creation/);assert.match(route,/server_release_game_creation/);assert.match(route,/response\.clone\(\)\.json/);
assert.match(route,/headers\.delete\("content-length"\)/);assert.match(route,/x-soolen-game-gateway","professional-fair-use"/);
assert.match(route,/Cache-Control","private, no-store/);assert.match(route,/X-LANERIQ-Game-Buyout/);assert.match(route,/X-LANERIQ-Game-Sales-Share/);assert.doesNotMatch(route,/X-LANERIQ-Game-Profit-Share/);
assert.match(route,/ordinaryFeaturesRemainAvailable:true/);assert.match(route,/automaticallyResumes:true/);assert.match(route,/priceUsd:199/);
assert.doesNotMatch(route,/\.from\("apps"\)\.select\("id",\{count:"exact",head:true\}\)/);

assert.match(mainGenerate,/if\(isMobileGameIdea\(combinedInput\)\)/);assert.match(mainGenerate,/trustedGameGateway/);assert.match(mainGenerate,/access\?\.professional\?\.active/);assert.ok(mainGenerate.indexOf('if(isMobileGameIdea(combinedInput))')<mainGenerate.indexOf('consumeAppBuilderEntitlement(userId'));

assert.match(builder,/useRef/);assert.match(builder,/requestIdRef\.current\|\|crypto\.randomUUID\(\)/);assert.match(builder,/requestIdRef\.current=requestId/);assert.match(builder,/function changeIdea\(value\)\{setIdea\(value\);requestIdRef\.current=""/);
assert.match(builder,/credentials:"same-origin"/);assert.match(builder,/cache:"no-store"/);assert.match(builder,/response\.status===409/);assert.match(builder,/← LANERIQ AI/);assert.doesNotMatch(builder,/AI BUILD APP&WEB/);
assert.match(builder,/Production evidence is scored separately/);assert.match(builder,/Real provider\/network\/device evidence/i);

console.log('Game Creator runtime contract passed: playable local quality, creator-plan double-gate, Game-only atomic Fair Use reservations, progressive cooldown recovery, Full Access exemption, replay-safe creation and truthful live boundaries are locked.');
