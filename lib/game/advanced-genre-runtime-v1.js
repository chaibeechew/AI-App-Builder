// Evidence-oriented specialist runtime cores for major mobile game families.
// No external services are claimed; all transitions are local and deterministic.

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function gameOf(spec={}){return spec.game||{};}
function titleOf(spec={}){return String(spec.name||spec.title||spec.appName||"SoolenAI Game");}

export const ADVANCED_GENRE_RUNTIME_V1=Object.freeze({playable:true,platforms:["ios","android","web-preview"],genres:["strategy","racing","simulation","card","sports","rhythm","survival"]});

export function compileAdvancedGenreRuntimeV1(specification={}){
  const game=gameOf(specification);const id=String(game.archetype||game.genreId||game.genre||"").toLowerCase();
  const aliases=[
    ["strategy",/strategy|slg|策略|战略|戰略/],["racing",/racing|race|赛车|賽車/],["simulation",/simulation|tycoon|sim|经营|經營/],
    ["card",/card|deck|卡牌/],["sports",/sports|football|basketball|soccer|体育|體育/],["rhythm",/rhythm|music|节奏|節奏/],["survival",/survival|rogue|生存/]
  ];
  const genreId=ADVANCED_GENRE_RUNTIME_V1.genres.includes(id)?id:(aliases.find(([,p])=>p.test(id))?.[0]||"strategy");
  return{genreId,title:titleOf(specification),seed:String(game.seed||specification.id||titleOf(specification)),maxDelta:.05,platforms:[...ADVANCED_GENRE_RUNTIME_V1.platforms],systems:systemsFor(genreId)};
}
function systemsFor(id){return{
  strategy:["resources","build-queue","units","territory","enemy-ai","victory-condition"],
  racing:["steering","throttle-brake","checkpoints","laps","race-position","wrong-way-recovery"],
  simulation:["simulation-clock","build-upgrade","cashflow","capacity","satisfaction","scenario-goals"],
  card:["deck-hand-discard","turn-order","mana-cost","legal-targets","status-effects","battle-resolution"],
  sports:["match-clock","possession","pass-shot-defense","team-ai","score","final-result"],
  rhythm:["beat-timeline","judgement-window","combo","score","performance-meter","latency-offset"],
  survival:["run-state","procedural-pressure","loot","upgrades","boss-checkpoints","death-restart"]
}[id]||[];}

export function createAdvancedGenreState(config){
  switch(config.genreId){
    case"strategy":return{status:"playing",turn:1,food:120,wood:100,gold:80,population:4,capacity:8,army:2,baseHealth:100,enemyPower:10,territory:1,tech:0,message:"Build economy, train units and control 3 territories."};
    case"racing":return{status:"playing",lap:1,maxLaps:3,checkpoint:0,maxCheckpoints:6,progress:0,speed:0,position:4,bestLap:null,lapTime:0,totalTime:0,damage:0,message:"Complete 3 clean laps."};
    case"simulation":return{status:"playing",day:1,cash:500,population:20,capacity:30,happiness:70,revenue:40,costs:20,buildings:2,goalPopulation:80,message:"Grow a stable town to 80 population."};
    case"card":return{status:"playing",turn:1,playerHp:30,enemyHp:30,mana:3,maxMana:3,deck:[3,2,4,1,5,2,3,1],hand:[2,3,1],discard:[],guard:0,enemyGuard:0,message:"Reduce enemy HP to zero."};
    case"sports":return{status:"playing",clock:90,score:0,opponentScore:0,possession:"player",stamina:100,field:45,message:"Outscore the opponent before time expires."};
    case"rhythm":return{status:"playing",beat:0,totalBeats:24,score:0,combo:0,bestCombo:0,meter:60,lastJudgement:"READY",offsetMs:0,message:"Time inputs to the beat and finish above 40 meter."};
    case"survival":return{status:"playing",time:0,targetTime:90,health:100,materials:0,level:1,xp:0,threat:1,score:0,bosses:0,message:"Survive 90 seconds and defeat escalating threats."};
    default:return{status:"playing"};
  }
}

export function stepStrategy(state,action){if(state.status!=="playing")return state;let s={...state,message:""};
  if(action==="gather"){s.food+=25;s.wood+=18;s.gold+=12;}
  if(action==="build"&&s.wood>=35&&s.gold>=15){s.wood-=35;s.gold-=15;s.capacity+=4;s.baseHealth=Math.min(120,s.baseHealth+5);}
  if(action==="train"&&s.food>=30&&s.gold>=20&&s.army<s.capacity){s.food-=30;s.gold-=20;s.army+=2;}
  if(action==="research"&&s.gold>=45){s.gold-=45;s.tech+=1;}
  if(action==="attack"&&s.army>0){const power=s.army*(1+s.tech*.2);s.enemyPower=Math.max(0,s.enemyPower-power*.7);s.army=Math.max(0,s.army-Math.ceil(s.enemyPower/8));if(power>6)s.territory=Math.min(3,s.territory+1);}
  const upkeep=Math.max(1,Math.ceil(s.army*.4));s.food-=upkeep;s.enemyPower+=.8+s.turn*.08;if(s.enemyPower>s.army*2.5)s.baseHealth-=6;s.turn+=1;
  if(s.territory>=3||s.enemyPower<=0){s.status="won";s.message="Campaign objective secured."}else if(s.baseHealth<=0||s.food<-20){s.status="lost";s.message="Base collapsed."}else s.message=`Turn ${s.turn}: balance economy, army and territory.`;return s;}

export function stepRacing(state,input={},dt=.016){if(state.status!=="playing")return state;let s={...state};const throttle=clamp(Number(input.throttle||0),0,1),brake=clamp(Number(input.brake||0),0,1),steer=clamp(Number(input.steer||0),-1,1);s.speed=clamp(s.speed+throttle*55*dt-brake*85*dt-(8+Math.abs(steer)*9)*dt,0,72);s.damage=clamp(s.damage+Math.max(0,Math.abs(steer)-.8)*s.speed*.04*dt,0,100);s.speed*=1-s.damage*.0009;const advance=s.speed*dt*.018;s.progress+=advance;s.lapTime+=dt;s.totalTime+=dt;
  const cp=Math.floor((s.progress%1)*s.maxCheckpoints);if(cp!==s.checkpoint)s.checkpoint=cp;if(s.progress>=s.lap){const completed=s.lapTime;s.bestLap=s.bestLap==null?completed:Math.min(s.bestLap,completed);s.lapTime=0;s.lap+=1;if(s.lap>s.maxLaps){s.status="won";s.message="Race finished."}}
  if(s.damage>=100){s.status="lost";s.message="Vehicle disabled."}s.position=clamp(5-Math.floor((s.progress/s.maxLaps)*4),1,5);return s;}

export function stepSimulation(state,action){if(state.status!=="playing")return state;let s={...state};if(action==="build"&&s.cash>=120){s.cash-=120;s.buildings+=1;s.capacity+=15;s.costs+=5;}if(action==="upgrade"&&s.cash>=160){s.cash-=160;s.capacity+=10;s.revenue+=15;s.happiness=Math.min(100,s.happiness+4);}if(action==="services"&&s.cash>=80){s.cash-=80;s.happiness=Math.min(100,s.happiness+12);s.costs+=4;}if(action==="price_up"){s.revenue+=8;s.happiness=Math.max(0,s.happiness-5);}const growth=Math.max(-2,Math.floor((s.happiness-45)/12));s.population=clamp(s.population+Math.min(growth,s.capacity-s.population),0,s.capacity);s.cash+=s.revenue+s.population*2-s.costs;s.happiness=clamp(s.happiness+(s.population>=s.capacity?-5:1),0,100);s.day+=1;if(s.population>=s.goalPopulation&&s.cash>0){s.status="won";s.message="Scenario growth target reached."}else if(s.cash<-200||s.happiness<=0){s.status="lost";s.message="Scenario failed: economy or happiness collapsed."}else s.message=`Day ${s.day}: cashflow ${s.revenue+s.population*2-s.costs}.`;return s;}

export function playCard(state,handIndex){if(state.status!=="playing")return state;let s={...state,hand:[...state.hand],discard:[...state.discard],deck:[...state.deck]};const card=s.hand[handIndex];if(card==null||card>s.mana){s.message="Card is not currently legal.";return s;}s.mana-=card;s.hand.splice(handIndex,1);s.discard.push(card);const damage=card*2;s.enemyHp=Math.max(0,s.enemyHp-Math.max(0,damage-s.enemyGuard));s.enemyGuard=0;if(s.enemyHp<=0){s.status="won";s.message="Encounter won.";return s;}const enemyDamage=3+(s.turn%3);s.playerHp=Math.max(0,s.playerHp-Math.max(0,enemyDamage-s.guard));s.guard=0;if(s.playerHp<=0){s.status="lost";s.message="Encounter lost.";return s;}s.turn+=1;s.maxMana=Math.min(10,s.maxMana+1);s.mana=s.maxMana;if(!s.deck.length){s.deck=[...s.discard];s.discard=[];}if(s.deck.length)s.hand.push(s.deck.shift());s.message=`Turn ${s.turn}.`;return s;}
export function guardCard(state){if(state.status!=="playing"||state.mana<1)return state;return{...state,mana:state.mana-1,guard:state.guard+5,message:"Guard prepared."};}

export function stepSports(state,action,seconds=8){if(state.status!=="playing")return state;let s={...state};s.clock=Math.max(0,s.clock-seconds);s.stamina=clamp(s.stamina-(action==="sprint"?12:5),0,100);if(action==="pass"&&s.possession==="player")s.field=clamp(s.field+12,0,100);if(action==="sprint"&&s.possession==="player")s.field=clamp(s.field+18,0,100);if(action==="shoot"&&s.possession==="player"){const chance=clamp(.25+s.field/150+s.stamina/500,0,0.9);if(chance>=.55){s.score+=1;s.field=45;s.message="Score!"}else{s.possession="opponent";s.message="Shot missed."}}if(action==="defend"&&s.possession==="opponent"){s.possession="player";s.field=40;s.message="Possession won."}if(s.possession==="opponent"&&action!=="defend"){if(s.turnSeed%3===0)s.opponentScore+=1;s.possession="player";s.field=35;}s.turnSeed=(s.turnSeed||1)+1;if(s.clock<=0){s.status=s.score>s.opponentScore?"won":s.score<s.opponentScore?"lost":"draw";s.message=`Final ${s.score}-${s.opponentScore}.`;}return s;}

export function judgeRhythm(state,deltaMs){if(state.status!=="playing")return state;let s={...state};const d=Math.abs(Number(deltaMs||0)-s.offsetMs);let label="MISS",points=0,meter=-10;if(d<=45){label="PERFECT";points=1000;meter=3}else if(d<=90){label="GREAT";points=700;meter=2}else if(d<=150){label="GOOD";points=350;meter=1}s.beat+=1;s.lastJudgement=label;s.score+=points;if(points){s.combo+=1;s.bestCombo=Math.max(s.bestCombo,s.combo)}else s.combo=0;s.meter=clamp(s.meter+meter,0,100);if(s.beat>=s.totalBeats){s.status=s.meter>=40?"won":"lost";s.message=s.status==="won"?"Chart cleared.":"Performance meter failed."}return s;}

export function stepSurvival(state,action="move",dt=1){if(state.status!=="playing")return state;let s={...state};s.time+=dt;s.threat=1+s.time/25;const enemyPressure=s.threat*(action==="attack"?.8:action==="dodge"?.35:1.1);s.health=clamp(s.health-enemyPressure*dt,0,100);if(action==="attack"){s.xp+=6*dt;s.score+=10*dt;}if(action==="scavenge"){s.materials+=2;s.health=clamp(s.health-1.5*dt,0,100);}if(action==="heal"&&s.materials>=5){s.materials-=5;s.health=clamp(s.health+30,0,100);}if(s.xp>=20*s.level){s.level+=1;s.health=Math.min(100,s.health+12);}if(Math.floor(s.time/30)>s.bosses){s.bosses+=1;s.score+=100;}if(s.health<=0){s.status="lost";s.message="Run ended."}else if(s.time>=s.targetTime){s.status="won";s.message="Extraction window reached."}else s.message=`Threat ${s.threat.toFixed(1)} · survive ${Math.ceil(s.targetTime-s.time)}s.`;return s;}
