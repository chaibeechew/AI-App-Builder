function text(value,fallback=""){const v=String(value??"").trim();return v||fallback;}
function num(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function list(value){return Array.isArray(value)?value:[];}

export const GAME_RUNTIME_V1=Object.freeze({
  version:"game-runtime-v1",
  dimensions:"2d",
  playable:true,
  systems:["scene","touch-controls","physics","collision","player","enemy","level","score","health","save-load","audio","pause-restart","ios-android-responsive"],
  upgradePath:["3d-runtime","multiplayer-runtime"],
});

export function compileGameRuntimeV1(specification={}){
  const game=specification?.game&&typeof specification.game==="object"?specification.game:{};
  const design=specification?.designSystem&&typeof specification.designSystem==="object"?specification.designSystem:{};
  const genre=text(game.genre||game.genreLabel||specification?.industry?.name,"Arcade / Casual");
  const title=text(specification?.name||game.title,"Soolen Mobile Game");
  const coreLoop=list(game.coreLoop).map(String).filter(Boolean).slice(0,6);
  const objective=text(game.objective||game.goal,coreLoop.length?coreLoop.join(" → "):"Collect energy, avoid enemies and advance through levels.");
  return {
    version:GAME_RUNTIME_V1.version,
    productType:"mobile_game",
    title,
    genre,
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
    progression:{collectiblesPerLevel:num(game.collectiblesPerLevel,5,2,20),scorePerCollectible:num(game.scorePerCollectible,100,10,1000),levelSpeedGrowth:0.08},
    audio:{enabled:true,music:false,sfx:true,userControlled:true},
    save:{keyPrefix:"soolen-game-runtime-v1",version:1,local:true,cloudReady:true},
    controls:{touch:true,drag:true,dpad:true,keyboardPreview:true,gamepadReady:true},
    safety:{pauseOnVisibilityChange:true,noForcedAutoplayAudio:true,respectSafeAreas:true,reducedMotionReady:true},
    coreLoop:coreLoop.length?coreLoop:["move","collect","avoid","score","advance"],
  };
}

export function initialGameState(config){
  return {score:0,health:config.player.maxHealth,level:1,collected:0,bestScore:0,paused:false,gameOver:false};
}
