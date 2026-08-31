// SoolenAI Mobile Game Knowledge Core
// Planning + engineering knowledge. It never claims a native binary, store approval,
// paid provider connection, multiplayer backend or purchase succeeded unless verified.

import {buildMobaCapabilityPlan,isMobaIdea} from "./moba-knowledge.js";
import {buildAviationCapabilityPlan,isAirCombatIdea} from "./aviation-knowledge.js";
import {inferGenreSpecialist} from "./genre-specialist-knowledge.js";
import {inferGameTaxonomy} from "./game-taxonomy-knowledge.js";
import {inferAdvancedGenreKnowledge} from "./advanced-game-genre-knowledge.js";
import {buildMmoArchitecturePlan} from "../game/mmo-architecture-v1.js";

const GAME_PATTERNS=[/\bgame\b/i,/gaming/i,/mobile game/i,/iphone game/i,/android game/i,/游戏/,/手游/,/电玩/,/遊戲/];
const GENRES=[
  {id:"moba",label:"MOBA / 5v5 Hero Battler",patterns:[/\bmoba\b/i,/\b5\s?v\s?5\b/i,/三路推塔/,/多人在线战术竞技/,/多人線上戰術競技/,/王者荣耀/,/王者榮耀/]},
  {id:"air_combat",label:"Air Combat / Flight",patterns:[/air combat/i,/dogfight/i,/fighter jet/i,/flight combat/i,/flight simulator/i,/aircraft game/i,/airplane game/i,/warplane/i,/jet fighter/i,/飞机战斗/,/飛機戰鬥/,/空战/,/空戰/,/飞行游戏/,/飛行遊戲/,/飞机游戏/,/飛機遊戲/]},
  {id:"racing",label:"Racing",patterns:[/racing/i,/race car/i,/driving/i,/赛车/,/賽車/]},
  {id:"rpg",label:"RPG / Adventure",patterns:[/\brpg\b/i,/role.?playing/i,/adventure game/i,/角色扮演/,/冒险游戏/,/冒險遊戲/]},
  {id:"action",label:"Action",patterns:[/action game/i,/action adventure/i,/beat.?em.?up/i,/hack.?and.?slash/i,/brawler/i,/动作游戏/,/動作遊戲/,/格斗动作/,/格鬥動作/]},
  {id:"shooter",label:"Shooter",patterns:[/shooter/i,/shooting game/i,/fps/i,/twin.?stick/i,/射击/,/射擊/]},
  {id:"platformer",label:"Platformer / Runner",patterns:[/platformer/i,/platform game/i,/jump game/i,/runner/i,/endless run/i,/跑酷/,/平台跳跃/,/平台跳躍/]},
  {id:"puzzle",label:"Puzzle / Brain",patterns:[/puzzle/i,/brain game/i,/logic game/i,/match.?3/i,/merge game/i,/word game/i,/number game/i,/memory game/i,/益智/,/智力游戏/,/智力遊戲/,/逻辑游戏/,/邏輯遊戲/,/消除/,/拼图/,/拼圖/]},
  {id:"tower_defense",label:"Tower Defense",patterns:[/tower defense/i,/td game/i,/塔防/]},
  {id:"strategy",label:"Strategy",patterns:[/strategy game/i,/tactics/i,/战略游戏/,/策略游戏/,/策略遊戲/]},
  {id:"card",label:"Card / Deck Builder",patterns:[/card game/i,/deck builder/i,/trading card/i,/卡牌/]},
  {id:"simulation",label:"Simulation / Tycoon",patterns:[/simulation game/i,/sim game/i,/tycoon/i,/farm game/i,/city builder/i,/模拟经营/,/模擬經營/,/经营游戏/]},
  {id:"sports",label:"Sports",patterns:[/sports game/i,/football game/i,/basketball game/i,/soccer game/i,/体育游戏/,/體育遊戲/]},
  {id:"rhythm",label:"Rhythm / Music",patterns:[/rhythm/i,/music game/i,/beat game/i,/节奏/,/節奏/]},
  {id:"survival",label:"Survival",patterns:[/survival/i,/roguelike/i,/roguelite/i,/生存/]},
  {id:"educational",label:"Educational",patterns:[/educational game/i,/learning game/i,/quiz game/i,/教育游戏/,/学习游戏/,/學習遊戲/]},
  {id:"idle",label:"Idle / Incremental",patterns:[/idle game/i,/incremental game/i,/clicker/i,/放置游戏/,/放置遊戲/]},
  {id:"arcade",label:"Arcade / Casual",patterns:[/arcade/i,/casual game/i,/hyper.?casual/i,/街机/,/街機/,/休闲游戏/,/休閒遊戲/]},
  {id:"party",label:"Party / Social",patterns:[/party game/i,/social game/i,/minigame/i,/派对游戏/,/派對遊戲/]},
  {id:"multiplayer",label:"Multiplayer",patterns:[/multiplayer/i,/pvp/i,/co.?op/i,/多人/,/联机/,/聯機/]},
];
function text(value){return String(value??"").trim();}
function hasAny(source,patterns){return patterns.some(pattern=>pattern.test(source));}
export function isMobileGameIdea(idea=""){const source=text(idea);return hasAny(source,GAME_PATTERNS)||GENRES.some(genre=>hasAny(source,genre.patterns));}

export function inferMobileGamePlan(idea=""){
  const source=text(idea);if(!isMobileGameIdea(source))return{matched:false,genre:null,genreId:null,brief:""};
  const mobaPlan=buildMobaCapabilityPlan(source);
  const aviationPlan=buildAviationCapabilityPlan(source);
  const specialistPlan=inferGenreSpecialist(source);
  const taxonomyPlan=inferGameTaxonomy(source);
  const advancedPlan=inferAdvancedGenreKnowledge(source,taxonomyPlan.primaryGameplay);
  const isMmo=taxonomyPlan.dimensions.interactionScale==="mmo";
  const mmoPlan=isMmo?buildMmoArchitecturePlan({expectedConcurrentPlayers:1000,worldStyle:"instanced"}):null;
  const specialistGenre=specialistPlan.matched?GENRES.find(item=>item.id===specialistPlan.id):null;
  const taxonomyGenre=GENRES.find(item=>item.id===taxonomyPlan.primaryGameplay);
  const genre=mobaPlan.matched?{id:"moba",label:"MOBA / 5v5 Hero Battler"}:aviationPlan.matched?{id:"air_combat",label:"Air Combat / Flight"}:specialistGenre||taxonomyGenre||GENRES.find(item=>hasAny(source,item.patterns))||{id:"custom",label:"Custom Mobile Game"};
  const taxonomyOnline=taxonomyPlan.dimensions.network==="online"||["small_multiplayer","multiplayer","mmo"].includes(taxonomyPlan.dimensions.interactionScale);
  const wants3d=aviationPlan.matched||/\b3d\b/i.test(source)||/three.?dimensional/i.test(source)||/三维|三維|3D/.test(source),wantsMultiplayer=mobaPlan.matched||aviationPlan.multiplayer||taxonomyOnline||/multiplayer|pvp|co.?op|多人|联机|聯機/i.test(source),wantsAds=/\bads?\b|advertis|rewarded video|interstitial|广告|廣告/i.test(source),wantsIap=/in.?app purchase|iap|purchase|coins|gems|battle pass|内购|內購|充值/i.test(source),wantsCamera=/camera|ar game|augmented reality|相机|相機|增强现实|擴增實境/i.test(source),wantsLocation=/gps|location game|nearby|地图游戏|地圖遊戲|位置游戏|位置遊戲/i.test(source);

  const screens=["Boot / loading","Home / lobby","Gameplay","Pause","Results / rewards","Settings / accessibility"];
  if(wantsMultiplayer)screens.push("Matchmaking / room","Friends / party or session status");if(wantsIap)screens.push("Store / inventory");
  if(mobaPlan.matched)screens.push("Hero select / team composition","Battle HUD / minimap / scoreboard","Item shop","Reconnect / match recovery");
  if(aviationPlan.matched)screens.push("Hangar / aircraft select","Mission briefing","Flight HUD / instruments","Map / navigation","Mission debrief","Controls / realism assists");
  if(specialistPlan.id==="rpg")screens.push("Character / party","Quest journal","Inventory / equipment","World map","Dialogue / NPC","Combat / boss encounter");
  if(specialistPlan.id==="puzzle")screens.push("Puzzle board","Level select","Hints / tutorial","Daily or challenge mode","Completion / score review");
  if(specialistPlan.id==="action")screens.push("Combat HUD","Ability / combo controls","Checkpoint","Boss encounter","Combat results / mastery");
  if(advancedPlan.id==="strategy")screens.push("World / territory map","Base / city","Army / formation","Tech / research");
  if(advancedPlan.id==="racing")screens.push("Garage / vehicle","Track select","Race HUD","Race results / lap times");
  if(advancedPlan.id==="simulation")screens.push("Build / management","Economy dashboard","Population / demand","Scenario goals");
  if(advancedPlan.id==="card")screens.push("Deck builder","Battle board","Collection","Reward / upgrade");
  if(advancedPlan.id==="sports")screens.push("Team / lineup","Match field","Scoreboard","Season / tournament");
  if(advancedPlan.id==="rhythm")screens.push("Song / chart select","Calibration","Performance HUD","Results / accuracy");
  if(advancedPlan.id==="survival")screens.push("Run loadout","Survival field","Upgrade choice","Extraction / run results");
  if(isMmo)screens.push("Server / character entry","Persistent world / instance","Guild / social","Live event / operations status");

  const systems=[
    "core gameplay loop with explicit start, player action, immediate feedback, reward, win/lose and replay states",
    "touch-first controls and input abstraction with drag/D-pad/gesture choices, pointer-cancel recovery, safe areas, optional haptics and keyboard preview",
    "scene/state machine for boot, menu, gameplay, pause, result, victory, game-over and recovery",
    "bounded physics/collision with world bounds, collision layers, damage cooldowns and frame-delta protection",
    "progression with level goals, difficulty curve, checkpoints, tutorial/onboarding, final victory and restart flow",
    "versioned save/load with schema validation, best score, autosave checkpoints, page-hide recovery and optional cloud readiness",
    "audio system with user-controlled SFX/music, no forced autoplay, interruption handling and visible non-audio feedback",
    "optional haptics with user control and graceful no-vibration fallback",
    "camera and presentation rules for framing, shake limits, reduced-motion alternatives, animation and VFX readability",
    "enemy/NPC behavior with bounded spawning, deterministic random seeds for repeatable testing, navigation/pathfinding only when needed",
    "asset pipeline for characters, environments, UI, icons, VFX, animation, texture sizing, compression and originals-only references",
    "performance budgets targeting responsive 60fps where practical, bounded frame delta, entity caps, memory/texture limits, battery and thermal awareness",
    "accessibility with large touch targets, high-contrast option, reduced motion, readable UI, keyboard preview and non-color/non-audio-only feedback",
    "mobile lifecycle recovery for background/foreground, blur, interruption, orientation and input reset so movement never remains stuck",
    "game test matrix covering controls, collision, progression, win/lose, save/load, lifecycle, repeatability, low-resource/degraded states and restart",
    "privacy-minimized analytics and crash diagnostics separated from account-linked data"
  ];
  systems.push(...taxonomyPlan.systems.map(item=>`TAXONOMY: ${item}`));
  if(wantsMultiplayer)systems.push("authoritative multiplayer/session design with reconnect, host/server truth, latency tolerance, anti-cheat boundaries and deterministic reconciliation tests without claiming a live backend");
  if(mobaPlan.matched)systems.push(...Object.values(mobaPlan.systems).flat().map(item=>`MOBA: ${item}`));
  if(aviationPlan.matched)systems.push(...Object.values(aviationPlan.knowledge).flat().map(item=>`AVIATION: ${item}`));
  if(specialistPlan.matched)systems.push(...specialistPlan.systems.map(item=>`${specialistPlan.id.toUpperCase()}: ${item}`));
  if(advancedPlan.matched)systems.push(...advancedPlan.systems.map(item=>`${advancedPlan.id.toUpperCase()}: ${item}`));
  if(isMmo)systems.push(...mmoPlan.domains.map(item=>`MMO ARCHITECTURE: ${item}`),`MMO TRUTH: ${mmoPlan.truthRule}`);
  if(wantsAds)systems.push("ad placement plan that never blocks core play, includes consent/privacy handling and never claims an ad network is connected");
  if(wantsIap)systems.push("virtual-goods economy with receipt-verification readiness, restore-purchases flow, parental safeguards where relevant and no invented transaction success");

  const platformRules=[
    "Target iOS and Android from one product specification and keep a web-preview path for fast playable testing.",
    "Respect iPhone safe areas, readable UI, background/foreground lifecycle, audio interruption and truthful permission prompts.",
    "Respect Android back navigation, diverse ratios, lower-memory devices, lifecycle recreation, permission denial/retry and hardware variation.",
    "Use touch as the default control path; keyboard/gamepad may enhance preview but cannot be required for mobile play.",
    "Prepare identifiers, icons, screenshots, privacy declarations, age/content ratings and signing/store checklists, but never claim an App Store or Google Play submission is completed without evidence."
  ];
  const privacy=[wantsCamera?"Camera requires a truthful purpose and denial fallback.":"Do not request camera unless gameplay needs it.",wantsLocation?"Location requires a truthful purpose, minimum precision and denial fallback.":"Do not request location unless gameplay needs it.",wantsAds?"Tracking/advertising must be separated from essential analytics with consent/ATT handling where required.":"Do not introduce cross-app tracking by default.","Minimize identifiers and telemetry; anonymous diagnostics and account-linked data remain separate.","Children/teen audiences require stronger age, privacy, chat, ads and purchase safeguards."];
  const media=["AI Art Generator: original concept art, backgrounds, characters, props, icons and store artwork.","AI Video Generator: trailers, cutscene concepts, promos and gameplay-storyboard video.","AI Photo & Video Generator: realistic or mixed-media scenes, marketing and store presentation.","AI Avatar Creator: original player avatars, NPC concepts, mascots and profile characters with likeness/privacy safeguards."];
  const rows=[
    "SOOLENAI MOBILE GAME ENGINEERING CORE:",
    `Detected product: Mobile Game. Genre: ${genre.label}. Runtime: ${wants3d?"3D-capable; prove a playable vertical slice before expanding":"2D-first playable vertical slice; expand only after runtime evidence passes"}.`,
    taxonomyPlan.brief,
    `Required game screens: ${screens.join("; ")}.`,
    `Engineering systems: ${systems.join("; ")}.`,
    mobaPlan.matched?mobaPlan.brief:"No dedicated MOBA engineering mode required.",
    aviationPlan.matched?aviationPlan.brief:"No dedicated Aviation / Air Combat engineering mode required.",
    specialistPlan.matched?specialistPlan.brief:"No RPG / Puzzle / Action specialist mode required.",
    advancedPlan.matched?advancedPlan.brief:"No advanced SLG/Racing/SIM/Card/Sports/Rhythm/Survival specialist mode required.",
    isMmo?`MMO ARCHITECTURE MODE: ${mmoPlan.domains.join(", ")}. ${mmoPlan.truthRule}`:"No MMO architecture mode required.",
    `Cross-platform rules: ${platformRules.join(" ")}`,
    `Privacy/store rules: ${privacy.join(" ")}`,
    `Reusable AI media foundation: ${media.join(" ")}`,
    "GAME QUALITY 100 RULE: never label a generated game 100 merely because features were requested. The runtime must pass the evidence-based 100-point gate across Gameplay Loop, Controls, Physics & Collision, Level & Progression, Save & Recovery, Audio & Haptics, iPhone & Android, Performance, Accessibility, and Lifecycle & Reliability. If any evidence is missing, report the real lower score and repair the missing evidence before claiming 100.",
    "Prefer one small complete and fun run with real win/lose, recovery and replay over a large collection of disconnected screens or fake systems.",
    "Use deterministic seeds or equivalent reproducibility for procedural spawns and tests. Bound delta time, entity counts and physics work so unstable frame spikes do not change core rules unpredictably.",
    "For multiplayer, cloud save, ads, payments, push, leaderboards, achievements or social login, create integration-ready contracts and safe-test states; never claim an external service is connected until verified.",
    "Generated games must remain original and must not copy copyrighted characters, logos, maps, levels, audio or proprietary art from reference material."
  ];
  const archetype=mobaPlan.matched?"moba":aviationPlan.matched?"air_combat":genre.id;
  return{matched:true,productType:"mobile_game",genreId:genre.id,genre:genre.label,archetype,dimensions:wants3d?"3d-capable":"adaptive-2d-3d",platforms:["ios","android","web-preview"],screens,systems,multiplayer:wantsMultiplayer,taxonomy:taxonomyPlan.dimensions,hybridGameplay:{primary:taxonomyPlan.primaryGameplay,secondary:taxonomyPlan.secondaryGameplay,hybrid:taxonomyPlan.dimensions.hybrid},moba:mobaPlan.matched?mobaPlan:null,aviation:aviationPlan.matched?aviationPlan:null,specialist:specialistPlan.matched?specialistPlan:null,advancedGenre:advancedPlan.matched?advancedPlan:null,mmoArchitecture:mmoPlan,monetization:{ads:wantsAds,inAppPurchases:wantsIap},permissions:{camera:wantsCamera,location:wantsLocation},mediaCapabilities:["ai-art","ai-video","ai-photo-video","ai-avatar"],qualityTarget:100,qualityDimensions:["gameplay","controls","physics","progression","save","feedback","mobile","performance","accessibility","reliability"],brief:rows.join("\n")};
}
export const MOBILE_GAME_GENRES=Object.freeze(GENRES.map(({id,label})=>({id,label})));
export {isMobaIdea,isAirCombatIdea};
