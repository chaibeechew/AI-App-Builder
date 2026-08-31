import {buildGenreRuntimeContract} from "./genre-runtime-intelligence.js";

function text(value,fallback=""){const v=String(value??"").trim();return v||fallback;}
function num(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function list(value){return Array.isArray(value)?value:[];}

export const GAME_RUNTIME_V1=Object.freeze({
  version:"game-runtime-v1",
  dimensions:"2d",
  playable:true,
  systems:[
    "scene","touch-controls","physics","collision","player","enemy","level","score","health","save-load","audio","pause-restart","ios-android-responsive",
    "win-lose-state","reward-replay-loop","world-bounds","damage-cooldown","autosave","haptics","accessibility","performance-budget","lifecycle-recovery","deterministic-spawns","genre-runtime-intelligence"
  ],
  upgradePath:["advanced-2d-runtime","3d-runtime","multiplayer-runtime"],
});

export function compileGameRuntimeV1(specification={}){
  const game=specification?.game&&typeof specification.game==="object"?specification.game:{};
  const design=specification?.designSystem&&typeof specification.designSystem==="object"?specification.designSystem:{};
  const genre=text(game.genre||game.genreLabel||specification?.industry?.name,"Arcade / Casual");
  const title=text(specification?.name||game.title,"Soolen Mobile Game");
  const coreLoop=list(game.coreLoop).map(String).filter(Boolean).slice(0,6);
  const genreContract=buildGenreRuntimeContract({...game,genre});
  const objective=text(game.objective||game.goal,coreLoop.length?coreLoop.join(" → "):`Genre target: ${genreContract.profile.goal}.`);
  const dedicatedRuntime=["game-runtime-v1","moba-runtime-v1","air-combat-runtime-v1"].includes(genreContract.profile.runtime);
  return {
    version:GAME_RUNTIME_V1.version,
    productType:"mobile_game",
    playable:true,
    systems:[...GAME_RUNTIME_V1.systems],
    title,
    genre,
    genreProfile:genreContract.profile,
    genreRequirements:genreContract.requirements,
    dedicatedGenreRuntime:dedicatedRuntime,
    runtimeCompleteness:dedicatedRuntime?"dedicated":"foundation-only",
    objective,
    platforms:["ios","android","web-preview"],
    scene:{
      width:960,
      height:600,
      background:text(design.backgroundColor,"#071712"),
      primary:text(design.primaryColor,"#2f8f6b"),
      accent:text(design.accentColor,"#e2bd5c"),
    },
    player:{radius:num(game.playerRadius,18,12,34),speed:num(game.playerSpeed,260,120,480),maxHealth:num(game.maxHealth,100,20,500)},
    enemies:{baseCount:num(game.enemyCount,3,1,12),speed:num(game.enemySpeed,92,35,220),damage:num(game.enemyDamage,20,5,80)},
    progression:{
      collectiblesPerLevel:num(game.collectiblesPerLevel,5,2,20),
      scorePerCollectible:num(game.scorePerCollectible,100,10,1000),
      levelSpeedGrowth:num(game.levelSpeedGrowth,.08,.01,.3),
      maxLevel:num(game.maxLevel,5,1,50),
      genreModel:genreContract.profile.progression,
    },
    audio:{enabled:true,music:false,sfx:true,userControlled:true},
    haptics:{enabled:true,userControlled:true},
    feedback:{visualStatus:true},
    save:{keyPrefix:"soolen-game-runtime-v1",version:1,local:true,cloudReady:true,validateOnLoad:true,autoSave:true,bestScore:true},
    controls:{touch:true,drag:true,dpad:true,keyboardPreview:true,gamepadReady:true,inputRecovery:true,genreControls:[...genreContract.profile.controls]},
    performance:{targetFps:60,maxDeltaSeconds:.033,maxEnemies:18,boundedDelta:true},
    accessibility:{reducedMotion:true,highContrast:true,largeTouchTargets:true,nonAudioFeedback:true},
    lifecycle:{pauseOnVisibilityChange:true,pauseOnBlur:true,autoSaveOnPageHide:true},
    reliability:{deterministicSpawns:true},
    safety:{pauseOnVisibilityChange:true,noForcedAutoplayAudio:true,respectSafeAreas:true,reducedMotionReady:true},
    coreLoop:coreLoop.length?coreLoop:["move","collect","avoid","score","advance","win-or-retry"],
  };
}

export function initialGameState(config){
  return {score:0,health:config.player.maxHealth,level:1,collected:0,bestScore:0,paused:false,gameOver:false,won:false};
}
