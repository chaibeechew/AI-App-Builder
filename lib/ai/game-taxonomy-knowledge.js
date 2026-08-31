// SoolenAI multidimensional game taxonomy.
// Classifies a game across network, core gameplay, theme/world, interaction scale and hybrid composition.

import {inferGamePlatformCapabilities} from "../game/game-platform-systems-v1.js";
import {inferWorld3dCapabilities} from "../game/world-3d-systems-v1.js";
import {inferRpgOpenWorldCapabilities} from "../game/rpg-open-world-systems-v1.js";
import {inferAdvanced3dGameplayCapabilities} from "../game/advanced-3d-gameplay-systems-v1.js";
import {inferAaaMobileProductionCapabilities} from "../game/aaa-mobile-production-systems-v1.js";

const NETWORK_MODES=Object.freeze([
  {id:"offline_single_player",label:"Offline / Single-device",patterns:[/offline/i,/single.?player/i,/单机/,/單機/,/无需联网/,/無需聯網/]},
  {id:"online",label:"Online",patterns:[/online/i,/联网/,/聯網/,/network game/i]},
  {id:"online_multiplayer",label:"Online Multiplayer",patterns:[/multiplayer/i,/pvp/i,/co.?op/i,/联机多人/,/聯機多人/,/多人在线/,/多人線上/]},
]);

const PLAY_STYLES=Object.freeze([
  {id:"rpg",label:"RPG / Role-playing",patterns:[/\brpg\b/i,/role.?playing/i,/角色扮演/]},
  {id:"strategy",label:"SLG / Strategy",patterns:[/\bslg\b/i,/strategy/i,/tactics/i,/策略/,/战略/,/戰略/]},
  {id:"action",label:"ACT / Action",patterns:[/\bact\b/i,/action game/i,/动作游戏/,/動作遊戲/,/hack.?and.?slash/i,/brawler/i]},
  {id:"shooter",label:"STG / FPS / TPS Shooter",patterns:[/\bstg\b/i,/\bfps\b/i,/\btps\b/i,/shooter/i,/shooting/i,/射击/,/射擊/]},
  {id:"moba",label:"MOBA",patterns:[/\bmoba\b/i,/5\s?v\s?5/i,/战术竞技/,/戰術競技/,/三路推塔/]},
  {id:"racing",label:"RAC / Racing",patterns:[/\brac\b/i,/racing/i,/race car/i,/赛车/,/賽車/]},
  {id:"simulation",label:"SIM / Simulation & Management",patterns:[/\bsim\b/i,/simulation/i,/tycoon/i,/city builder/i,/模拟经营/,/模擬經營/]},
  {id:"puzzle",label:"Puzzle / Brain",patterns:[/puzzle/i,/brain game/i,/match.?3/i,/logic game/i,/益智/,/智力/,/消除/]},
  {id:"card",label:"Card / Deck Builder",patterns:[/card game/i,/deck builder/i,/卡牌/]},
  {id:"rhythm",label:"Music / Rhythm",patterns:[/rhythm/i,/music game/i,/节奏/,/節奏/,/音乐游戏/,/音樂遊戲/]},
  {id:"sports",label:"Sports",patterns:[/sports game/i,/football/i,/basketball/i,/soccer/i,/体育/,/體育/]},
  {id:"platformer",label:"Platformer / Runner",patterns:[/platformer/i,/runner/i,/平台跳跃/,/平台跳躍/,/跑酷/]},
  {id:"tower_defense",label:"Tower Defense",patterns:[/tower defense/i,/塔防/]},
  {id:"survival",label:"Survival / Roguelite",patterns:[/survival/i,/roguelike/i,/roguelite/i,/生存/]},
  {id:"idle",label:"Idle / Incremental",patterns:[/idle/i,/incremental/i,/放置/]},
  {id:"party",label:"Party / Social",patterns:[/party game/i,/social game/i,/派对/,/派對/]},
]);

const THEMES=Object.freeze([
  {id:"xianxia",label:"Xianxia / Immortal fantasy",patterns:[/仙侠/,/仙俠/,/修仙/]},
  {id:"wuxia",label:"Wuxia / Martial arts",patterns:[/武侠/,/武俠/,/江湖/]},
  {id:"history",label:"Historical",patterns:[/历史/,/歷史/,/三国/,/三國/,/ancient empire/i,/historical/i]},
  {id:"fantasy",label:"Fantasy",patterns:[/fantasy/i,/魔幻/,/奇幻/]},
  {id:"science_fiction",label:"Science Fiction",patterns:[/sci.?fi/i,/science fiction/i,/科幻/,/太空/]},
  {id:"modern",label:"Modern / Contemporary",patterns:[/modern/i,/现代/,/現代/,/都市/]},
  {id:"military",label:"Military",patterns:[/military/i,/战争/,/戰爭/,/军事/,/軍事/]},
  {id:"aviation",label:"Aviation",patterns:[/aviation/i,/air combat/i,/aircraft/i,/飞机/,/飛機/,/空战/,/空戰/]},
  {id:"sports",label:"Sports",patterns:[/sports/i,/足球/,/篮球/,/籃球/,/赛车/,/賽車/]},
  {id:"cute_casual",label:"Cute / Casual",patterns:[/cute/i,/casual/i,/萌/,/可爱/,/可愛/,/休闲/,/休閒/]},
  {id:"horror",label:"Horror",patterns:[/horror/i,/恐怖/,/惊悚/,/驚悚/]},
]);

const INTERACTION_SCALES=Object.freeze([
  {id:"solo",label:"Single Player",patterns:[/single.?player/i,/solo/i,/单人/,/單人/,/单机/,/單機/]},
  {id:"small_multiplayer",label:"Small-group Multiplayer",patterns:[/co.?op/i,/2v2/i,/3v3/i,/4v4/i,/5v5/i,/小队/,/小隊/,/组队/,/組隊/]},
  {id:"multiplayer",label:"Multiplayer",patterns:[/multiplayer/i,/多人/]},
  {id:"mmo",label:"MMO / Massively Multiplayer Online",patterns:[/\bmmo\b/i,/\bmmorpg\b/i,/massively multiplayer/i,/大型多人在线/,/大型多人線上/]},
]);

function matches(source,entry){return entry.patterns.some(pattern=>pattern.test(source));}
function pickAll(source,entries){return entries.filter(entry=>matches(source,entry)).map(({id,label})=>({id,label}));}

export function inferGameTaxonomy(idea=""){
  const source=String(idea||"").trim();
  const networkMatches=pickAll(source,NETWORK_MODES);
  const gameplay=pickAll(source,PLAY_STYLES);
  const themes=pickAll(source,THEMES);
  const scaleMatches=pickAll(source,INTERACTION_SCALES);
  const platformCapabilities=inferGamePlatformCapabilities(source);
  const world3d=inferWorld3dCapabilities(source);
  const rpgOpenWorld=inferRpgOpenWorldCapabilities(source);
  const advanced3d=inferAdvanced3dGameplayCapabilities(source);
  const aaaMobileProduction=inferAaaMobileProductionCapabilities(source);
  const explicitOffline=networkMatches.some(item=>item.id==="offline_single_player")||/不需要联网|不需要聯網|无需联网|無需聯網|不用联网|不用聯網|离线|離線/i.test(source);
  const negatedOnline=/不需要联网|不需要聯網|无需联网|無需聯網|不用联网|不用聯網/i.test(source);
  const explicitScaleOnline=scaleMatches.some(item=>item.id!=="solo");
  const explicitOnline=explicitScaleOnline||(!negatedOnline&&networkMatches.some(item=>item.id!=="offline_single_player"));
  const network=explicitOffline&&!explicitOnline?"offline_single_player":explicitOnline?"online":"unspecified";
  const interactionScale=scaleMatches.at(-1)?.id||(explicitOffline?"solo":"unspecified");
  const hybrid=gameplay.length>1;
  const primaryGameplay=gameplay[0]?.id||"custom";
  const secondaryGameplay=gameplay.slice(1).map(item=>item.id);
  const systems=[];
  if(network==="offline_single_player")systems.push("Offline-first save, deterministic local state and no mandatory network dependency for core play.");
  if(network==="online")systems.push("Network-aware session state, disconnect handling, reconnect and truthful server-readiness boundaries.");
  if(interactionScale==="mmo")systems.push("MMO architecture requires authoritative shards/instances, persistence, social moderation, concurrency budgets and live-operations evidence before production claims.");
  if(hybrid)systems.push(`Hybrid design: choose one dominant core loop (${primaryGameplay}) and make ${secondaryGameplay.join(", ")} supporting loops rather than competing primary loops.`);
  systems.push("Theme/world setting changes narrative, art direction, progression vocabulary and content rules, but must not silently replace the core gameplay classification.");
  systems.push(...platformCapabilities.systems.map(item=>`PLATFORM SYSTEM: ${item}`));
  if(world3d.systems.length)systems.push(...world3d.systems.map(item=>`3D WORLD: ${item}`));
  if(rpgOpenWorld.matched)systems.push(...rpgOpenWorld.systems.map(item=>`RPG/OPEN WORLD: ${item}`));
  if(advanced3d.matched)systems.push(...advanced3d.systems.map(item=>`ADVANCED 3D GAMEPLAY: ${item}`));
  if(aaaMobileProduction.matched)systems.push(...aaaMobileProduction.systems.map(item=>`AAA MOBILE PRODUCTION: ${item}`));
  systems.push(`PLATFORM TRUTH: ${platformCapabilities.truthRule}`);
  if(world3d.systems.length)systems.push(`3D WORLD TRUTH: ${world3d.truthRule}`);
  if(rpgOpenWorld.matched)systems.push(`RPG/OPEN WORLD TRUTH: ${rpgOpenWorld.truthRule}`);
  if(advanced3d.matched)systems.push(`ADVANCED 3D TRUTH: ${advanced3d.truthRule}`);
  if(aaaMobileProduction.matched)systems.push(`AAA MOBILE PRODUCTION TRUTH: ${aaaMobileProduction.truthRule}`);
  return {
    dimensions:{network,gameplay,theme:themes,interactionScale,hybrid},
    primaryGameplay,
    secondaryGameplay,
    matchedGameplay:gameplay,
    platformCapabilities,
    world3d,
    rpgOpenWorld,
    advanced3d,
    aaaMobileProduction,
    systems,
    brief:[
      "SOOLENAI MULTIDIMENSIONAL GAME TAXONOMY:",
      `Network requirement: ${network}.`,
      `Core gameplay: ${gameplay.length?gameplay.map(item=>item.label).join(" + "):"custom / infer from the idea"}.`,
      `Theme/world: ${themes.length?themes.map(item=>item.label).join(" + "):"infer from customer intent; do not force one"}.`,
      `Interaction scale: ${interactionScale}.`,
      `Hybrid composition: ${hybrid?`yes — primary ${primaryGameplay}; supporting ${secondaryGameplay.join(", ")}`:"no explicit multi-genre fusion detected"}.`,
      `Platform systems: replay, spectator, guild/clan, leaderboard, achievements, cloud-save and UGC are understood as composable contracts; explicitly requested: ${platformCapabilities.requested.length?platformCapabilities.requested.join(", "):"none"}.`,
      `3D world needs: ${world3d.systems.length?world3d.systems.join(" "):"no dedicated 3D world extension inferred"}.`,
      `RPG/open-world depth: ${rpgOpenWorld.matched?rpgOpenWorld.systems.join(" "):"no dedicated deep RPG/open-world extension inferred"}.`,
      `Advanced 3D gameplay: ${advanced3d.matched?advanced3d.systems.join(" "):"no dedicated advanced 3D gameplay extension inferred"}.`,
      `AAA mobile production: ${aaaMobileProduction.matched?aaaMobileProduction.systems.join(" "):"no dedicated AAA mobile production extension inferred"}.`,
      `Architecture implications: ${systems.join(" ")}`,
      "Games may legitimately combine multiple genres. Preserve a clear dominant core loop, then layer secondary systems so the product remains understandable, testable and fun."
    ].join("\n")
  };
}

export const GAME_TAXONOMY=Object.freeze({network:NETWORK_MODES,gameplay:PLAY_STYLES,themes:THEMES,interactionScales:INTERACTION_SCALES});
