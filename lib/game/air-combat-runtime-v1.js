import {createFlightBody,stepFlight3D,clamp,sub3,length3,normalize3,add3,scale3,dot3,orientationBasis} from "./runtime-3d-foundation.js";

function text(value,fallback=""){const v=String(value??"").trim();return v||fallback;}
function num(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function list(value){return Array.isArray(value)?value:[];}
function hashSeed(value=""){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0;}
function rngFactory(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

export const AIR_COMBAT_RUNTIME_V1=Object.freeze({
  version:"air-combat-runtime-v1",archetype:"air_combat",dimensions:"3d-simulation",playable:true,liveOnline:false,
  systems:["3d-flight","throttle","pitch-roll-yaw","stall","energy-management","hud","target-selection","training-fire-abstraction","ai-pilots","damage","mission-objectives","weather","takeoff-restart","mobile-controls","lifecycle-pause","60fps-budget","deterministic-mission"]
});

export function compileAirCombatRuntimeV1(specification={}){
  const game=specification?.game&&typeof specification.game==="object"?specification.game:{};
  const aviation=game?.aviation&&typeof game.aviation==="object"?game.aviation:{};
  const design=specification?.designSystem&&typeof specification.designSystem==="object"?specification.designSystem:{};
  const catalog=list(aviation.catalog).slice(0,80);
  const playerAircraft=text(game.aircraft||aviation.playerAircraft||catalog[0]?.name,"Original multirole trainer");
  return{
    version:AIR_COMBAT_RUNTIME_V1.version,archetype:"air_combat",title:text(specification?.name,"Soolen Air Combat"),genre:text(game.genre,"Air Combat / Flight"),
    platforms:["ios","android","web-preview"],playerAircraft,
    world:{width:18000,height:14000,ceiling:16000,ground:0,seaLevel:0,runway:{x:0,z:-600,length:2200,width:65}},
    flight:{minSpeed:num(aviation.minSpeed,82,55,180),cruiseSpeed:num(aviation.cruiseSpeed,220,100,520),maxSpeed:num(aviation.maxSpeed,420,180,780),stallSpeed:num(aviation.stallSpeed,88,50,190),pitchRate:50,rollRate:98,yawRate:24,thrustAccel:52,dragBase:.0005},
    mission:{targetCount:num(aviation.targetCount,3,1,8),timeLimitSeconds:num(aviation.timeLimitSeconds,360,90,1200),objective:text(game.objective||aviation.objective,"Defeat the training interceptors and return safely."),trainingOnly:true},
    combat:{basicFireCooldown:.16,basicFireRange:900,basicFireCone:.955,basicDamage:18,targetMaxHealth:100,lockRange:1800,lockCone:.91,damageCooldown:.35},
    ai:{count:num(aviation.aiCount,3,1,8),skill:num(aviation.aiSkill,.58,.2,.95),decisionInterval:.22,retreatHealth:.24,attackRange:760,fireCone:.965},
    weather:{visibility:num(aviation.visibility,9000,1800,20000),windX:num(aviation.windX,0,-30,30),windZ:num(aviation.windZ,3,-30,30),cloudBase:num(aviation.cloudBase,2100,500,7000),turbulence:num(aviation.turbulence,.08,0,.6)},
    controls:{touch:true,virtualStick:true,throttleSlider:true,buttons:["fire","target","pause","restart"],gyroLookReady:true,keyboardPreview:true,gamepadReady:true},
    performance:{targetFps:60,maxDelta:.033,maxAircraft:10,maxEffects:64,terrainGrid:22,degradedEffectsMode:true},
    accessibility:{largeTouchTargets:true,reducedMotion:true,highContrast:true,nonAudioWarnings:true},
    visual:{sky:text(design.backgroundColor,"#061526"),hud:text(design.accentColor,"#e6cc72"),friendly:text(design.primaryColor,"#62d7aa"),enemy:"#ff6f66"},
    safety:{publicKnowledgeOnly:true,noClassifiedPerformance:true,noRealAttackProcedure:true,noWeaponConstruction:true,trainingAbstraction:true},
  };
}

export function createAirCombatMatch(config,seed="air-combat"){
  const rng=rngFactory(hashSeed(seed));
  const player=createFlightBody({x:0,y:650,z:-850,yaw:0,pitch:3,roll:0,speed:config.flight.cruiseSpeed,minSpeed:config.flight.minSpeed,maxSpeed:config.flight.maxSpeed,health:100});
  const enemies=Array.from({length:config.ai.count},(_,index)=>({
    id:`bandit-${index+1}`,health:config.combat.targetMaxHealth,maxHealth:config.combat.targetMaxHealth,dead:false,lastFireAt:-10,decisionAt:0,
    body:createFlightBody({x:(rng()-.5)*1800,y:900+rng()*1800,z:1800+index*950+rng()*800,yaw:175+(rng()-.5)*35,pitch:(rng()-.5)*10,roll:0,speed:config.flight.cruiseSpeed*(.84+rng()*.22),minSpeed:config.flight.minSpeed,maxSpeed:config.flight.maxSpeed,health:100})
  }));
  return{time:0,status:"playing",score:0,kills:0,shots:0,hits:0,player,targetId:enemies[0]?.id||null,enemies,fireCooldown:0,damageCooldown:0,notice:"Training sortie started.",seed};
}

function withinWorld(body,config){body.position.x=clamp(body.position.x,-config.world.width/2,config.world.width/2);body.position.z=clamp(body.position.z,-config.world.height/2,config.world.height/2);body.position.y=clamp(body.position.y,0,config.world.ceiling);return body;}
function angleDot(attacker,target){const basis=orientationBasis(attacker),dir=normalize3(sub3(target.position,attacker.position));return dot3(basis.forward,dir);}
export function selectAirTarget(match,config){const alive=match.enemies.filter(enemy=>!enemy.dead&&length3(sub3(enemy.body.position,match.player.position))<=config.combat.lockRange);alive.sort((a,b)=>{const ad=angleDot(match.player,a.body),bd=angleDot(match.player,b.body);if(Math.abs(ad-bd)>.02)return bd-ad;return length3(sub3(a.body.position,match.player.position))-length3(sub3(b.body.position,match.player.position));});return alive[0]?.id||null;}

export function fireTrainingBurst(match,config){if(match.status!=="playing"||match.fireCooldown>0)return match;const next={...match,enemies:match.enemies.map(enemy=>({...enemy,body:{...enemy.body,position:{...enemy.body.position}}})),shots:match.shots+1,fireCooldown:config.combat.basicFireCooldown};const target=next.enemies.find(enemy=>enemy.id===next.targetId&&!enemy.dead);if(!target)return next;const distance=length3(sub3(target.body.position,next.player.position)),alignment=angleDot(next.player,target.body);if(distance<=config.combat.basicFireRange&&alignment>=config.combat.basicFireCone){target.health=Math.max(0,target.health-config.combat.basicDamage);next.hits++;next.score+=25;if(target.health<=0){target.dead=true;next.kills++;next.score+=250;next.targetId=selectAirTarget(next,config);if(next.kills>=config.mission.targetCount){next.status="won";next.notice="Training objective complete.";}}}return next;}

function aiInput(enemy,player,config,time){const rel=sub3(player.position,enemy.body.position),distance=length3(rel),basis=orientationBasis(enemy.body),forwardDot=dot3(basis.forward,normalize3(rel));const desiredYaw=Math.atan2(rel.x,rel.z)*180/Math.PI;let yawError=((desiredYaw-enemy.body.yaw+540)%360)-180;const desiredPitch=Math.atan2(rel.y,Math.hypot(rel.x,rel.z))*180/Math.PI;const pitchError=desiredPitch-enemy.body.pitch;return{throttle:distance>700?.9:.62,pitch:clamp(pitchError/24,-1,1),roll:clamp(yawError/42,-1,1),yaw:clamp(yawError/75,-1,1),shouldFire:distance<config.ai.attackRange&&forwardDot>=config.ai.fireCone&&time-enemy.lastFireAt>.42};}

export function stepAirCombatMatch(match,input,dt,config){if(match.status!=="playing")return match;const step=Math.min(config.performance.maxDelta,Math.max(.001,Number(dt)||.016));const next={...match,time:match.time+step,enemies:match.enemies.map(enemy=>({...enemy,body:{...enemy.body,position:{...enemy.body.position}}})),player:{...match.player,position:{...match.player.position}},fireCooldown:Math.max(0,match.fireCooldown-step),damageCooldown:Math.max(0,match.damageCooldown-step)};
  next.player=withinWorld(stepFlight3D(next.player,{pitch:input?.pitch||0,roll:input?.roll||0,yaw:input?.yaw||0,throttle:input?.throttle??next.player.throttle},step,{...config.flight,ceiling:config.world.ceiling}),config);
  if(next.player.position.y<=1&&next.player.speed>config.flight.stallSpeed*1.22){next.player.health=Math.max(0,next.player.health-45*step);next.damageCooldown=.4;}
  for(const enemy of next.enemies){if(enemy.dead)continue;const ai=aiInput(enemy,next.player,config,next.time);enemy.body=withinWorld(stepFlight3D(enemy.body,ai,step,{...config.flight,ceiling:config.world.ceiling}),config);if(ai.shouldFire&&next.damageCooldown<=0){enemy.lastFireAt=next.time;next.player.health=Math.max(0,next.player.health-7);next.damageCooldown=config.combat.damageCooldown;next.notice="Training aircraft scored a hit.";}}
  if(next.player.health<=0){next.status="lost";next.notice="Aircraft disabled. Restart the training sortie.";}
  if(next.time>=config.mission.timeLimitSeconds&&next.status==="playing"){next.status="lost";next.notice="Mission time expired.";}
  if(next.targetId&&!next.enemies.some(enemy=>enemy.id===next.targetId&&!enemy.dead))next.targetId=selectAirTarget(next,config);
  return next;
}

export function targetTelemetry(match){const target=match.enemies.find(enemy=>enemy.id===match.targetId&&!enemy.dead);if(!target)return null;const rel=sub3(target.body.position,match.player.position);return{id:target.id,distance:Math.round(length3(rel)),health:target.health,alignment:angleDot(match.player,target.body),relative:rel};}
