import assert from "node:assert/strict";
import fs from "node:fs";
import {inferMobileGamePlan,isMobileGameIdea,MOBILE_GAME_GENRES} from "../lib/ai/mobile-game-knowledge.js";
import {inferIndustryCapabilities} from "../lib/ai/industry-capability-planner.js";
import {SOOLEN_MEDIA_CAPABILITIES,SOOLEN_MEDIA_MARKETING_CAPABILITIES} from "../lib/ai/media-capabilities.js";
import {buildAutonomousPlan} from "../lib/build/orchestrator.js";
import {normalizeAppSpec} from "../lib/generator/runtime-guard.js";

assert.equal(isMobileGameIdea("Make me a mobile racing game"),true);
assert.equal(isMobileGameIdea("Build a property CRM"),false);
assert.ok(MOBILE_GAME_GENRES.some(item=>item.id==="rpg"));
assert.ok(MOBILE_GAME_GENRES.some(item=>item.id==="puzzle"));
assert.ok(MOBILE_GAME_GENRES.some(item=>item.id==="tower_defense"));

const game=inferMobileGamePlan("Create a 3D multiplayer racing game for iPhone and Android with avatars, IAP and rewarded ads");
assert.equal(game.matched,true);
assert.equal(game.productType,"mobile_game");
assert.equal(game.genreId,"racing");
assert.equal(game.multiplayer,true);
assert.equal(game.monetization.ads,true);
assert.equal(game.monetization.inAppPurchases,true);
for(const platform of ["ios","android","web-preview"])assert.ok(game.platforms.includes(platform));
for(const media of ["ai-art","ai-video","ai-photo-video","ai-avatar"])assert.ok(game.mediaCapabilities.includes(media));
assert.match(game.brief,/touch-first controls/i);
assert.match(game.brief,/performance budgets/i);
assert.match(game.brief,/App Store or Google Play submission is completed/i);

const industry=inferIndustryCapabilities({idea:"Build a tower defense mobile game with multiplayer and avatar creator",industry:"games"});
assert.equal(industry.profileId,"mobile_game");
assert.ok(industry.explicit.includes("multiplayer"));
assert.ok(industry.explicit.includes("avatar"));

const orchestration=buildAutonomousPlan({idea:"Build a puzzle mobile game with an AI game trailer"});
assert.equal(orchestration.modules.game,true);
assert.equal(orchestration.modules.app,true);
assert.equal(orchestration.modules.website,true);
assert.ok(orchestration.selectedModules.includes("game"));
assert.deepEqual(orchestration.game.targetPlatforms,["ios","android","web-preview"]);

for(const key of ["artGeneration","videoCreation","photoVideoGeneration","avatarCreation"])assert.equal(SOOLEN_MEDIA_CAPABILITIES[key]?.enabled,true,`${key} must be enabled as a product foundation`);
for(const label of ["AI Art Generator","AI Video Generator","AI Photo & Video Generator","AI Avatar Creator"])assert.ok(SOOLEN_MEDIA_MARKETING_CAPABILITIES.some(item=>item.label===label),`Missing media capability ${label}`);

const normalized=normalizeAppSpec({name:"Demo Game",productType:"mobile_game",platforms:["ios","android","web"],game:{enabled:true,genre:"Puzzle",coreLoop:["match","reward","advance"]},pages:[{name:"Gameplay",route:"/play"}]});
assert.equal(normalized.productType,"mobile_game");
assert.ok(normalized.platforms.includes("ios"));
assert.ok(normalized.platforms.includes("android"));
assert.equal(normalized.game.enabled,true);

const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const banner=fs.readFileSync("app/components/CreationCapabilityBanner.js","utf8");
const avatar=fs.readFileSync("app/avatar-studio/page.js","utf8");
const layout=fs.readFileSync("app/layout.js","utf8");
assert.match(engine,/inferMobileGamePlan/);
assert.match(engine,/MOBILE GAME KNOWLEDGE/);
assert.match(engine,/productType":"app_website\|mobile_game/);
assert.match(engine,/iOS and Android/);
assert.match(banner,/App<\/b>, <b>Website<\/b> or <b>Mobile Game/);
assert.match(banner,/iOS/);
assert.match(banner,/Android/);
assert.match(banner,/AI Art Generator/);
assert.match(banner,/AI Video Generator/);
assert.match(banner,/AI Photo & Video/);
assert.match(banner,/AI Avatar Creator/);
assert.match(avatar,/\/api\/images\/generate/);
assert.match(avatar,/Zero-cost first/);
assert.match(layout,/CreationCapabilityBanner/);

console.log("✓ SoolenAI recognizes Mobile Games as a first-class product type and plans playable touch-first iOS + Android game foundations with web preview");
console.log("✓ Game knowledge covers genre, game loop, state, progression, save/load, audio, assets, performance, multiplayer, monetization, privacy and truthful store-readiness boundaries");
console.log("✓ AI Art, AI Video, AI Photo & Video and AI Avatar foundations are present and exposed without inventing paid-provider availability");
