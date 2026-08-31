function text(value){return String(value??"").trim();}
function has(source,patterns){return patterns.some(pattern=>pattern.test(source));}

const RPG_PATTERNS=[/\brpg\b/i,/role.?playing/i,/action rpg/i,/jrpg/i,/adventure rpg/i,/角色扮演/,/冒险游戏/,/冒險遊戲/];
const PUZZLE_PATTERNS=[/puzzle/i,/brain game/i,/logic game/i,/match.?3/i,/merge game/i,/word game/i,/number game/i,/memory game/i,/益智/,/智力游戏/,/智力遊戲/,/逻辑游戏/,/邏輯遊戲/,/消除/,/拼图/,/拼圖/];
const ACTION_PATTERNS=[/action game/i,/action adventure/i,/beat.?em.?up/i,/hack.?and.?slash/i,/brawler/i,/character action/i,/动作游戏/,/動作遊戲/,/格斗动作/,/格鬥動作/];

export function inferGenreSpecialist(idea=""){
  const source=text(idea);if(has(source,RPG_PATTERNS))return buildRpgKnowledge();if(has(source,PUZZLE_PATTERNS))return buildPuzzleKnowledge();if(has(source,ACTION_PATTERNS))return buildActionKnowledge();return{matched:false,id:null,brief:"",systems:[]};
}

export function buildRpgKnowledge(){
  const systems=[
    "character model with attributes, health/resource, level, experience, status effects and derived stats",
    "class/archetype design with original abilities, passive identity, role strengths, counters and respec boundaries",
    "combat model chosen deliberately: turn-based, tactical, real-time action or hybrid; never mix incompatible rules accidentally",
    "quest graph with main quests, side quests, prerequisites, branching outcomes, fail/abandon/retry rules and persistent quest state",
    "NPC state, dialogue choices, relationship/reputation flags and world reactions stored independently from presentation text",
    "inventory with item identity, stack rules, equipment slots, consumables, quest items, capacity policy and safe serialization",
    "equipment and loot with rarity/affix rules, comparison, upgrade/salvage loops and no pay-to-win assumption",
    "world/map structure with areas, traversal gates, checkpoints, fast travel, encounter zones and discovered-state persistence",
    "party/companion model with roles, commands, progression, affinity and revive/downed behavior when relevant",
    "enemy and boss AI with telegraphed attacks, phases, resistances, readable counters and deterministic test scenarios",
    "economy with currencies, shops, rewards, sinks, anti-inflation tuning and transaction rollback readiness",
    "save system with player, quests, inventory, world flags, dialogue choices, boss state and migration/version validation",
    "narrative state separated from copyrighted reference material; generated names, lore, factions, maps and characters must be original",
    "mobile UX for inventory, dialogue, combat abilities, maps and touch targets with pause/background recovery",
    "RPG test matrix covering quest soft-locks, inventory duplication, save migration, boss reset, dialogue branching and progression blockers"
  ];
  return{matched:true,id:"rpg",label:"RPG / Adventure Engineering Mode",systems,brief:["SOOLENAI RPG ENGINEERING MODE:",...systems.map(item=>`RPG: ${item}.`),"Build a small complete playable quest first: explore -> interact -> encounter -> reward -> progression -> save -> resume. Never substitute a collection of menu screens for an actual RPG loop."].join("\n")};
}

export function buildPuzzleKnowledge(){
  const families=["match / elimination","logic deduction","number / arithmetic","word / language","memory","spatial / rotation","pattern recognition","path / routing","physics puzzle","sorting / organization","merge / combine","escape-room style clue chain"];
  const systems=[
    `puzzle family chosen explicitly from: ${families.join(", ")}`,
    "formal board/state representation so rules are testable independently from animation",
    "valid-move generator and completion detector; when a puzzle can become unsolvable, detect dead states and reshuffle/recover fairly",
    "difficulty curve controlled through branching factor, board size, time/move limits, rule combinations and information visibility rather than arbitrary frustration",
    "deterministic seeded level generation with validation so generated puzzles are solvable before being shown",
    "hint system that reveals the minimum useful next step and never silently performs paid or destructive actions",
    "undo/restart rules with state snapshots where the puzzle family permits them",
    "scoring using moves, time, accuracy, combo or optional challenge goals without making completion dependent on opaque randomness",
    "accessibility with color-independent symbols, large targets, optional timers, readable typography and reduced animation",
    "tutorialization through one concept at a time followed by mastery checks and mixed-rule levels",
    "daily/challenge generation may be seeded and repeatable but must not claim remote leaderboard verification unless a backend is live",
    "brain-game claims must avoid medical, IQ-improvement or cognitive-health promises unless independently substantiated",
    "puzzle test matrix covering solvability, no-move state, hint correctness, undo integrity, deterministic generation, edge boards and completion detection"
  ];
  return{matched:true,id:"puzzle",label:"Puzzle / Brain Game Engineering Mode",families,systems,brief:["SOOLENAI PUZZLE / BRAIN GAME ENGINEERING MODE:",...systems.map(item=>`PUZZLE: ${item}.`),"A puzzle is not complete because pieces move. Every generated level must have a valid state model, a proven completion condition and solvability evidence before it can be scored 100."].join("\n")};
}

export function buildActionKnowledge(){
  const systems=[
    "responsive movement state machine with idle, run, jump/air, dodge, attack, hit, downed/dead and recovery states as required by the game",
    "input buffer and action priority rules so taps feel responsive without allowing impossible animation-state exploits",
    "attack data with startup, active and recovery timing represented as game data rather than animation guesses",
    "hitbox/hurtbox layers, team/faction filtering, invulnerability frames and damage cooldown rules",
    "combo system with explicit chain windows, cancel rules, finishers and reset conditions",
    "dodge/parry/block mechanics with readable timing windows, feedback and accessibility assists when requested",
    "stamina, energy or cooldown resources with bounded regeneration and no hidden player disadvantage",
    "enemy AI using approach, spacing, attack, evade, stagger, retreat and group-pressure decisions with entity caps",
    "boss encounters with telegraphs, phases, punish windows, checkpoint restart and deterministic behavior tests",
    "camera system with follow/look-ahead, shake limits, target framing, obstacle handling and reduced-motion alternatives",
    "combat feedback with hit-stop abstraction, VFX, sound, haptics and non-audio/non-color-only cues while preserving 60fps budget",
    "checkpoint and restart flow that restores valid combat state instead of respawning into unavoidable damage",
    "mobile controls with move stick, action buttons, context targeting/aim, large touch areas and simultaneous multi-touch support",
    "performance budgets for active enemies, hit effects, particles, ragdoll-like effects and animation updates",
    "action-game test matrix covering input cancellation, combo timing, hit registration, i-frames, boss phases, checkpoint reset, touch concurrency and frame spikes"
  ];
  return{matched:true,id:"action",label:"Action Game Engineering Mode",systems,brief:["SOOLENAI ACTION GAME ENGINEERING MODE:",...systems.map(item=>`ACTION: ${item}.`),"Prioritize combat feel and deterministic hit rules before adding content volume. A beautiful action demo with unreliable input, hit detection or checkpoints cannot score 100."].join("\n")};
}

export const GENRE_SPECIALIST_MODES=Object.freeze(["rpg","puzzle","action"]);
