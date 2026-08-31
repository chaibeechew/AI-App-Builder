function text(value){return String(value??"").trim().toLowerCase();}

export const GENRE_RUNTIME_PROFILES=Object.freeze({
  arcade:{label:"Arcade / Casual",controls:["touch-stick","tap"],goal:"score-and-clear",fail:"health-or-timer",progression:"short-levels",runtime:"game-runtime-v1"},
  racing:{label:"Racing",controls:["steering","throttle","brake"],goal:"checkpoints-and-finish",fail:"time-or-race-position",progression:"tracks-and-vehicles",runtime:"advanced-genre-runtime-v1"},
  shooter:{label:"Shooter",controls:["move-stick","aim-stick","fire"],goal:"combat-objectives",fail:"health-or-mission",progression:"encounters-and-bosses",runtime:"remaining-genre-runtime-v1"},
  action:{label:"Action",controls:["move-stick","attack","dodge","heavy-or-ability"],goal:"clear-combat-encounter",fail:"health-or-objective",progression:"encounters-checkpoints-mastery",runtime:"specialist-runtime-v1"},
  platformer:{label:"Platformer / Runner",controls:["move","jump","dash"],goal:"reach-exit-or-distance",fail:"hazard-or-time",progression:"stages-and-checkpoints",runtime:"remaining-genre-runtime-v1"},
  puzzle:{label:"Puzzle / Brain",controls:["tap","drag","swap","hint","undo"],goal:"solve-board-or-target",fail:"moves-or-time",progression:"boards-rules-difficulty",runtime:"specialist-runtime-v1"},
  tower_defense:{label:"Tower Defense",controls:["place","select","upgrade"],goal:"survive-waves",fail:"base-health",progression:"waves-and-tech",runtime:"remaining-genre-runtime-v1"},
  rpg:{label:"RPG / Adventure",controls:["move","interact","attack-or-ability"],goal:"quests-and-encounters",fail:"health-or-objective",progression:"xp-quests-inventory-world-state",runtime:"specialist-runtime-v1"},
  survival:{label:"Survival / Roguelite",controls:["move","aim","ability"],goal:"survive-and-extract",fail:"health",progression:"runs-upgrades-unlocks",runtime:"advanced-genre-runtime-v1"},
  strategy:{label:"Strategy",controls:["select","pan","command"],goal:"economy-and-objectives",fail:"base-or-objective",progression:"missions-and-tech",runtime:"advanced-genre-runtime-v1"},
  card:{label:"Card / Deck Builder",controls:["tap","drag-card"],goal:"win-encounters",fail:"health-or-round",progression:"deck-and-relics",runtime:"advanced-genre-runtime-v1"},
  simulation:{label:"Simulation / Tycoon",controls:["select","place","manage"],goal:"grow-system",fail:"resource-or-scenario",progression:"economy-and-unlocks",runtime:"advanced-genre-runtime-v1"},
  sports:{label:"Sports",controls:["move","action","pass-or-shot"],goal:"score-more",fail:"match-result",progression:"matches-and-seasons",runtime:"advanced-genre-runtime-v1"},
  rhythm:{label:"Rhythm / Music",controls:["timed-tap","hold","swipe"],goal:"accuracy-and-combo",fail:"performance-meter",progression:"songs-and-difficulty",runtime:"advanced-genre-runtime-v1"},
  idle:{label:"Idle / Incremental",controls:["tap","upgrade"],goal:"resource-growth",fail:"challenge-goal",progression:"prestige-and-upgrades",runtime:"remaining-genre-runtime-v1"},
  party:{label:"Party / Social",controls:["ready","timed-action","bonus"],goal:"win-rounds",fail:"match-result",progression:"rounds-and-rematches",runtime:"remaining-genre-runtime-v1"},
  educational:{label:"Educational / Learning",controls:["answer","hint","review"],goal:"demonstrate-mastery",fail:"mastery-threshold",progression:"adaptive-difficulty-and-review",runtime:"remaining-genre-runtime-v1"},
  moba:{label:"MOBA",controls:["move-stick","aim-skills","attack","target"],goal:"destroy-team-core",fail:"team-core-destroyed",progression:"match-level-gold-items",runtime:"moba-runtime-v1"},
  air_combat:{label:"Air Combat / Flight",controls:["pitch-roll-stick","throttle","yaw","target","fire"],goal:"mission-objectives",fail:"aircraft-disabled-or-time",progression:"missions-aircraft-pilot",runtime:"air-combat-runtime-v1"},
});

export function inferGenreRuntimeProfile(game={}){
  const archetype=text(game?.archetype),genre=text(game?.genre||game?.genreLabel);
  if(archetype&&GENRE_RUNTIME_PROFILES[archetype])return{id:archetype,...GENRE_RUNTIME_PROFILES[archetype]};
  const rules=[
    ["air_combat",/air combat|flight|fighter jet|dogfight/],["moba",/moba|5v5|hero battler/],["tower_defense",/tower defense|塔防/],["platformer",/platform|runner|跑酷/],["racing",/racing|race|driving|赛车/],["shooter",/shooter|shooting|fps|tps|stg|射击|射擊/],["action",/action game|action adventure|hack.?and.?slash|brawler|动作游戏|動作遊戲/],["puzzle",/puzzle|brain game|logic game|match.?3|merge|智力游戏|智力遊戲|消除|益智/],["rpg",/rpg|role.?playing|adventure|角色扮演/],["survival",/survival|roguelike|roguelite|生存/],["strategy",/strategy|tactics|策略/],["card",/card|deck|卡牌/],["simulation",/simulation|tycoon|经营/],["sports",/sports|football|basketball|soccer|体育/],["rhythm",/rhythm|music game|节奏/],["idle",/idle|incremental|clicker|放置/],["party",/party|social|minigame|派对|派對/],["educational",/educational|learning|quiz|教育|学习|學習/]
  ];
  const match=rules.find(([,pattern])=>pattern.test(genre));const id=match?.[0]||"arcade";return{id,...GENRE_RUNTIME_PROFILES[id]};
}

export function buildGenreRuntimeContract(game={}){
  const profile=inferGenreRuntimeProfile(game);return{
    profile,
    requirements:[
      `Controls must implement ${profile.controls.join(", ")}.`,
      `Primary goal must behave as ${profile.goal}.`,
      `Failure state must behave as ${profile.fail}.`,
      `Progression must be designed around ${profile.progression}.`,
      `Preferred runtime family: ${profile.runtime}.`,
      "Do not claim genre-specific runtime completeness when only a generic arcade loop is rendered."
    ]
  };
}
