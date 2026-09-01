import assert from "node:assert/strict";
import fs from "node:fs";
import {inferAdvancedGenreKnowledge} from "../lib/ai/advanced-game-genre-knowledge.js";
import {compileRemainingGenreRuntimeV1,createRemainingGenreState,stepShooter,stepPlatformer,stepTowerDefense,stepIdle,stepParty,stepEducational} from "../lib/game/remaining-genre-runtime-v1.js";
import {createLiveTransportState,beginMatchmaking,applyMatchFound,beginTransportConnect,markTransportConnected,disconnectTransport,beginResync,completeResync,evaluateLiveTransportReadiness} from "../lib/game/live-multiplayer-transport-v1.js";
import {currentGameCreatorEvidence,evaluateGameCreatorReadiness} from "../lib/game/game-creator-readiness-v2.js";
import {inferGenreRuntimeProfile} from "../lib/game/genre-runtime-intelligence.js";
import {resolveGeneratedRuntime} from "../lib/game/game-runtime-router-v1.js";

const specialistCases=[
  ["shooter","Create a mobile FPS shooter"],["platformer","Create a platform runner game"],["tower_defense","Create a tower defense game"],["idle","Create an idle incremental game"],["party","Create a party minigame"],["educational","Create an educational learning game"]
];
for(const[id,idea]of specialistCases){const plan=inferAdvancedGenreKnowledge(idea,id);assert.equal(plan.matched,true);assert.equal(plan.id,id);assert.ok(plan.systems.length>=7,`${id} should have deep specialist knowledge`);const profile=inferGenreRuntimeProfile({archetype:id});assert.equal(profile.runtime,"remaining-genre-runtime-v1");const route=resolveGeneratedRuntime({productType:"mobile_game",game:{enabled:true,archetype:id,genre:id}});assert.equal(route.runtimeId,"remaining-genre-runtime-v1");assert.equal(route.type,id);assert.equal(route.eventName,`${id}_runtime_view`);}
console.log("✓ SoolenAI specialist knowledge and Genre Intelligence cover Shooter, Platformer, Tower Defense, Idle, Party and Educational games");

let c=compileRemainingGenreRuntimeV1({name:"Test",game:{archetype:"shooter"}}),s=createRemainingGenreState(c);for(let i=0;i<8&&s.status==="playing";i++)s=stepShooter(s,"fire");if(s.ammo===0)s=stepShooter(s,"reload");assert.ok(["playing","won","lost"].includes(s.status));assert.ok(s.shots>0);
c=compileRemainingGenreRuntimeV1({game:{archetype:"platformer"}});s=createRemainingGenreState(c);for(let i=0;i<20&&s.status==="playing";i++)s=stepPlatformer(s,i%3===0?"jump":"move");assert.equal(s.status,"won");
c=compileRemainingGenreRuntimeV1({game:{archetype:"tower_defense"}});s=createRemainingGenreState(c);for(let i=0;i<20&&s.status==="playing";i++){s=stepTowerDefense(s,"build");s=stepTowerDefense(s,"upgrade");s=stepTowerDefense(s,"wave");}assert.ok(["won","lost"].includes(s.status));
c=compileRemainingGenreRuntimeV1({game:{archetype:"idle"}});s=createRemainingGenreState(c);s=stepIdle(s,"tick",10000);assert.equal(s.status,"won");
c=compileRemainingGenreRuntimeV1({game:{archetype:"party"}});s=createRemainingGenreState(c);s=stepParty(s,"ready");for(let i=0;i<5&&s.status==="playing";i++)s=stepParty(s,"hit");assert.ok(["won","lost","draw"].includes(s.status));
c=compileRemainingGenreRuntimeV1({game:{archetype:"educational"}});s=createRemainingGenreState(c);for(let i=0;i<8&&s.status==="playing";i++)s=stepEducational(s,"correct");assert.equal(s.status,"won");
console.log("✓ Remaining specialist runtimes have independent playable state machines and win/lose evidence");

let transport=createLiveTransportState();transport=beginMatchmaking(transport,100);assert.equal(transport.status,"searching");transport=applyMatchFound(transport,{matchId:"m1",reconnectToken:"r1"});transport=beginTransportConnect(transport);transport=markTransportConnected(transport,{sessionId:"s1",now:110,realRelay:false});assert.equal(transport.status,"connected");assert.equal(transport.evidence.realRelay,false);transport=disconnectTransport(transport,{reason:"network_lost"});assert.equal(transport.status,"reconnecting");transport=beginTransportConnect(transport);transport=markTransportConnected(transport,{sessionId:"s2",now:120,realRelay:false});transport=beginResync(transport);transport=completeResync(transport,{now:121});assert.equal(transport.evidence.resync,true);
const unverified=evaluateLiveTransportReadiness({adapter:true,matchmaking:true,reconnect:true,resync:true});assert.ok(unverified.score<100);assert.equal(unverified.productionReady,false);const verified=evaluateLiveTransportReadiness({adapter:true,realRelay:true,matchmaking:true,reconnect:true,resync:true,loadTest:true,lossLatencyTest:true,realDevices:true,regionalFailover:true});assert.equal(verified.score,100);assert.equal(verified.productionReady,true);
console.log("✓ Live Transport Contract models matchmaking/reconnect/resync while failing closed without real relay/network/device evidence");

const current=currentGameCreatorEvidence();assert.equal(current.internalCoreScore,100);assert.equal(current.productionEvidenceScore,0);assert.equal(current.canClaimInternal100,true);assert.equal(current.canClaimProduction100,false);
const all=evaluateGameCreatorReadiness({internalEvidence:Object.fromEntries(current.internal.passed.map(k=>[k,true])),productionEvidence:{liveTransport:true,matchmaking:true,networkLoadTests:true,regionalFailover:true,realDeviceIos:true,realDeviceAndroid:true,signedNativeBuildEvidence:true,liveCommerceProvider:true,liveAdsProvider:true,productionTelemetry:true,publicUgcInfrastructure:true,storeSubmissionEvidence:true}});assert.equal(all.canClaimProduction100,true);
console.log("✓ Game Creator Readiness V2 separates internal creation-core 100 from the expanded production evidence 100 standard");

const page=fs.readFileSync("app/a/[id]/page.js","utf8"),builder=fs.readFileSync("app/game-builder/page.js","utf8");for(const token of ["resolveGeneratedRuntime","RemainingGenreRuntimeClient"])assert.ok(page.includes(token),`Generated runtime route missing ${token}`);for(const token of ["Live Transport Contract V1","Game Creator Readiness V2","INTERNAL CORE 100","Educational","Platformer","Tower Defense"])assert.ok(builder.includes(token),`Game Builder missing ${token}`);
console.log("✓ Customer Game Builder exposes the expanded specialist matrix and the shared Preview router preserves truthful runtime selection");
