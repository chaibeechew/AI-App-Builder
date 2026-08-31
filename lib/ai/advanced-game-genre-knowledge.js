// SoolenAI advanced mobile-game genre knowledge.
// These plans describe product/game engineering requirements; runtime completeness still requires evidence.

const PROFILES=Object.freeze({
  strategy:{label:"SLG / Strategy",patterns:[/\bslg\b/i,/strategy/i,/tactics/i,/策略/,/战略/,/戰略/],systems:[
    "resource economy with sources, sinks, storage caps and anti-snowball balancing",
    "base/city development with build queues, upgrades, prerequisites and clear dependency graph",
    "unit composition with roles, counters, formation intent and bounded population/capacity",
    "fog/visibility or information-control rules when strategically useful",
    "territory/objective control with explicit victory conditions instead of endless resource accumulation",
    "AI commander priorities for economy, defense, scouting, reinforcement and objective pressure",
    "deterministic battle resolution or bounded real-time simulation that can be replay-tested",
    "campaign/tech progression separated from one-match tactical state"
  ]},
  racing:{label:"RAC / Racing",patterns:[/\brac\b/i,/racing/i,/race car/i,/driving game/i,/赛车/,/賽車/],systems:[
    "vehicle dynamics profile for acceleration, braking, steering, grip, drift assist and collision recovery",
    "track checkpoints, lap validation, wrong-way detection and finish-order evidence",
    "camera/readability rules for speed, upcoming turns, rivals and mobile field of view",
    "opponent racing line AI with overtake, recovery and bounded aggression",
    "vehicle/track progression with upgrades that preserve competitive handling balance",
    "mobile steering options: touch wheel/slider, tilt optional, buttons, brake/throttle and assists",
    "race timing with best lap, split/checkpoint time and restart-safe deterministic start grid"
  ]},
  simulation:{label:"SIM / Simulation & Tycoon",patterns:[/\bsim\b/i,/simulation/i,/tycoon/i,/city builder/i,/模拟经营/,/模擬經營/,/经营游戏/,/經營遊戲/],systems:[
    "simulation clock with pause/speed control and deterministic day/tick progression",
    "resource production/consumption loops with capacity, demand and bottleneck feedback",
    "build/place/upgrade lifecycle with cost, capacity and adjacency/requirement rules where relevant",
    "population/customer/agent needs translated into readable satisfaction and demand signals",
    "economy with cashflow, recurring costs, pricing/revenue and fail-closed bankruptcy/scenario limits",
    "scenario goals and milestones so the simulation has measurable success beyond endless growth",
    "save-safe world state and migration rules because simulation sessions are long-lived"
  ]},
  card:{label:"Card / Deck Builder",patterns:[/card game/i,/deck builder/i,/trading card/i,/卡牌/],systems:[
    "deck/hand/discard/exhaust zones with explicit ownership and deterministic shuffle seed",
    "turn/priority state machine so cards cannot resolve outside legal timing windows",
    "cost/resource system with bounded generation and validation before card resolution",
    "card effects expressed as data-driven actions rather than hard-coded presentation only",
    "target validation, status effects, draw/discard and win/lose resolution",
    "deck construction/progression separated from battle state and protected by save schema",
    "AI opponent evaluates legal moves and board value without seeing hidden player information"
  ]},
  sports:{label:"Sports",patterns:[/sports game/i,/football game/i,/basketball game/i,/soccer game/i,/体育游戏/,/體育遊戲/,/足球游戏/,/籃球遊戲/],systems:[
    "match clock/period state with kickoff/start, pause, score and final-result rules",
    "possession/control model with movement, pass/action, shot/attempt and defense",
    "team positioning AI with role spacing, support and transition between attack/defense",
    "stamina/skill influence that changes probability/readability without overriding player input",
    "rules/penalties kept genre-appropriate and simplified when mobile readability benefits",
    "season/tournament progression separated from current match state",
    "local single-player works without networking; PvP requires authoritative live evidence"
  ]},
  rhythm:{label:"Music / Rhythm",patterns:[/rhythm/i,/music game/i,/beat game/i,/节奏/,/節奏/,/音乐游戏/,/音樂遊戲/],systems:[
    "audio/beat timeline with calibrated chart timing independent of rendering frame rate",
    "input judgement windows for perfect/great/good/miss with latency offset calibration",
    "combo, score and performance meter derived from verified note judgements",
    "tap/hold/swipe note types with accessibility alternatives and reduced-motion presentation",
    "practice/retry flow with deterministic charts and seek-safe restart",
    "song/chart difficulty progression without claiming licensed music rights",
    "mobile audio interruption and Bluetooth/device latency handling"
  ]},
  survival:{label:"Survival / Roguelite",patterns:[/survival/i,/roguelike/i,/roguelite/i,/生存/],systems:[
    "run state with health, threat pressure, resources, upgrades and explicit extraction/survival goal",
    "bounded procedural spawn using deterministic seeds for repeatable balance tests",
    "enemy pressure curve with elite/boss checkpoints and entity/performance caps",
    "loot/resource choices with risk/reward rather than unbounded stat inflation",
    "run upgrades separated from persistent unlocks/meta progression",
    "death/restart loop that preserves only explicitly allowed meta progress",
    "mobile readability under dense action with auto-aim/assist options where genre-appropriate"
  ]}
});

function sourceText(value){return String(value||"").trim();}
export function inferAdvancedGenreKnowledge(idea="",preferredId=""){
  const source=sourceText(idea);const preferred=PROFILES[preferredId];
  const entry=preferred?{id:preferredId,...preferred}:Object.entries(PROFILES).map(([id,p])=>({id,...p})).find(item=>item.patterns.some(pattern=>pattern.test(source)));
  if(!entry)return{matched:false,id:null,label:null,systems:[],brief:""};
  return{matched:true,id:entry.id,label:entry.label,systems:[...entry.systems],brief:[
    `SOOLENAI ${entry.label.toUpperCase()} ENGINEERING MODE:`,
    ...entry.systems.map((item,index)=>`${index+1}. ${item}.`),
    "Build one complete playable loop first. Do not claim this specialist runtime is complete unless its state transitions, win/lose conditions, recovery and mobile controls are evidenced."
  ].join("\n")};
}
export const ADVANCED_GAME_GENRES=Object.freeze(Object.fromEntries(Object.entries(PROFILES).map(([id,p])=>[id,{label:p.label,systems:[...p.systems]}])));
