import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {MULTIPLAYER_AUTHORITY_V1,createAuthorityState,joinAuthorityPlayer,applyAuthorityInput,tickAuthority,snapshotAuthority,multiplayerReadiness} from '../lib/game/multiplayer-authority-v1.js';
import {LIVE_MULTIPLAYER_TRANSPORT_V1,evaluateLiveTransportReadiness} from '../lib/game/live-multiplayer-transport-v1.js';
import {validateMultiplayerAdapter,evaluateAdapterEvidence} from '../lib/game/multiplayer-adapter-v1.js';

const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gateway=read('lib/game/multiplayer-provider-gateway.js');
const api=read('app/api/game/multiplayer/matchmaking/route.js');
const migration=read('supabase/migrations/20260901134732_harden_multiplayer_session_contract.sql');
const builder=read('app/game-builder/page.js');

// Internal 5v5-ready authority foundation is deterministic and bounded but never self-claims live transport.
assert.equal(MULTIPLAYER_AUTHORITY_V1.authoritative,true);assert.equal(MULTIPLAYER_AUTHORITY_V1.liveTransport,false);
for(const system of ['fixed-server-tick','input-sequence','server-validation','snapshot-versioning','reconnect-resync','rate-limit','anti-cheat-boundaries','reconciliation-contract'])assert.ok(MULTIPLAYER_AUTHORITY_V1.systems.includes(system));
const state=createAuthorityState({tickRate:20,maxPlayers:10});for(let i=0;i<10;i++)assert.equal(joinAuthorityPlayer(state,{id:`p${i+1}`,team:i<5?'blue':'red'}),true);assert.equal(joinAuthorityPlayer(state,{id:'p11'}),false);assert.equal(applyAuthorityInput(state,'p1',{sequence:1,x:1,y:0,z:0,speed:5},1).ok,true);tickAuthority(state,.05);assert.equal(snapshotAuthority(state).players.length,10);assert.equal(multiplayerReadiness().productionReady,false);
assert.equal(LIVE_MULTIPLAYER_TRANSPORT_V1.liveServiceVerified,false);assert.equal(evaluateLiveTransportReadiness({}).score,0);assert.equal(evaluateLiveTransportReadiness({adapter:true,realRelay:true,matchmaking:true,reconnect:true,resync:true,loadTest:true,lossLatencyTest:true,realDevices:true,regionalFailover:true}).score,100);
const shape=validateMultiplayerAdapter({transport:{connect(){},send(){},subscribe(){},close(){}},matchmaking:{createTicket(){},pollTicket(){},cancelTicket(){}}});assert.equal(shape.valid,true);assert.equal(shape.productionReady,false);assert.equal(evaluateAdapterEvidence({shapeValidated:true}).productionReady,false);

// Provider gateway is server-only, HTTPS/SSRF guarded, time bounded, redirect-safe, response bounded, cost-policy aware and provider-hidden.
assert.match(gateway,/assertRuntimeUrlAllowed/);assert.match(gateway,/getSoolenCostMode/);assert.match(gateway,/TIMEOUT_MS=12000/);assert.match(gateway,/MAX_RESPONSE_BYTES=64\*1024/);assert.match(gateway,/redirect:"error"/);assert.match(gateway,/cache:"no-store"/);assert.match(gateway,/MULTIPLAYER_PROVIDER_TOKEN/);assert.match(gateway,/MULTIPLAYER_COST_POLICY_BLOCKED/);assert.match(gateway,/LIVE_MULTIPLAYER_NOT_CONNECTED/);assert.match(gateway,/LIVE_MULTIPLAYER_STATUS_NOT_CONNECTED/);assert.match(gateway,/createMultiplayerTicket/);assert.match(gateway,/checkMultiplayerTicket/);assert.match(gateway,/cancelMultiplayerTicket/);assert.doesNotMatch(gateway,/NEXT_PUBLIC_.*TOKEN/);

// Server API requires verified auth, active Pro, exact owned Game project and stable request identity before any provider work.
assert.match(api,/auth\.getUser\(\)/);assert.match(api,/confirmed_at/);assert.match(api,/getAppBuilderAccess/);assert.match(api,/!access\.professional\.active/);assert.match(api,/Owned mobile Game project not found/);assert.match(api,/productType==="mobile_game"\|\|spec\?\.game\?\.enabled===true/);assert.match(api,/MAX_REQUEST_BYTES=24\*1024/);assert.match(api,/REQUEST_ID=/);assert.match(api,/A stable multiplayer request ID is required/);assert.match(api,/LIVE_MULTIPLAYER_NOT_CONNECTED/);assert.match(api,/will not claim real-player matchmaking/);assert.match(api,/productionEvidenceVerified:false/);assert.match(api,/createAdminClient/);assert.match(api,/server_reserve_multiplayer_session/);assert.match(api,/server_update_multiplayer_session/);assert.match(api,/reservation\?\.replayed/);assert.match(api,/no duplicate provider ticket was created/);assert.match(api,/Cache-Control":"private, no-store/);assert.doesNotMatch(api,/provider:/);assert.doesNotMatch(api,/endpoint:/);assert.doesNotMatch(api,/reconnectToken/);

// DB request ledger is app+owner bound, replay-safe, serialized and not directly exposed to anon/authenticated.
assert.match(migration,/create table if not exists public\.multiplayer_session_requests/);assert.match(migration,/unique\(user_id,request_id\)/i);assert.match(migration,/references public\.apps\(id\) on delete cascade/i);assert.match(migration,/enable row level security/);assert.match(migration,/revoke all on table public\.multiplayer_session_requests from public,anon,authenticated/);assert.match(migration,/server_reserve_multiplayer_session/);assert.match(migration,/server_update_multiplayer_session/);assert.match(migration,/a\.id=p_app_id and a\.owner_id=uid/);assert.match(migration,/pg_advisory_xact_lock/);assert.match(migration,/Request id already belongs to another app/);assert.match(migration,/Terminal multiplayer session cannot be reopened/);assert.match(migration,/grant execute on function public\.server_reserve_multiplayer_session\(uuid,uuid,text\) to service_role/);assert.match(migration,/grant execute on function public\.server_update_multiplayer_session\(uuid,uuid,text,text,text,text,text\) to service_role/);

// Product UI keeps the evidence boundary explicit: internal transport/authority contracts are not live 5v5 proof.
assert.match(builder,/Authoritative Multiplayer Core/);assert.match(builder,/Live Transport Contract V1/);assert.match(builder,/Multiplayer Adapter V1/);assert.match(builder,/not proof that a real relay/);assert.match(builder,/Real provider\/network\/device evidence/i);

console.log('Multiplayer / 5v5 contract passed: 10-player authority foundation, secure provider-neutral matchmaking gateway, replay-safe owner-bound sessions and explicit live-evidence boundaries are locked.');