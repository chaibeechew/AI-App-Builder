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
const migration=read('supabase/migrations/20260901133519_harden_game_creator_runtime_contract.sql');

// Runtime itself must be a playable mobile vertical slice and pass the deterministic 100-point local quality contract.
const runtime=compileGameRuntimeV1({name:'Contract Game',productType:'mobile_game',game:{enabled:true,genre:'Action',maxHealth:100,enemyCount:3,maxLevel:4,coreLoop:['move','fight','collect','finish']}});
assert.equal(runtime.playable,true);
assert.deepEqual(runtime.platforms,['ios','android','web-preview']);
for(const system of ['touch-controls','physics','collision','win-lose-state','autosave','accessibility','performance-budget','lifecycle-recovery','deterministic-spawns'])assert.ok(runtime.systems.includes(system),`Missing ${system}`);
const quality=evaluateGameQuality100(runtime);assert.equal(quality.score,100);assert.equal(quality.passed,true);
assert.match(player,/requestAnimationFrame/);assert.match(player,/setPointerCapture/);assert.match(player,/pointerCancel/);assert.match(player,/pagehide/);assert.match(player,/prefers-reduced-motion/);assert.match(player,/YOU WIN/);assert.match(player,/GAME OVER/);assert.match(generatedPage,/resolveGeneratedRuntime/);

// Game-only Fair Use ledger: not ordinary App counts, serialized per user, replay safe, recoverable and service-only.
assert.match(migration,/create table if not exists public\.game_creation_reservations/);
assert.match(migration,/unique \(user_id, request_id\)/i);
assert.match(migration,/alter table public\.game_creation_reservations enable row level security/i);
assert.match(migration,/revoke all on table public\.game_creation_reservations from public, anon, authenticated/i);
assert.match(migration,/server_reserve_game_creation/);assert.match(migration,/server_finalize_game_creation/);assert.match(migration,/server_release_game_creation/);
assert.match(migration,/pg_advisory_xact_lock\(hashtextextended\(uid::text, 77191\)\)/);
assert.match(migration,/status in \('reserved','completed'\)/);
assert.match(migration,/reserved_at>=now\(\)-interval '1 hour'/);
assert.match(migration,/existing\.status='completed'/);assert.match(migration,/'replayed',true/);assert.match(migration,/'reason','in_progress'/);
assert.match(migration,/existing\.reserved_at >= now\(\)-interval '10 minutes'/);
assert.match(migration,/a\.id=p_app_id and a\.owner_id=uid/);
for(const fn of ['server_reserve_game_creation\(uuid,text,integer\)','server_finalize_game_creation\(uuid,text,uuid\)','server_release_game_creation\(uuid,text\)']){
  assert.match(migration,new RegExp(`revoke all on function public\\.${fn} from public, anon, authenticated`));
  assert.match(migration,new RegExp(`grant execute on function public\\.${fn} to service_role`));
}
assert.doesNotMatch(migration,/from public\.apps\s+where[^;]*created_at>=now\(\)-interval '1 hour'/is);

// Gateway must authenticate/verify/Pro-gate before reserving, require bounded stable identity, and finalize/release around the real Generate response.
assert.match(route,/auth\.getUser\(\)/);assert.match(route,/confirmed_at/);assert.match(route,/getAppBuilderAccess/);assert.match(route,/!access\.professional\.active/);
assert.match(route,/MAX_REQUEST_BYTES=32\*1024/);assert.match(route,/REQUEST_ID=/);assert.match(route,/A stable Game Creator request ID is required/);
assert.match(route,/createAdminClient/);assert.match(route,/server_reserve_game_creation/);assert.match(route,/p_hourly_limit:GAME_CREATOR_POLICY\.fairUse\.maxNewGameStartsPerHour/);
assert.ok(route.indexOf('server_reserve_game_creation')<route.indexOf('generateApp(forwarded)'),'Fair Use reservation must happen before generation');
assert.match(route,/reservation\?\.status==="completed"&&reservation\?\.app_id/);assert.match(route,/GAME_REQUEST_IN_PROGRESS/);assert.match(route,/GAME_FAIR_USE_TEMPORARY_LIMIT/);
assert.match(route,/server_finalize_game_creation/);assert.match(route,/server_release_game_creation/);assert.match(route,/response\.clone\(\)\.json/);
assert.match(route,/headers\.delete\("content-length"\)/);assert.match(route,/x-soolen-game-gateway","professional-fair-use"/);
assert.match(route,/Cache-Control","private, no-store/);assert.match(route,/X-LANERIQ-Game-Buyout/);assert.match(route,/X-LANERIQ-Game-Profit-Share/);
assert.doesNotMatch(route,/\.from\("apps"\)\.select\("id",\{count:"exact",head:true\}\)/);

// Main Generate still double-gates Game mode before ordinary entitlement/credit consumption.
assert.match(mainGenerate,/if\(isMobileGameIdea\(combinedInput\)\)/);assert.match(mainGenerate,/trustedGameGateway/);assert.match(mainGenerate,/professional\.active/);assert.ok(mainGenerate.indexOf('if(isMobileGameIdea(combinedInput))')<mainGenerate.indexOf('consumeAppBuilderEntitlement(user.id'));

// Mobile UI preserves one request id for network/manual retry, resets it only when the idea changes, and keeps provider/runtime claims truthful.
assert.match(builder,/useRef/);assert.match(builder,/requestIdRef\.current\|\|crypto\.randomUUID\(\)/);assert.match(builder,/requestIdRef\.current=requestId/);assert.match(builder,/function changeIdea\(value\)\{setIdea\(value\);requestIdRef\.current=""/);
assert.match(builder,/credentials:"same-origin"/);assert.match(builder,/cache:"no-store"/);assert.match(builder,/response\.status===409/);assert.match(builder,/← LANERIQ AI/);assert.doesNotMatch(builder,/AI BUILD APP&WEB/);
assert.match(builder,/Production evidence is scored separately/);assert.match(builder,/Real provider\/network\/device evidence/i);

console.log('Game Creator runtime contract passed: playable local quality, Pro double-gate, Game-only atomic Fair Use reservations, replay-safe creation, truthful live boundaries and mobile retry safety are locked.');