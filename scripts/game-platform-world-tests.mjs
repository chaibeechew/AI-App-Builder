import assert from "node:assert/strict";
import fs from "node:fs";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {
  inferGamePlatformCapabilities,createReplayRecorder,recordReplayEvent,recordReplaySnapshot,finishReplay,seekReplay,createSpectatorPolicy,
  createGuildState,guildInvite,guildJoin,createLeaderboard,submitLeaderboardScore,leaderboardRows,createAchievementState,progressAchievement,
  createCloudSaveEnvelope,mergeCloudSave,validateUgcLevel
} from "../lib/game/game-platform-systems-v1.js";
import {
  inferWorld3dCapabilities,createCharacter3dState,stepCharacter3d,applyCharacterDamage,performCharacterAttack,planChunkStreaming,rebaseWorldOrigin,createVehicleState,stepVehiclePhysics,recoverVehicle
} from "../lib/game/world-3d-systems-v1.js";
import {validateMultiplayerAdapter,createMatchmakingTicket,markTicketQueued,applyTicketPoll,evaluateAdapterEvidence} from "../lib/game/multiplayer-adapter-v1.js";
import {currentGameCreatorEvidence} from "../lib/game/game-creator-readiness-v2.js";

const platform=inferGamePlatformCapabilities("Create an online RPG with replay, spectator, guild, leaderboard, achievements, cloud save and a UGC level editor");
for(const key of ["replay","spectator","guild","leaderboard","achievements","cloudSave","ugc"])assert.equal(platform.wants[key],true,`Missing platform intent ${key}`);
assert.match(platform.truthRule,/verified backend\/provider evidence/i);

const taxonomy=inferGameTaxonomy("Create a 3D open-world RPG with vehicles, replay, cloud save, guilds, leaderboard and UGC level editor");
assert.equal(taxonomy.primaryGameplay,"rpg");
assert.equal(taxonomy.world3d.openWorld,true);
assert.equal(taxonomy.world3d.vehicle,true);
assert.equal(taxonomy.world3d.rpg,true);
assert.ok(taxonomy.systems.some(item=>item.startsWith("PLATFORM SYSTEM:")));
assert.ok(taxonomy.systems.some(item=>item.startsWith("3D WORLD:")));
assert.match(taxonomy.brief,/Platform systems:/);
assert.match(taxonomy.brief,/3D world needs:/);

const replay=createReplayRecorder({gameVersion:"7",maxEvents:100,maxSnapshots:20});
assert.equal(recordReplaySnapshot(replay,{at:0,state:{x:0,hp:100}}),true);
assert.equal(recordReplayEvent(replay,{at:1,type:"move",payload:{x:2}}),true);
assert.equal(recordReplaySnapshot(replay,{at:2,state:{x:2,hp:100}}),true);
assert.equal(recordReplayEvent(replay,{at:3,type:"hit",payload:{damage:5}}),true);
const completed=finishReplay(replay,{duration:4});
assert.equal(completed.shareable,false);
assert.equal(completed.requiresCompatibilityCheck,true);
const seek=seekReplay(completed,3);
assert.equal(seek.snapshot.at,2);
assert.equal(seek.events.length,1);
assert.equal(createSpectatorPolicy().inputAuthority,false);

const guild=createGuildState({id:"g1",ownerId:"owner"});
const invite=guildInvite(guild,{actorId:"owner",userId:"p2"});
assert.equal(invite.ok,true);assert.equal(guildJoin(guild,invite.invite),true);assert.equal(guild.members.size,2);
const blocked=guildInvite(guild,{actorId:"p2",userId:"p3"});assert.equal(blocked.ok,false);

const board=createLeaderboard({season:"S2"});
assert.equal(submitLeaderboardScore(board,{playerId:"p1",score:100,validated:false}).ok,false);
assert.equal(submitLeaderboardScore(board,{playerId:"p1",score:100,tiebreak:9,validated:true}).ok,true);
assert.equal(submitLeaderboardScore(board,{playerId:"p2",score:100,tiebreak:5,validated:true}).ok,true);
assert.equal(leaderboardRows(board)[0].playerId,"p2");

const achievements=createAchievementState([{id:"wins",target:2}]);
assert.equal(progressAchievement(achievements,"wins",1).unlocked,undefined);
assert.equal(progressAchievement(achievements,"wins",1).unlocked,true);
assert.equal(progressAchievement(achievements,"wins",1).alreadyUnlocked,true);

const local=createCloudSaveEnvelope({deviceId:"iphone",revision:4,data:{level:8,gold:100}});
const same=createCloudSaveEnvelope({deviceId:"android",revision:4,data:{level:9,gold:80}});
const conflict=mergeCloudSave(local,same);assert.equal(conflict.conflict,true);assert.equal(conflict.reason,"same_revision_different_content");
const newer=createCloudSaveEnvelope({deviceId:"android",revision:5,data:{level:9,gold:80}});
assert.equal(mergeCloudSave(local,newer).winner.revision,5);

const validUgc=validateUgcLevel({name:"Forest Trial",bounds:{width:120,height:90},entities:[{type:"spawn"},{type:"goal"}]});
assert.equal(validUgc.valid,true);assert.equal(validUgc.publiclyShared,false);assert.equal(validUgc.requiresPlaytest,true);assert.equal(validUgc.requiresModeration,true);
const unsafeUgc=validateUgcLevel({name:"Unsafe",bounds:{width:100,height:100},entities:[{type:"trigger",externalScript:"https://x"}]});assert.equal(unsafeUgc.valid,false);assert.ok(unsafeUgc.errors.includes("external_scripts_not_allowed"));

const world=inferWorld3dCapabilities("3D open world action RPG with cars");assert.equal(world.wants3d,true);assert.equal(world.openWorld,true);assert.equal(world.action,true);assert.equal(world.rpg,true);assert.equal(world.vehicle,true);
let hero=createCharacter3dState();hero=stepCharacter3d(hero,{x:1,z:1,sprint:true},.05);assert.ok(hero.position.x>0&&hero.position.z>0);const dodged=stepCharacter3d(hero,{x:1,z:0,dodge:true},.05);assert.ok(dodged.invulnerable>0);assert.equal(applyCharacterDamage(dodged,50).health,dodged.health);const attack=performCharacterAttack({...dodged,invulnerable:0,stamina:100},{heavy:true});assert.equal(attack.attack.authoritativeHitRequired,true);assert.equal(attack.attack.type,"heavy");

const stream=planChunkStreaming({position:{x:0,z:0},current:["9:9"],loadRadius:2,unloadRadius:3});assert.ok(stream.load.length>0);assert.ok(stream.unload.includes("9:9"));assert.ok(stream.budgets.maxLoadedChunks>0);assert.equal(stream.requiresAsyncAssetStreaming,true);
assert.equal(rebaseWorldOrigin({position:{x:7000,z:0}}).required,true);

let car=createVehicleState();for(let i=0;i<30;i++)car=stepVehiclePhysics(car,{throttle:1,steer:.25},.05,{surfaceGrip:1});assert.ok(car.speed>0);assert.ok(car.x!==0||car.z!==0);const crashed=stepVehiclePhysics(car,{collision:true},.05,{surfaceGrip:.8});assert.ok(crashed.damage>car.damage);assert.equal(recoverVehicle({...crashed,status:"disabled"}).status,"driving");

const adapter={transport:{connect(){},send(){},subscribe(){},close(){}},matchmaking:{createTicket(){},pollTicket(){},cancelTicket(){}},capabilities:{regions:["ap-southeast"],reconnect:true,orderedReliable:true,authTokens:true}};
const adapterCheck=validateMultiplayerAdapter(adapter);assert.equal(adapterCheck.valid,true);assert.equal(adapterCheck.productionReady,false);
let ticket=createMatchmakingTicket({playerId:"p1",mode:"ranked",skill:1500});ticket=markTicketQueued(ticket,{ticketId:"t1",now:10});ticket=applyTicketPoll(ticket,{status:"matched",matchId:"m1",region:"ap-southeast"},20);assert.equal(ticket.status,"matched");assert.equal(ticket.match.matchId,"m1");
const adapterEvidence=evaluateAdapterEvidence({shapeValidated:true});assert.ok(adapterEvidence.score<100);assert.equal(adapterEvidence.productionReady,false);

const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);assert.equal(readiness.canClaimInternal100,true);assert.equal(readiness.productionEvidenceScore,0);assert.equal(readiness.canClaimProduction100,false);for(const key of ["platformSystems","world3dSystems","multiplayerAdapterAbstraction"])assert.ok(readiness.internal.passed.includes(key),`Readiness missing ${key}`);

const builder=fs.readFileSync("app/game-builder/page.js","utf8");
for(const phrase of ["Replay + Spectator","Guild / Clan","Leaderboard + Achievement","Cloud Save Contract","UGC / Level Editor","Open-world Streaming","Advanced Vehicle Physics","Multiplayer Adapter V1"])assert.match(builder,new RegExp(phrase.replace(/[+\/]/g,m=>`\\${m}`)));
assert.match(builder,/internal platform, transport and adapter contracts are not proof/i);

console.log("✓ Replay/Spectator, Guild/Clan, Leaderboard/Achievement, Cloud Save and UGC platform systems have executable evidence-gated contracts");
console.log("✓ 3D RPG/Action character, open-world chunk streaming and advanced vehicle physics foundations execute deterministically within mobile budgets");
console.log("✓ Multiplayer Adapter V1 validates provider-neutral transport/matchmaking shape without claiming a live provider");
console.log("✓ SoolenAI taxonomy now injects platform and 3D-world knowledge into game planning across genres");
console.log("✓ Game Creator Readiness V2 includes the new platform/world/adapter evidence while keeping production evidence separate");
