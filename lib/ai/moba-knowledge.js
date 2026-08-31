// Original-first MOBA engineering knowledge for SoolenAI.
// This module models a genre, never a specific commercial game's protected characters,
// maps, artwork, audio, names, numeric balance data or proprietary content.

const MOBA_PATTERNS=[/\bmoba\b/i,/\b5\s?v\s?5\b/i,/three.?lane/i,/lane.?based/i,/hero battler/i,/arena battler/i,/多人在线战术竞技/,/多人線上戰術競技/,/三路推塔/,/推塔游戏/,/推塔遊戲/,/王者荣耀/,/王者榮耀/];
function text(value){return String(value??"").trim();}
function hasAny(source,patterns){return patterns.some(pattern=>pattern.test(source));}

export function isMobaIdea(idea=""){return hasAny(text(idea),MOBA_PATTERNS);}

export const MOBA_ROLES=Object.freeze([
  {id:"vanguard",label:"Vanguard / Tank",purpose:"initiate, absorb pressure and protect allies"},
  {id:"fighter",label:"Fighter",purpose:"sustained melee pressure and side-lane dueling"},
  {id:"assassin",label:"Assassin / Jungler",purpose:"mobility, pickoffs, jungle pressure and objective timing"},
  {id:"mage",label:"Mage",purpose:"ability damage, area control and wave clear"},
  {id:"marksman",label:"Marksman",purpose:"ranged sustained damage and structure pressure"},
  {id:"support",label:"Support",purpose:"vision, protection, crowd control, healing or utility"},
]);

export function buildMobaCapabilityPlan(idea=""){
  const source=text(idea);if(!isMobaIdea(source))return{matched:false,archetype:null,brief:""};
  const wantsRanked=/ranked|ranking|ladder|排位|天梯/i.test(source),wantsVoice=/voice chat|team voice|语音|語音/i.test(source),wantsSpectator=/spectat|观战|觀戰/i.test(source);
  const systems={
    match:["5v5 team assignment","three lanes plus jungle","spawn/base zones","core-destruction win condition","surrender/reconnect readiness","match clock and post-match result"],
    map:["top/mid/bottom lanes","jungle routes and neutral camps","defensive towers","team cores","brush/fog-of-war zones","safe spawn areas","objective pits","navigation graph and collision layers"],
    hero:["base and growth stats","level progression","basic attack","passive","three normal abilities","ultimate ability","cooldown and resource costs","cast range and targeting shape","crowd-control states","shield/heal/damage effects","death and respawn"],
    combat:["physical/magic/true damage categories","armor/resistance mitigation","attack speed and movement caps","projectile/skill-shot/AOE targeting","crowd-control duration and immunity rules","damage ownership","kill/assist attribution","tower aggro rules","non-player objective damage rules"],
    economy:["gold and experience","last-hit or participation rules configurable by design","kill/assist/objective rewards","item shop","item slots","stat modifiers","purchase validation","sell/refund policy","team snowball guardrails"],
    lane:["timed minion waves","melee/ranged/siege unit roles","lane navigation","wave target priority","tower engagement","base-to-lane spawning","bounded entity counts"],
    jungle:["neutral camps","respawn timers","team-neutral objectives","buff/effect contracts","objective contest logic","anti-double-reward guards"],
    ai:["lane assignment","farm/retreat/engage/objective decisions","threat scoring","target priority","path recovery","ability timing","team grouping","difficulty presets","deterministic bot tests"],
    controls:["left virtual movement stick","right-side attack and skill buttons","drag-to-aim skill indicator","tap target selection","camera follow/pan","cancel-cast gesture","haptics and accessibility options"],
    multiplayer:["authoritative server truth","fixed simulation tick","input sequence numbers","snapshot interpolation","client prediction where safe","reconciliation","reconnect and state resync","latency budget","rate limits","anti-cheat validation","matchmaking readiness","party/room readiness"],
    performance:["60fps mobile target where device permits","bounded hero/minion/projectile counts","pooled transient effects","spatial queries","visibility culling","texture/memory budgets","thermal/battery awareness","degraded-effects mode"],
    safety:["original characters and map language only","no copied commercial hero kits","no copied map geometry or art","age/privacy-aware chat design","purchases require verified provider integration","external multiplayer must never be claimed live without evidence"],
  };
  const rows=[
    "SOOLENAI MOBA ENGINEERING MODE:",
    "Build an original 5v5 lane-based MOBA architecture. Treat commercial MOBA references only as genre-level intent; never copy protected characters, names, map layouts, artwork, audio, exact balance numbers or proprietary skill kits.",
    `Match systems: ${systems.match.join("; ")}.`,
    `Map systems: ${systems.map.join("; ")}.`,
    `Hero systems: ${systems.hero.join("; ")}.`,
    `Combat systems: ${systems.combat.join("; ")}.`,
    `Economy systems: ${systems.economy.join("; ")}.`,
    `Lane/minion systems: ${systems.lane.join("; ")}.`,
    `Jungle/objective systems: ${systems.jungle.join("; ")}.`,
    `Bot AI systems: ${systems.ai.join("; ")}.`,
    `Mobile controls: ${systems.controls.join("; ")}.`,
    `Online architecture: ${systems.multiplayer.join("; ")}.`,
    `Performance: ${systems.performance.join("; ")}.`,
    "Start with a deterministic 5v5 bot training arena that proves movement, targeting, abilities, cooldowns, minion waves, towers, economy, leveling, death/respawn and core-destruction victory. Only then expand to real online matchmaking/server infrastructure.",
    wantsRanked?"Ranked requested: add MMR/season/reward contracts, placement rules, anti-smurf/abuse review and server-authoritative results; do not invent a live ladder.":"Do not add ranked mode unless requested or product scope justifies it.",
    wantsVoice?"Voice requested: keep it provider-neutral, opt-in, mute/block/report capable and privacy/age gated; do not claim a voice provider is connected.":"Voice chat is not required by default.",
    wantsSpectator?"Spectator requested: design delayed/sanitized state replication and anti-stream-sniping controls.":"Spectator mode is optional.",
  ];
  return{matched:true,archetype:"moba",genre:"MOBA",teamSize:5,lanes:3,onlineRequiredForProductionPvP:true,trainingArenaBots:true,roles:MOBA_ROLES,systems,features:{ranked:wantsRanked,voice:wantsVoice,spectator:wantsSpectator},brief:rows.join("\n")};
}
