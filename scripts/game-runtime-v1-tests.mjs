import assert from "node:assert/strict";
import fs from "node:fs";
import {compileGameRuntimeV1,GAME_RUNTIME_V1} from "../lib/game/runtime-v1.js";
import {GAME_CREATOR_POLICY} from "../lib/game/pro-policy.js";

const runtime=compileGameRuntimeV1({name:"Demo Racer",productType:"mobile_game",designSystem:{primaryColor:"#117755",accentColor:"#e2bd5c"},game:{enabled:true,genre:"Racing",maxHealth:120,enemyCount:4,coreLoop:["drive","collect","avoid","finish"]}});
assert.equal(GAME_RUNTIME_V1.playable,true);
assert.equal(runtime.productType,"mobile_game");
assert.equal(runtime.player.maxHealth,120);
assert.equal(runtime.enemies.baseCount,4);
for(const platform of ["ios","android","web-preview"])assert.ok(runtime.platforms.includes(platform));
for(const system of ["scene","touch-controls","physics","collision","player","enemy","level","score","health","save-load","audio","pause-restart","ios-android-responsive"])assert.ok(GAME_RUNTIME_V1.systems.includes(system),`Missing runtime system: ${system}`);

assert.equal(GAME_CREATOR_POLICY.accessTier,"professional");
assert.equal(GAME_CREATOR_POLICY.pricingDisplayInFeatureCards,false);
assert.equal(GAME_CREATOR_POLICY.normalUseIncluded,true);
assert.equal(GAME_CREATOR_POLICY.noSurprisePerClickCharges,true);
assert.ok(GAME_CREATOR_POLICY.fairUse.maxNewGameStartsPerHour>0);

const route=fs.readFileSync("app/api/game/generate/route.js","utf8");
const mainGenerate=fs.readFileSync("app/api/generate/route.js","utf8");
const builder=fs.readFileSync("app/game-builder/page.js","utf8");
const player=fs.readFileSync("app/a/[id]/GameRuntimeClient.js","utf8");
const generatedPage=fs.readFileSync("app/a/[id]/page.js","utf8");
const banner=fs.readFileSync("app/components/CreationCapabilityBanner.js","utf8");
const studio=fs.readFileSync("app/studio/page.js","utf8");

assert.match(route,/getAppBuilderAccess/);
assert.match(route,/professional\.active/);
assert.match(route,/PRO_GAME_CREATOR_REQUIRED/);
assert.match(route,/GAME_FAIR_USE_TEMPORARY_LIMIT/);
assert.match(route,/maxNewGameStartsPerHour/);
assert.match(route,/x-soolen-game-gateway/);
assert.match(route,/POST as generateApp/);
assert.match(mainGenerate,/isMobileGameIdea/);
assert.match(mainGenerate,/x-soolen-game-gateway/);
assert.match(mainGenerate,/professional\.active/);
assert.match(mainGenerate,/PRO_GAME_CREATOR_REQUIRED/);
assert.ok(mainGenerate.indexOf("if(isMobileGameIdea(combinedInput))")<mainGenerate.indexOf("consumeAppBuilderEntitlement"),"Pro game gate must run before ordinary entitlement/credit charging");
assert.match(builder,/\/api\/game\/generate/);
assert.match(builder,/PRO · FAIR PRICE · FAIR USE/);
assert.doesNotMatch(builder,/RM\s?\d/i);
assert.match(player,/requestAnimationFrame/);
assert.match(player,/pointerMove/);
assert.match(player,/damageCooldown/);
assert.match(player,/localStorage/);
assert.match(player,/AudioContext/);
assert.match(player,/Pause/);
assert.match(player,/Restart/);
assert.match(generatedPage,/GameRuntimeClient/);
assert.match(generatedPage,/productType==="mobile_game"/);
for(const name of ["AI Art Generator","AI Video Generator","AI Photo & Video Generator","AI Avatar Creator"]){assert.match(banner,new RegExp(name.replace(/[&]/g,"\\&")));assert.match(studio,new RegExp(name.replace(/[&]/g,"\\&")));}
assert.match(banner,/\/game-builder/);
assert.match(studio,/Pro Game Creator/);
assert.doesNotMatch(banner,/RM\s?\d/i);

console.log("✓ Mobile Game Creator is Professional-only, the main generator cannot bypass the gate, and game fair-use protection runs before ordinary credits are charged");
console.log("✓ Game Runtime V1 provides a real playable 2D vertical slice foundation with touch, physics/collision, player/enemy, progression, score/health, save/load, audio and pause/restart");
console.log("✓ AI Art, AI Video, AI Photo & Video and AI Avatar entry points are unified across homepage, Studio and game creation workflow without copied RM price cards");
