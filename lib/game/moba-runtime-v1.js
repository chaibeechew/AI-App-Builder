function num(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function text(value,fallback=""){const v=String(value??"").trim();return v||fallback;}
function arr(value){return Array.isArray(value)?value:[];}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

export const MOBA_RUNTIME_V1=Object.freeze({
  version:"moba-runtime-v1",
  archetype:"moba",
  playableTrainingArena:true,
  liveOnline:false,
  teamSize:5,
  lanes:3,
  systems:[
    "hero-stats","hero-leveling","basic-attack","passive-ability","three-basic-abilities","ultimate","cooldowns","resource-costs","targeting-shapes","crowd-control",
    "three-lanes","jungle","minion-waves","towers","team-core","gold","experience","item-economy","kill-assist-attribution","death-respawn","objective-rewards",
    "bot-ai","target-priority","navigation-recovery","mobile-dual-stick-controls","skill-aim-cancel","camera-follow","fog-readiness","authoritative-multiplayer-contract","anti-cheat-contract","performance-budget"
  ],
});

const DEFAULT_ABILITIES=[
  {slot:"Q",name:"Arc Pulse",kind:"skillshot",cooldown:6,cost:30,damage:90,range:260,radius:24},
  {slot:"W",name:"Guard Step",kind:"dash_shield",cooldown:9,cost:35,damage:0,range:120,radius:0,shield:70},
  {slot:"E",name:"Gravity Ring",kind:"aoe",cooldown:11,cost:45,damage:75,range:180,radius:95,slow:0.35},
  {slot:"R",name:"Solar Break",kind:"ultimate_aoe",cooldown:36,cost:80,damage:220,range:220,radius:135},
];

export function compileMobaRuntimeV1(specification={}){
  const game=specification?.game&&typeof specification.game==="object"?specification.game:{};
  const moba=game?.moba&&typeof game.moba==="object"?game.moba:{};
  const abilities=arr(moba.abilities).length?arr(moba.abilities).slice(0,4).map((ability,index)=>({
    slot:text(ability?.slot,["Q","W","E","R"][index]),name:text(ability?.name,DEFAULT_ABILITIES[index].name),kind:text(ability?.kind,DEFAULT_ABILITIES[index].kind),
    cooldown:num(ability?.cooldown,DEFAULT_ABILITIES[index].cooldown,1,120),cost:num(ability?.cost,DEFAULT_ABILITIES[index].cost,0,500),damage:num(ability?.damage,DEFAULT_ABILITIES[index].damage,0,2000),
    range:num(ability?.range,DEFAULT_ABILITIES[index].range,40,900),radius:num(ability?.radius,DEFAULT_ABILITIES[index].radius,0,400),shield:num(ability?.shield,DEFAULT_ABILITIES[index].shield||0,0,2000),slow:num(ability?.slow,DEFAULT_ABILITIES[index].slow||0,0,.9)
  })):DEFAULT_ABILITIES.map(x=>({...x}));
  return{
    version:MOBA_RUNTIME_V1.version,archetype:"moba",title:text(specification?.name,"Original MOBA Arena"),teamSize:5,lanes:3,
    map:{width:1200,height:720,laneY:[170,360,550],coreHealth:num(moba.coreHealth,3500,1000,20000),towerHealth:num(moba.towerHealth,1800,500,10000),towerRange:num(moba.towerRange,150,80,350),jungle:true,fogReady:true},
    hero:{maxLevel:num(moba.maxLevel,15,5,30),maxHealth:num(moba.maxHealth,1000,300,5000),maxResource:num(moba.maxResource,400,100,2000),moveSpeed:num(moba.moveSpeed,185,100,420),attackRange:num(moba.attackRange,95,45,400),attackDamage:num(moba.attackDamage,65,10,500),attackCooldown:num(moba.attackCooldown,.72,.2,3),armor:num(moba.armor,28,0,300),resistance:num(moba.resistance,24,0,300),respawnBase:num(moba.respawnBase,5,2,30),abilities},
    minions:{waveInterval:num(moba.waveInterval,9,4,30),meleePerWave:2,rangedPerWave:1,siegeEvery:3,maxAlive:54,moveSpeed:72,attackRange:42},
    economy:{startingGold:num(moba.startingGold,300,0,5000),passiveGoldPerSecond:num(moba.passiveGoldPerSecond,1.4,0,10),killGold:220,assistGold:90,towerGold:140,objectiveGold:100,itemSlots:6},
    multiplayer:{live:false,authoritativeServerRequired:true,tickRate:20,snapshotRate:10,prediction:true,reconciliation:true,reconnect:true,antiCheat:true},
    controls:{leftMoveStick:true,rightAttackButton:true,abilityButtons:4,dragAim:true,cancelCast:true,targetLock:true,cameraPan:true},
    performance:{targetFps:60,maxHeroes:10,maxMinions:54,maxProjectiles:80,pooledEffects:true,spatialQueries:true,degradedEffectsMode:true},
    originality:{required:true,copyCommercialHeroes:false,copyCommercialMaps:false,copyCommercialBalance:false},
  };
}

export function createHeroState(config,{id="hero",team="blue",role="fighter",x=0,y=0,isPlayer=false}={}){
  return{id,team,role,x,y,isPlayer,level:1,xp:0,gold:config.economy.startingGold,health:config.hero.maxHealth,maxHealth:config.hero.maxHealth,resource:config.hero.maxResource,maxResource:config.hero.maxResource,moveSpeed:config.hero.moveSpeed,attackDamage:config.hero.attackDamage,attackRange:config.hero.attackRange,attackCooldown:config.hero.attackCooldown,armor:config.hero.armor,resistance:config.hero.resistance,shield:0,dead:false,respawnAt:0,kills:0,deaths:0,assists:0,lastAttackAt:-Infinity,cooldowns:Object.fromEntries(config.hero.abilities.map(a=>[a.slot,0])),statuses:{slowUntil:0,stunUntil:0}};
}

export function xpForNextLevel(level){return 120+Math.max(0,level-1)*55;}
export function grantExperience(hero,amount,maxLevel=15){let next={...hero,xp:hero.xp+Math.max(0,Number(amount)||0)};while(next.level<maxLevel&&next.xp>=xpForNextLevel(next.level)){next.xp-=xpForNextLevel(next.level);next={...next,level:next.level+1,maxHealth:Math.round(next.maxHealth*1.07),health:Math.round(next.health+next.maxHealth*.07),maxResource:Math.round(next.maxResource*1.04),resource:Math.round(next.resource+next.maxResource*.04),attackDamage:Math.round((next.attackDamage||0)*1.045),armor:Math.round((next.armor||0)+2),resistance:Math.round((next.resistance||0)+1.5)}}return next;}
export function tickHero(hero,dt){const seconds=Math.max(0,Number(dt)||0);return{...hero,cooldowns:Object.fromEntries(Object.entries(hero.cooldowns||{}).map(([key,value])=>[key,Math.max(0,(Number(value)||0)-seconds)])),resource:Math.min(hero.maxResource,hero.resource+seconds*6)};}
export function canCastAbility(hero,ability){return Boolean(hero&&!hero.dead&&ability&&(hero.cooldowns?.[ability.slot]||0)<=0&&hero.resource>=ability.cost);}
export function castAbility(hero,ability){if(!canCastAbility(hero,ability))return{ok:false,hero,event:null};const next={...hero,resource:Math.max(0,hero.resource-ability.cost),cooldowns:{...hero.cooldowns,[ability.slot]:ability.cooldown},shield:hero.shield+(ability.shield||0)};return{ok:true,hero:next,event:{type:"ability_cast",slot:ability.slot,kind:ability.kind,damage:ability.damage||0,range:ability.range||0,radius:ability.radius||0,slow:ability.slow||0}};}
function mitigation(stat){const s=Number(stat)||0;return s>=0?100/(100+s):2-100/(100-s);}
export function applyDamage(target,amount,{type="physical",sourceId=""}={}){if(!target||target.dead)return{target,damage:0,killed:false};let raw=Math.max(0,Number(amount)||0);if(type==="physical")raw*=mitigation(target.armor||0);else if(type==="magic")raw*=mitigation(target.resistance||0);let shield=Math.max(0,target.shield||0),absorbed=Math.min(shield,raw),remaining=raw-absorbed,health=Math.max(0,target.health-remaining);const next={...target,shield:shield-absorbed,health};return{target:next,damage:Math.round(raw),absorbed:Math.round(absorbed),killed:health<=0,sourceId};}
export function respawnSeconds(level,elapsedSeconds=0,base=5){return clamp(Math.round(base+level*.75+elapsedSeconds/180),3,45);}
export function markHeroDead(hero,nowSeconds,base=5,elapsedSeconds=0){const seconds=respawnSeconds(hero.level,elapsedSeconds,base);return{...hero,health:0,dead:true,deaths:(hero.deaths||0)+1,respawnAt:nowSeconds+seconds};}
export function respawnHero(hero,config,{x=0,y=0}={}){return{...hero,x,y,dead:false,health:hero.maxHealth,resource:hero.maxResource,shield:0,statuses:{slowUntil:0,stunUntil:0}};}
export function distance(a,b){return Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));}
export function selectNearestEnemy(origin,units,range=Infinity){return arr(units).filter(unit=>unit&&!unit.dead&&unit.team!==origin.team&&distance(origin,unit)<=range).sort((a,b)=>distance(origin,a)-distance(origin,b))[0]||null;}
export function createMatchState(config){
  const laneY=config.map.laneY;const roles=["vanguard","fighter","assassin","mage","marksman"];
  const blue=roles.map((role,i)=>createHeroState(config,{id:`blue-${i+1}`,team:"blue",role,x:95,y:laneY[i%3],isPlayer:i===0}));
  const red=roles.map((role,i)=>createHeroState(config,{id:`red-${i+1}`,team:"red",role,x:config.map.width-95,y:laneY[i%3]}));
  return{time:0,status:"playing",winner:null,wave:0,nextWaveAt:1,heroes:[...blue,...red],minions:[],structures:{blueCore:{team:"blue",kind:"core",x:45,y:360,health:config.map.coreHealth,maxHealth:config.map.coreHealth},redCore:{team:"red",kind:"core",x:config.map.width-45,y:360,health:config.map.coreHealth,maxHealth:config.map.coreHealth},towers:laneY.flatMap((y,lane)=>[{id:`blue-t${lane}`,team:"blue",kind:"tower",lane,x:265,y,health:config.map.towerHealth,maxHealth:config.map.towerHealth},{id:`red-t${lane}`,team:"red",kind:"tower",lane,x:config.map.width-265,y,health:config.map.towerHealth,maxHealth:config.map.towerHealth}])}};
}
