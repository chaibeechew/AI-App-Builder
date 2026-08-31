// SoolenAI 3D world foundations for RPG/Action/open-world/vehicle games.
// Local deterministic simulation only; renderer, real-device certification and live services remain separate evidence.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function finite(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback;}
function len2(x,z){return Math.hypot(x,z);}

export const WORLD_3D_SYSTEMS_V1=Object.freeze({
  version:"world-3d-systems-v1",
  systems:["character-controller","action-combat-3d","camera-orbit","chunk-streaming","lod-budget","world-origin","vehicle-physics"],
  platforms:["ios","android","web-preview"],
  liveRendererEvidence:false
});

export function inferWorld3dCapabilities(idea=""){
  const s=String(idea||"");
  const openWorld=/open.?world|开放世界|開放世界|大地图|大地圖/i.test(s);
  const rpg=/\brpg\b|role.?playing|角色扮演|mmorpg/i.test(s);
  const action=/action|hack.?and.?slash|动作|動作|格斗|格鬥/i.test(s);
  const vehicle=/vehicle|driving|racing|car|truck|motorcycle|载具|載具|驾驶|駕駛|赛车|賽車/i.test(s);
  const wants3d=/\b3d\b|three.?dimensional|三维|三維/i.test(s)||openWorld;
  const systems=[];
  if(wants3d&&(rpg||action))systems.push("3D character controller with acceleration, grounded state, slope/step limits, jump/dodge, stamina, health, target lock and camera-relative movement.");
  if(openWorld)systems.push("Open-world streaming with deterministic chunk coordinates, preload radius, unload hysteresis, LOD/entity budgets, world-origin rebasing and save-safe chunk state.");
  if(vehicle)systems.push("Vehicle simulation with acceleration/braking, steering response, traction/slip, drag, surface grip, damage recovery and mobile driving assists.");
  return{wants3d,openWorld,rpg,action,vehicle,systems,truthRule:"3D simulation foundations do not prove a production renderer, final art, real-device performance or open-world content scale until those are measured."};
}

export function createCharacter3dState({x=0,y=0,z=0}={}){return{
  position:{x:finite(x),y:finite(y),z:finite(z)},velocity:{x:0,y:0,z:0},yaw:0,grounded:true,health:100,stamina:100,invulnerable:0,combo:0,targetId:null,status:"active"
};}
export function stepCharacter3d(state,input={},dt=.016){if(state.status!=="active")return state;const step=clamp(dt,.001,.05),s={...state,position:{...state.position},velocity:{...state.velocity}};const moveX=clamp(input.x,-1,1),moveZ=clamp(input.z,-1,1),mag=Math.max(1,len2(moveX,moveZ));const nx=moveX/mag,nz=moveZ/mag;const sprint=input.sprint&&s.stamina>0,moveSpeed=sprint?7.5:4.8,accel=s.grounded?28:10;const targetX=nx*moveSpeed,targetZ=nz*moveSpeed;s.velocity.x+=clamp(targetX-s.velocity.x,-accel*step,accel*step);s.velocity.z+=clamp(targetZ-s.velocity.z,-accel*step,accel*step);
  if(input.jump&&s.grounded){s.velocity.y=7.2;s.grounded=false;}if(input.dodge&&s.grounded&&s.stamina>=20){s.velocity.x+=nx*6;s.velocity.z+=nz*6;s.stamina-=20;s.invulnerable=.28;}if(sprint&&(Math.abs(moveX)+Math.abs(moveZ)>0))s.stamina=Math.max(0,s.stamina-16*step);else s.stamina=Math.min(100,s.stamina+11*step);s.velocity.y-=18*step;s.position.x+=s.velocity.x*step;s.position.y+=s.velocity.y*step;s.position.z+=s.velocity.z*step;if(s.position.y<=0){s.position.y=0;s.velocity.y=0;s.grounded=true;}s.invulnerable=Math.max(0,s.invulnerable-step);if(Math.abs(moveX)+Math.abs(moveZ)>.01)s.yaw=Math.atan2(nx,nz);return s;}
export function applyCharacterDamage(state,damage){if(state.status!=="active"||state.invulnerable>0)return state;const s={...state,health:Math.max(0,state.health-Math.max(0,Number(damage)||0))};if(s.health<=0)s.status="downed";return s;}
export function performCharacterAttack(state,{heavy=false}={}){if(state.status!=="active")return{state,attack:null};const cost=heavy?24:8;if(state.stamina<cost)return{state,attack:null};const next={...state,stamina:state.stamina-cost,combo:heavy?0:(state.combo+1)%4};return{state:next,attack:{type:heavy?"heavy":"light",comboIndex:next.combo,damage:heavy?32:12+next.combo*3,range:heavy?2.4:1.8,arcDegrees:heavy?95:70,authoritativeHitRequired:true}};}

export function createOrbitCamera({distance=5.5,pitch=.35,yaw=0}={}){return{distance:clamp(distance,2,12),pitch:clamp(pitch,-.2,1.1),yaw:finite(yaw),collisionPadding:.25,reducedMotion:false};}
export function stepOrbitCamera(camera,input={},dt=.016){const step=clamp(dt,.001,.05);return{...camera,yaw:camera.yaw+clamp(input.lookX,-1,1)*2.4*step,pitch:clamp(camera.pitch-clamp(input.lookY,-1,1)*1.8*step,-.2,1.1),distance:clamp(camera.distance+(Number(input.zoom)||0)*step,2,12)};}

export function chunkKey(x,z){return`${Math.floor(x)}:${Math.floor(z)}`;}
export function worldToChunk(position={x:0,z:0},chunkSize=96){const size=clamp(chunkSize,32,512);return{x:Math.floor(finite(position.x)/size),z:Math.floor(finite(position.z)/size),size};}
export function planChunkStreaming({position={x:0,z:0},chunkSize=96,loadRadius=2,unloadRadius=3,current=[]}={}){const center=worldToChunk(position,chunkSize),loadR=clamp(loadRadius,1,6),unloadR=Math.max(loadR+1,clamp(unloadRadius,2,8)),wanted=new Set();for(let x=center.x-loadR;x<=center.x+loadR;x++)for(let z=center.z-loadR;z<=center.z+loadR;z++)wanted.add(chunkKey(x,z));const currentSet=new Set(current);const load=[...wanted].filter(k=>!currentSet.has(k));const unload=[...currentSet].filter(key=>{const [x,z]=key.split(":").map(Number);return Math.max(Math.abs(x-center.x),Math.abs(z-center.z))>unloadR;});return{center,wanted:[...wanted],load,unload,budgets:{maxLoadedChunks:(loadR*2+1)**2+24,maxActiveEnemies:48,maxDynamicBodies:96,maxHighLodCharacters:12,maxAudioSources:24},requiresAsyncAssetStreaming:true};}
export function rebaseWorldOrigin({position={x:0,y:0,z:0},threshold=5000}={}){const t=clamp(threshold,500,20000),distance=Math.hypot(finite(position.x),finite(position.z));if(distance<t)return{required:false,offset:{x:0,y:0,z:0}};const offset={x:Math.round(position.x/1000)*1000,y:0,z:Math.round(position.z/1000)*1000};return{required:true,offset};}

export function createVehicleState(){return{speed:0,heading:0,steer:0,slip:0,traction:1,damage:0,gear:1,rpm:900,x:0,z:0,status:"driving"};}
export function stepVehiclePhysics(state,input={},dt=.016,{surfaceGrip=1}={}){if(state.status!=="driving")return state;const step=clamp(dt,.001,.05),s={...state},throttle=clamp(input.throttle,0,1),brake=clamp(input.brake,0,1),steer=clamp(input.steer,-1,1),grip=clamp(surfaceGrip,0.2,1.2),speedAbs=Math.abs(s.speed);const engine=22*throttle*(1-s.damage*.006),braking=35*brake*Math.sign(s.speed||1),drag=.012*s.speed*speedAbs+1.6*Math.sign(s.speed||0);s.speed+= (engine-braking-drag)*step;s.speed=clamp(s.speed,-8,68);const steerAuthority=1-Math.min(.7,speedAbs/100),targetSteer=steer*steerAuthority;s.steer+=(targetSteer-s.steer)*Math.min(1,8*step);const lateralDemand=Math.abs(s.steer)*speedAbs/32;s.slip=clamp(lateralDemand-grip*.55,0,1);s.traction=clamp(1-s.slip*.65,0.25,1);s.heading+=s.steer*s.speed*.018*s.traction*step;s.x+=Math.sin(s.heading)*s.speed*step;s.z+=Math.cos(s.heading)*s.speed*step;s.rpm=clamp(900+speedAbs*95+throttle*1800,800,7600);s.gear=Math.max(1,Math.min(6,Math.floor(speedAbs/12)+1));if(input.collision){s.damage=clamp(s.damage+Math.min(18,speedAbs*.25),0,100);s.speed*=.55;if(s.damage>=100)s.status="disabled";}return s;}
export function recoverVehicle(state){if(state.status==="disabled")return{...state,status:"driving",speed:0,damage:75,slip:0};return{...state,speed:0,slip:0};}
