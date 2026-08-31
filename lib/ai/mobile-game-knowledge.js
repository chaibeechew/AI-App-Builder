// SoolenAI Mobile Game Knowledge Core
// Product-planning knowledge only. It never claims a native binary, store approval,
// paid provider connection, multiplayer backend or purchase succeeded unless verified.

const GAME_PATTERNS=[/\bgame\b/i,/gaming/i,/mobile game/i,/iphone game/i,/android game/i,/游戏/,/手游/,/电玩/,/遊戲/];

const GENRES=[
  {id:"racing",label:"Racing",patterns:[/racing/i,/race car/i,/driving/i,/赛车/,/賽車/]},
  {id:"rpg",label:"RPG / Adventure",patterns:[/\brpg\b/i,/role.?playing/i,/adventure game/i,/角色扮演/,/冒险游戏/,/冒險遊戲/]},
  {id:"action",label:"Action",patterns:[/action game/i,/combat/i,/fighter/i,/动作游戏/,/動作遊戲/,/格斗/]},
  {id:"platformer",label:"Platformer",patterns:[/platformer/i,/platform game/i,/jump game/i,/跑酷/,/平台跳跃/,/平台跳躍/]},
  {id:"puzzle",label:"Puzzle",patterns:[/puzzle/i,/match.?3/i,/merge game/i,/消除/,/拼图/,/拼圖/,/益智/]},
  {id:"tower_defense",label:"Tower Defense",patterns:[/tower defense/i,/td game/i,/塔防/]},
  {id:"strategy",label:"Strategy",patterns:[/strategy game/i,/tactics/i,/战略游戏/,/策略游戏/,/策略遊戲/]},
  {id:"card",label:"Card / Deck Builder",patterns:[/card game/i,/deck builder/i,/trading card/i,/卡牌/]},
  {id:"simulation",label:"Simulation / Tycoon",patterns:[/simulation game/i,/sim game/i,/tycoon/i,/farm game/i,/city builder/i,/模拟经营/,/模擬經營/,/经营游戏/]},
  {id:"sports",label:"Sports",patterns:[/sports game/i,/football game/i,/basketball game/i,/soccer game/i,/体育游戏/,/體育遊戲/]},
  {id:"idle",label:"Idle / Incremental",patterns:[/idle game/i,/incremental game/i,/clicker/i,/放置游戏/,/放置遊戲/]},
  {id:"arcade",label:"Arcade / Casual",patterns:[/arcade/i,/casual game/i,/hyper.?casual/i,/街机/,/街機/,/休闲游戏/,/休閒遊戲/]},
  {id:"multiplayer",label:"Multiplayer",patterns:[/multiplayer/i,/pvp/i,/co.?op/i,/多人/,/联机/,/聯機/]},
];

function text(value){return String(value??"").trim();}
function hasAny(source,patterns){return patterns.some(pattern=>pattern.test(source));}

export function isMobileGameIdea(idea=""){
  const source=text(idea);
  return hasAny(source,GAME_PATTERNS)||GENRES.some(genre=>hasAny(source,genre.patterns));
}

export function inferMobileGamePlan(idea=""){
  const source=text(idea);
  if(!isMobileGameIdea(source))return {matched:false,genre:null,genreId:null,brief:""};
  const genre=GENRES.find(item=>hasAny(source,item.patterns))||{id:"custom",label:"Custom Mobile Game"};
  const wants3d=/\b3d\b/i.test(source)||/three.?dimensional/i.test(source)||/三维|三維|3D/.test(source);
  const wantsMultiplayer=/multiplayer|pvp|co.?op|多人|联机|聯機/i.test(source);
  const wantsAds=/\bads?\b|advertis|rewarded video|interstitial|广告|廣告/i.test(source);
  const wantsIap=/in.?app purchase|iap|purchase|coins|gems|battle pass|内购|內購|充值/i.test(source);
  const wantsCamera=/camera|ar game|augmented reality|相机|相機|增强现实|擴增實境/i.test(source);
  const wantsLocation=/gps|location game|nearby|地图游戏|地圖遊戲|位置游戏|位置遊戲/i.test(source);

  const screens=["Boot / loading","Home / lobby","Gameplay","Pause","Results / rewards","Settings / accessibility"];
  if(wantsMultiplayer)screens.push("Matchmaking / room","Friends / party or session status");
  if(wantsIap)screens.push("Store / inventory");

  const systems=[
    "core gameplay loop with clear start, action, feedback, reward and replay states",
    "touch-first controls with safe areas, haptics option and one-handed ergonomics where suitable",
    "scene/state management for boot, menu, gameplay, pause, result and recovery",
    "progression, difficulty curve, tutorial/onboarding and restart flow",
    "save/load with versioned local state and optional account/cloud sync readiness",
    "audio system for music, SFX, mute, volume and interruption handling",
    "asset pipeline for characters, environments, UI, icons, VFX, animation and compression",
    "performance budgets for frame time, memory, texture size, battery and thermal load",
    "accessibility options such as readable UI, reduced motion, subtitles/captions where relevant and non-color-only feedback",
    "analytics events that avoid collecting unnecessary personal data"
  ];
  if(wantsMultiplayer)systems.push("authoritative multiplayer/session design, reconnect, latency tolerance, anti-cheat boundaries and server readiness without claiming a live backend");
  if(wantsAds)systems.push("ad placement plan that never blocks core play, includes consent/privacy handling and does not claim an ad network is connected");
  if(wantsIap)systems.push("virtual goods/economy plan with receipt-verification readiness, restore-purchases flow and no invented transaction success");

  const platformRules=[
    "Target both iOS and Android from one product specification; also keep a web/PWA preview path for fast testing.",
    "Respect iPhone safe areas, dynamic text/readability, orientation rules, background/foreground lifecycle and permission prompts.",
    "Respect Android back navigation, diverse screen ratios, lower-memory devices, lifecycle changes and permission denial/retry states.",
    "Use touch controls by default; add keyboard/gamepad only when useful and never make them required for mobile play.",
    "Prepare platform identifiers, icons, screenshots, privacy declarations, age/content rating answers and signing/store checklists, but never claim an App Store or Google Play submission is completed without evidence."
  ];

  const privacy=[
    wantsCamera?"Camera usage requires a truthful purpose string and denial fallback.":"Do not request camera permission unless gameplay actually needs it.",
    wantsLocation?"Location usage requires a truthful purpose, minimum-necessary precision and denial fallback.":"Do not request location unless gameplay actually needs it.",
    wantsAds?"Advertising/tracking must be separated from essential analytics, with consent/ATT handling where legally/platform required.":"Do not introduce cross-app tracking by default.",
    "Minimize identifiers and telemetry; separate anonymous diagnostics from account-linked data.",
    "Children/teen audiences require extra age, privacy, chat, ads and purchase safeguards."
  ];

  const media=[
    "AI Art Generator: concept art, backgrounds, characters, props, game icons and store artwork.",
    "AI Video Generator: trailers, cutscene concepts, animated promos and gameplay-storyboard videos.",
    "AI Photo & Video Generator: mixed media assets for realistic characters, scenes, marketing and store presentation.",
    "AI Avatar Creator: player avatars, NPC concepts, presenters, mascots and profile characters, with originality and likeness/privacy safeguards."
  ];

  const rows=[
    "SOOLENAI MOBILE GAME KNOWLEDGE CORE:",
    `Detected product type: Mobile Game. Genre direction: ${genre.label}. Visual/runtime direction: ${wants3d?"3D-capable":"2D or lightweight 3D depending on the idea"}.`,
    `Required game screens: ${screens.join("; ")}.`,
    `Game systems: ${systems.join("; ")}.`,
    `Cross-platform rules: ${platformRules.join(" ")}`,
    `Privacy/store rules: ${privacy.join(" ")}`,
    `Reusable AI media foundation: ${media.join(" ")}`,
    "When the customer's idea is incomplete, choose a simple playable core loop first, then layer progression, content and online features. Prefer a small fun vertical slice over many fake or disconnected features.",
    "For physics, collision, animation, enemy AI, procedural content, pathfinding, camera, input, spawning and level logic, describe deterministic runtime behavior and failure/restart states rather than only visual screens.",
    "For multiplayer, cloud save, ads, payments, push, leaderboards, achievements or social login, create integration-ready contracts and safe test states; do not claim the external service is connected until verified.",
    "The generated project must remain original and must not copy copyrighted game characters, logos, maps, levels, audio or proprietary art from reference material."
  ];

  return {
    matched:true,
    productType:"mobile_game",
    genreId:genre.id,
    genre:genre.label,
    dimensions:wants3d?"3d-capable":"adaptive-2d-3d",
    platforms:["ios","android","web-preview"],
    screens,
    systems,
    multiplayer:wantsMultiplayer,
    monetization:{ads:wantsAds,inAppPurchases:wantsIap},
    permissions:{camera:wantsCamera,location:wantsLocation},
    mediaCapabilities:["ai-art","ai-video","ai-photo-video","ai-avatar"],
    brief:rows.join("\n")
  };
}

export const MOBILE_GAME_GENRES=Object.freeze(GENRES.map(({id,label})=>({id,label})));
