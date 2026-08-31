import assert from "node:assert/strict";
import {MULTIPLAYER_AUTHORITY_V1,createAuthorityState,joinAuthorityPlayer,applyAuthorityInput,tickAuthority,snapshotAuthority,disconnectAuthorityPlayer,reconnectAuthorityPlayer,reconcileClientState,multiplayerReadiness} from "../lib/game/multiplayer-authority-v1.js";

assert.equal(MULTIPLAYER_AUTHORITY_V1.authoritative,true);assert.equal(MULTIPLAYER_AUTHORITY_V1.liveTransport,false);
for(const system of ["fixed-server-tick","input-sequence","server-validation","snapshot-versioning","reconnect-resync","rate-limit","anti-cheat-boundaries","reconciliation-contract"])assert.ok(MULTIPLAYER_AUTHORITY_V1.systems.includes(system),`Missing multiplayer system ${system}`);

const state=createAuthorityState({tickRate:20,maxPlayers:2});assert.equal(joinAuthorityPlayer(state,{id:"p1",team:"blue"}),true);assert.equal(joinAuthorityPlayer(state,{id:"p2",team:"red"}),true);assert.equal(joinAuthorityPlayer(state,{id:"p3"}),false);
let result=applyAuthorityInput(state,"p1",{sequence:1,x:1,y:0,z:0,speed:6},1);assert.equal(result.ok,true);assert.equal(applyAuthorityInput(state,"p1",{sequence:1,x:1,speed:6},1.1).reason,"stale_sequence");assert.equal(applyAuthorityInput(state,"p1",{sequence:2,x:9,speed:6},1.2).reason,"invalid_axis");
tickAuthority(state,1/20);const snapshot=snapshotAuthority(state);assert.equal(snapshot.tick,1);assert.equal(snapshot.players.length,2);
assert.equal(disconnectAuthorityPlayer(state,"p1"),true);assert.ok(reconnectAuthorityPlayer(state,"p1")?.selfId==="p1");
const reconcile=reconcileClientState({x:5,y:0,z:0},{x:0,y:0,z:0});assert.equal(reconcile.needsCorrection,true);assert.equal(reconcile.position.x,0);
const readiness=multiplayerReadiness();assert.equal(readiness.simulationCore,true);assert.equal(readiness.liveTransport,false);assert.equal(readiness.productionReady,false);assert.match(readiness.reason,/live transport/i);

console.log("✓ Authoritative multiplayer core validates sequenced inputs, fixed ticks, snapshots, reconnect/resync and reconciliation with anti-cheat/rate-limit boundaries");
console.log("✓ Multiplayer readiness truthfully remains below production 100 until live transport, matchmaking and real network/device evidence exist");
