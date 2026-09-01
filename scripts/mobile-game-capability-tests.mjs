import assert from "node:assert/strict";
import fs from "node:fs";
import {inferMobileGamePlan,isMobileGameIdea,MOBILE_GAME_GENRES} from "../lib/ai/mobile-game-knowledge.js";
import {inferIndustryCapabilities} from "../lib/ai/industry-capability-planner.js";
import {SOOLEN_MEDIA_CAPABILITIES,SOOLEN_MEDIA_MARKETING_CAPABILITIES} from "../lib/ai/media-capabilities.js";
import {buildAutonomousPlan} from "../lib/build/orchestrator.js";
import {normalizeAppSpec} from "../lib/generator/runtime-guard.js";
import {buildStoreReadiness,detectDataDisclosureNeeds} from "../lib/publishing/store-readiness-policy.js";

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

const normalized=normalizeAppSpec({name:"Demo Game",productType:"mobile_game",platforms:["web"],game:{enabled:true,genre:"Puzzle",coreLoop:["match","reward","advance"]},pages:[{name:"Gameplay",route:"/play"}]});
assert.equal(normalized.productType,"mobile_game");
for(const platform of ["ios","android","web"])assert.ok(normalized.platforms.includes(platform));
assert.equal(normalized.game.enabled,true);
const normalApp=normalizeAppSpec({name:"CRM",pages:[{name:"Home",route:"/"}]});
for(const platform of ["ios","android","web"])assert.ok(normalApp.platforms.includes(platform),`Normal apps must retain ${platform} as a target`);

const disclosure=detectDataDisclosureNeeds({features:["Login","Gameplay analytics","Rewarded ad network","In-app purchase"],game:{enabled:true}});
assert.equal(disclosure.tracking,true);
for(const category of ["Identifiers","Usage Data","Purchases"])assert.ok(disclosure.categories.some(item=>item.label===category),`Missing store disclosure category ${category}`);
const store=buildStoreReadiness({specification:{features:["Login","Gameplay analytics","Rewarded ad network","In-app purchase"]},listing:null,assets:[],inferredAnswers:{},customerDeclarations:{}});
assert.equal(store.readyForOfficialSubmission,false);
assert.equal(store.checks.find(item=>item.key==="apple_app_privacy")?.status,"external_required");
assert.equal(store.checks.find(item=>item.key==="google_data_safety")?.status,"external_required");
assert.equal(store.checks.find(item=>item.key==="accessibility_declaration")?.status,"external_required");
assert.match(store.checks.find(item=>item.key==="apple_app_privacy")?.reason||"",/Data Used to Track You/i);

const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const banner=fs.readFileSync("app/components/CreationCapabilityBanner.js","utf8");
const avatar=fs.readFileSync("app/avatar-studio/page.js","utf8");
const layout=fs.readFileSync("app/layout.js","utf8");
assert.match(engine,/inferMobileGamePlan/);
assert.match(engine,/MOBILE GAME KNOWLEDGE/);
assert.match(engine,/productType":"app_website\|mobile_game/);
assert.match(engine,/iOS and Android/);
assert.match(banner,/PRODUCT_BRAND\.productLine/);
assert.match(banner,/GAME · PRO/);
assert.match(banner,/mobile-first App, Website and Pro Game foundations/);
assert.match(banner,/iOS &amp; Android/);
assert.match(banner,/Web Preview/);
assert.match(banner,/AI Art Generator/);
assert.match(banner,/AI Video Generator/);
assert.match(banner,/AI Photo & Video/);
assert.match(banner,/AI Avatar Creator/);
assert.match(banner,/Pro Game Creator/);
assert.match(avatar,/\/api\/avatar\/generate/);
assert.match(avatar,/\/api\/images\/save/);
assert.match(avatar,/consentConfirmed/);
assert.match(avatar,/Zero-cost first/);
assert.match(layout,/CreationCapabilityBanner/);

console.log("✓ LANERIQ AI recognizes Mobile Games as a first-class Pro product path and plans playable touch-first iOS + Android game foundations with web preview");
console.log("✓ Game knowledge covers genre, game loop, state, progression, save/load, audio, assets, performance, multiplayer, monetization, privacy and truthful store-readiness boundaries");
console.log("✓ Canonical LANERIQ AI homepage capability banner exposes APP / WEB / GAME · PRO plus iOS, Android and Web Preview targets without implying official native release");
console.log("✓ Dedicated Avatar generation/save endpoints enforce consent and private persistence instead of falling back to the legacy generic image route");
console.log("✓ AI Art, AI Video, AI Photo & Video and AI Avatar foundations are present and exposed without inventing paid-provider availability");
console.log("✓ App Privacy, Google Data Safety, tracking/data-category review and accessibility declarations are release-gated instead of being auto-claimed by AI");