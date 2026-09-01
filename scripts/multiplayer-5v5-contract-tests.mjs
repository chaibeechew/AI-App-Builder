import assert from "node:assert/strict";
import fs from "node:fs";
import {getMultiplayerProviderConfig} from "../lib/game/multiplayer-provider-gateway.js";
import {evaluateAdapterEvidence} from "../lib/game/multiplayer-adapter-v1.js";
import {evaluateLiveTransportReadiness} from "../lib/game/live-multiplayer-transport-v1.js";
import {multiplayerReadiness} from "../lib/game/multiplayer-authority-v1.js";

for(const key of ["MULTIPLAYER_PROVIDER","MULTIPLAYER_MATCHMAKING_ENDPOINT","MULTIPLAYER_STATUS_ENDPOINT","MULTIPLAYER_CANCEL_ENDPOINT","MULTIPLAYER_PROVIDER_TOKEN"])delete process.env[key];
const config=getMultiplayerProviderConfig();
assert.equal(config.configured,false);
assert.equal(config.connected,false);
assert.equal(multiplayerReadiness().productionReady,false);
assert.equal(evaluateAdapterEvidence({shapeValidated:true}).productionReady,false);
assert.equal(evaluateLiveTransportReadiness({adapter:true}).productionReady,false);

const route=fs.readFileSync("app/api/game/multiplayer/matchmaking/route.js","utf8");
const gateway=fs.readFileSync("lib/game/multiplayer-provider-gateway.js","utf8");
const authority=fs.readFileSync("lib/game/multiplayer-authority-v1.js","utf8");
const transport=fs.readFileSync("lib/game/live-multiplayer-transport-v1.js","utf8");
const migration=fs.readFileSync("supabase/migrations/20260901134732_harden_multiplayer_session_contract.sql","utf8");

for(const pattern of [/auth\.getUser\(\)/,/professional\.active/,/PRO_GAME_CREATOR_REQUIRED/,/\.eq\("owner_id",userId\)/,/productType===\"mobile_game\"/,/game\?\.enabled===true/,/REQUEST_ID/,/MAX_REQUEST_BYTES/,/server_reserve_multiplayer_session/,/server_update_multiplayer_session/,/LIVE_MULTIPLAYER_NOT_CONNECTED/,/productionEvidenceVerified:false/,/Cache-Control\":\"private, no-store/])assert.match(route,pattern);
assert.ok(route.indexOf("getMultiplayerProviderConfig")<route.indexOf("server_reserve_multiplayer_session"),"Provider availability must be checked before reserving a live ticket.");

for(const pattern of [/assertRuntimeUrlAllowed/,/AbortController/,/TIMEOUT_MS/,/MAX_RESPONSE_BYTES/,/redirect:\"error\"/,/cache:\"no-store\"/,/MULTIPLAYER_PROVIDER_TOKEN/,/MULTIPLAYER_COST_POLICY_BLOCKED/,/LIVE_MULTIPLAYER_NOT_CONNECTED/,/validId/,/SAFE_STATUS/])assert.match(gateway,pattern);
assert.doesNotMatch(route,/MULTIPLAYER_PROVIDER_TOKEN/);
assert.match(authority,/authoritative:true/);assert.match(authority,/liveTransport:false/);assert.match(authority,/stale_sequence/);assert.match(authority,/rate_limited/);assert.match(authority,/reconnect/);
assert.match(transport,/adapterConnected:false/);assert.match(transport,/liveServiceVerified:false/);assert.match(transport,/reconnecting/);assert.match(transport,/resyncing/);assert.match(transport,/realDevices/);assert.match(transport,/regionalFailover/);

assert.match(migration,/enable row level security/i);
assert.match(migration,/revoke all on table public\.multiplayer_session_requests from public,anon,authenticated/i);
assert.match(migration,/unique\(user_id,request_id\)/i);
assert.match(migration,/owner_id=uid/i);
assert.match(migration,/pg_advisory_xact_lock/i);
assert.match(migration,/for update/i);
assert.match(migration,/revoke all on function public\.server_reserve_multiplayer_session\(uuid,uuid,text\) from public,anon,authenticated/i);
assert.match(migration,/grant execute on function public\.server_reserve_multiplayer_session\(uuid,uuid,text\) to service_role/i);
assert.match(migration,/Terminal multiplayer session cannot be reopened/);

console.log("Multiplayer / 5v5 contract passed: authenticated Pro + owned-Game gating, replay-safe matchmaking, provider SSRF/timeout/cost controls, authoritative simulation boundaries and truthful LIVE PENDING evidence are locked.");
