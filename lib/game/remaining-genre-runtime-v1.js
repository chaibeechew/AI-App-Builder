// Playable local vertical-slice runtimes for remaining mobile-game families.
// They prove core state machines only; no live network/provider/store claims are made.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function gameOf(spec={}){return spec.game||{};}
function titleOf(spec={}){return String(spec.name||spec.title||spec.appName||"SoolenAI Game");}

export const REMAINING_GENRE_RUNTIME_V1=Object.freeze({
  playable:true,
  platforms:["ios","android","web-preview"],
  genres:["shooter","platformer","tower_defense","idle","party","educational"]
});

export function compileRemainingGenreRuntimeV1(specification={}){
  const game=gameOf(specification);const raw=String(game.archetype||game.genreId||game.genre||"").toLowerCase();
  const rules=[
    ["shooter",/shooter|shooting|fps|tps|stg|射击|射擊/],
    ["platformer",/platform|runner|跑酷|平台跳跃|平台跳躍/],
    ["tower_defense",/tower defense|td game|塔防/],
    ["idle",/idle|incremental|clicker|放置/],
    ["party",/party|social|minigame|派对|派對/],
    ["educational",/educational|learning|quiz|教育|学习|學習/]
  ];
  const genreId=REMAINING_GENRE_RUNTIME_V1.genres.includes(raw)?raw:(rules.find(([,p])=>p.test(raw))?.[0]||"shooter");
  return{genreId,title:titleOf(specification),platforms:[...REMAINING_GENRE_RUNTIME_V1.platforms],maxDelta:.05,systems:systemsFor(genreId)};
}

function systemsFor(id){return{
  shooter:["move-aim-fire","ammo-reload","hit-validation","cover","enemy-ai","mission-objective"],
  platformer:["move-jump","coyote-buffer","platform-hazard","checkpoint","collectible","stage-exit"],
  tower_defense:["waves","path","tower-placement","upgrade","economy","base-health"],
  idle:["production-rate","upgrade","offline-cap","automation","prestige","large-number-format"],
  party:["lobby-ready","rounds","minigame-score","tie-break","afk-policy","rematch"],
  educational:["learning-objective","question-bank","answer-validation","adaptive-difficulty","review","mastery"]
}[id]||[];}

export function createRemainingGenreState(config){switch(config.genreId){
  case"shooter":return{status:"playing",health:100,armor:25,ammo:8,reserve:24,enemies:8,score:0,cover:false,objective:5,hits:0,shots:0,message:"Clear 5 targets and survive."};
  case"platformer":return{status:"playing",stage:1,progress:0,checkpoint:0,coins:0,health:3,jumpEnergy:100,hazards:0,goal:100,message:"Reach the stage exit with at least one life."};
  case"tower_defense":return{status:"playing",wave:1,maxWaves:6,baseHealth:20,gold:140,towers:1,upgrades:0,enemies:6,enemiesDefeated:0,message:"Defend the core through 6 waves."};
  case"idle":return{status:"playing",coins:0,rate:1,level:1,automation:0,prestige:0,totalEarned:0,goal:10000,offlineCapSeconds:14400,message:"Grow production to 10,000 total resources."};
  case"party":return{status:"lobby",round:0,maxRounds:5,playerScore:0,botScore:0,ready:false,currentRule:"Tap on GO",streak:0,message:"Ready up for a five-round local party match."};
  case"educational":return{status:"playing",question:1,totalQuestions:8,correct:0,wrong:0,streak:0,mastery:0,difficulty:1,hints:2,lastAnswer:null,message:"Answer 8 learning challenges."};
  default:return{status:"playing"};
}}

export function stepShooter(state,action){if(state.status!=="playing")return state;let s={...state};
  if(action==="cover"){s.cover=!s.cover;s.message=s.cover?"In cover.":"Left cover.";return s;}
  if(action==="reload"){const need=8-s.ammo,take=Math.min(need,s.reserve);s.ammo+=take;s.reserve-=take;s.message=take?"Reloaded.":"No reserve ammo.";return s;}
  if(action==="fire"){if(s.ammo<=0){s.message="Magazine empty.";return s;}s.ammo--;s.shots++;const accurate=(s.shots%4)!==0;if(accurate&&s.enemies>0){s.enemies--;s.hits++;s.score+=100;s.message="Target down.";}else s.message="Shot missed.";}
  if(action==="advance")s.score+=20;
  if(s.enemies>0&&action!=="cover"){const damage=s.cover?2:7;s.armor=Math.max(0,s.armor-damage);const spill=Math.max(0,damage-state.armor);s.health=Math.max(0,s.health-spill);}
  if(s.hits>=s.objective){s.status="won";s.message="Mission objective cleared.";}else if(s.health<=0){s.status="lost";s.message="Player disabled.";}return s;}

export function stepPlatformer(state,action){if(state.status!=="playing")return state;let s={...state};
  if(action==="move")s.progress+=8;
  if(action==="jump"&&s.jumpEnergy>=15){s.progress+=12;s.jumpEnergy-=15;if((Math.floor(s.progress/10)%3)===0){s.coins++;s.message="Collectible found."}}
  if(action==="dash"&&s.jumpEnergy>=25){s.progress+=18;s.jumpEnergy-=25;}
  if(action==="rest")s.jumpEnergy=Math.min(100,s.jumpEnergy+30);
  if(action==="hazard"){s.health--;s.hazards++;s.progress=Math.max(s.checkpoint,s.progress-10);}
  if(s.progress>=s.checkpoint+25)s.checkpoint=Math.min(75,Math.floor(s.progress/25)*25);
  s.progress=Math.min(s.goal,s.progress);if(s.health<=0){s.status="lost";s.message="Out of lives.";}else if(s.progress>=s.goal){s.status="won";s.message="Stage exit reached.";}else if(!s.message)s.message=`Checkpoint ${s.checkpoint}% · keep moving.`;return s;}

export function stepTowerDefense(state,action){if(state.status!=="playing")return state;let s={...state};
  if(action==="build"&&s.gold>=50){s.gold-=50;s.towers++;}
  if(action==="upgrade"&&s.gold>=70&&s.towers>0){s.gold-=70;s.upgrades++;}
  if(action==="sell"&&s.towers>1){s.towers--;s.gold+=25;}
  if(action==="wave"){const power=s.towers*2+s.upgrades*2;const kills=Math.min(s.enemies,Math.max(1,Math.floor(power*.75)));s.enemies-=kills;s.enemiesDefeated+=kills;s.gold+=kills*12;if(s.enemies>0)s.baseHealth-=s.enemies;if(s.baseHealth<=0){s.status="lost";s.message="Core destroyed.";return s;}if(s.enemies<=0){if(s.wave>=s.maxWaves){s.status="won";s.message="All waves cleared.";return s;}s.wave++;s.enemies=5+s.wave*2;s.gold+=35;s.message=`Wave ${s.wave} incoming.`;}}
  return s;}

export function stepIdle(state,action,seconds=1){if(state.status!=="playing")return state;let s={...state};const elapsed=clamp(seconds,0,s.offlineCapSeconds);const earned=s.rate*elapsed;s.coins+=earned;s.totalEarned+=earned;
  if(action==="tap"){s.coins+=5*(1+s.prestige);s.totalEarned+=5*(1+s.prestige);}
  if(action==="upgrade"){const cost=Math.ceil(20*Math.pow(1.7,s.level-1));if(s.coins>=cost){s.coins-=cost;s.level++;s.rate*=1.65;}}
  if(action==="automate"&&s.coins>=250*(s.automation+1)){s.coins-=250*(s.automation+1);s.automation++;s.rate*=1.25;}
  if(action==="prestige"&&s.totalEarned>=2500){s.prestige++;s.coins=0;s.level=1;s.automation=0;s.rate=1+s.prestige*.5;s.message="Prestige reset complete.";}
  if(s.totalEarned>=s.goal){s.status="won";s.message="Incremental goal reached.";}return s;}

export function stepParty(state,action){let s={...state};if(s.status==="won"||s.status==="lost"||s.status==="draw")return s;
  if(s.status==="lobby"){if(action!=="ready")return s;s.ready=true;s.status="playing";s.round=1;s.message="Round 1: react to GO.";return s;}
  if(action==="hit"){const success=(s.round%3)!==0;if(success){s.playerScore+=2;s.streak++;}else{s.botScore+=1;s.streak=0;}}
  if(action==="wait")s.botScore+=1;
  if(action==="bonus"&&s.streak>=2)s.playerScore+=2;
  if(s.round>=s.maxRounds){s.status=s.playerScore>s.botScore?"won":s.playerScore<s.botScore?"lost":"draw";s.message=`Final ${s.playerScore}-${s.botScore}.`;return s;}s.round++;s.message=`Round ${s.round}: ${s.round%2?"Tap on GO":"Hold for timing"}.`;return s;}

export function stepEducational(state,action){if(state.status!=="playing")return state;let s={...state};if(action==="hint"&&s.hints>0){s.hints--;s.message="Hint: eliminate one clearly wrong option first.";return s;}const correct=action==="correct";s.lastAnswer=correct?"correct":"wrong";if(correct){s.correct++;s.streak++;s.mastery=clamp(s.mastery+8+s.difficulty,0,100);}else{s.wrong++;s.streak=0;s.mastery=clamp(s.mastery-3,0,100);}if(s.streak>=3)s.difficulty=Math.min(5,s.difficulty+1);if(s.wrong>s.correct+2)s.difficulty=Math.max(1,s.difficulty-1);if(s.question>=s.totalQuestions){s.status=s.mastery>=45?"won":"lost";s.message=s.status==="won"?"Learning objective demonstrated.":"More review is recommended.";return s;}s.question++;s.message=correct?"Correct — explanation recorded.":"Incorrect — review explanation before continuing.";return s;}
