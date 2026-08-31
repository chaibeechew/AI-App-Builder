// SoolenAI deep RPG / action / open-world engineering core.
// Deterministic local simulation only. Rendering, live services and final content scale remain evidence-gated.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function hashSeed(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seeded(seed){let x=(Number(seed)>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}

export const RPG_OPEN_WORLD_SYSTEMS_V1=Object.freeze({
  version:"rpg-open-world-systems-v1",
  systems:["navigation","enemy-ai","boss-phases","animation-state-machine","skill-vfx","procedural-world","quest-graph","npc-relationships","crafting","mount-pet"],
  deterministic:true,
  productionRendererVerified:false
});

export function inferRpgOpenWorldCapabilities(idea=""){
  const s=text(idea);
  const rpg=/\brpg\b|role.?playing|角色扮演|mmorpg|仙侠|仙俠|武侠|武俠/i.test(s),action=/action|hack.?and.?slash|动作|動作|格斗|格鬥/i.test(s),openWorld=/open.?world|开放世界|開放世界|大地图|大地圖/i.test(s);
  const wants={boss:/boss|首领|首領|世界王|raid boss/i.test(s),quests:/quest|任务|任務|支线|支線/i.test(s),relationships:/relationship|romance|friendship|好感|关系|關係/i.test(s),crafting:/craft|forge|炼金|煉金|锻造|鍛造|制作装备|製作裝備/i.test(s),mounts:/mount|horse|坐骑|坐騎|飞行坐骑|飛行坐騎/i.test(s),pets:/pet|companion|宠物|寵物|伙伴|夥伴/i.test(s),procedural:/procedural|random world|随机地图|隨機地圖|程序化/i.test(s)};
  return{matched:rpg||action||openWorld,rpg,action,openWorld,wants,systems:[
    "Navigation uses bounded grids/waypoints and deterministic path selection; expensive full-world pathfinding is avoided on mobile.",
    "Enemy AI uses explicit idle/patrol/chase/attack/retreat/downed states with perception, cooldown and leash boundaries.",
    "Boss encounters use telegraphed phase changes, interrupt windows, recovery windows and deterministic mechanics suitable for testing.",
    "Animation is state-driven (idle/move/jump/dodge/attack/hit/downed) with transition guards rather than arbitrary animation triggering.",
    "Skill VFX descriptors separate gameplay hit logic from presentation, include readability/reduced-motion rules and mobile particle budgets.",
    "Procedural regions are seeded, bounded and save-compatible; generated content must remain reproducible for testing and recovery.",
    "Quest graphs validate prerequisites, branching, completion and fail states so impossible progression is detected before release.",
    "NPC relationships use bounded reputation/affinity state and consequence flags rather than unconstrained hidden memory.",
    "Crafting validates recipes, quantities and inventory changes atomically; no duplicated-resource outcome is accepted.",
    "Mount/Pet systems separate locomotion/companion bonuses from player ownership and save state, with dismissal/recovery behavior."
  ],truthRule:"Deep RPG/open-world systems can be internally verified, but production 3D art, animation quality, huge-world content density, multiplayer persistence and real-device performance still require external evidence."};
}

export function createNavGrid({width=16,height=16,blocked=[]}={}){const w=clamp(width,2,96),h=clamp(height,2,96),set=new Set((blocked||[]).slice(0,w*h).map(([x,y])=>`${Math.floor(x)}:${Math.floor(y)}`));return{width:w,height:h,blocked:set};}
export function findGridPath(grid,start,goal,{maxVisited=4096}={}){if(!grid)return[];const sx=Math.floor(start?.x||0),sy=Math.floor(start?.y||0),gx=Math.floor(goal?.x||0),gy=Math.floor(goal?.y||0),key=(x,y)=>`${x}:${y}`;const valid=(x,y)=>x>=0&&y>=0&&x<grid.width&&y<grid.height&&!grid.blocked.has(key(x,y));if(!valid(sx,sy)||!valid(gx,gy))return[];const q=[[sx,sy]],came=new Map([[key(sx,sy),null]]),dirs=[[1,0],[-1,0],[0,1],[0,-1]];let visits=0;while(q.length&&visits++<maxVisited){const [x,y]=q.shift();if(x===gx&&y===gy)break;for(const[dX,dY]of dirs){const nx=x+dX,ny=y+dY,k=key(nx,ny);if(valid(nx,ny)&&!came.has(k)){came.set(k,key(x,y));q.push([nx,ny]);}}}if(!came.has(key(gx,gy)))return[];const out=[];let cur=key(gx,gy);while(cur){const[x,y]=cur.split(":").map(Number);out.push({x,y});cur=came.get(cur);}return out.reverse();}

export function createEnemyAi({id="enemy",boss=false,x=0,z=0,homeX=x,homeZ=z}={}){return{id:text(id),boss:!!boss,status:"idle",x:Number(x)||0,z:Number(z)||0,homeX:Number(homeX)||0,homeZ:Number(homeZ)||0,health:boss?1000:100,maxHealth:boss?1000:100,aggroRange:boss?24:12,attackRange:boss?3.5:1.8,leashRange:boss?40:22,cooldown:0,phase:1,targetId:null,telegraph:null};}
export function stepEnemyAi(state,{player=null,dt=.016}={}){if(!state||state.status==="downed")return state;const step=clamp(dt,.001,.1),s={...state,cooldown:Math.max(0,state.cooldown-step)};if(!player)return{...s,status:"idle",targetId:null};const dx=(Number(player.x)||0)-s.x,dz=(Number(player.z)||0)-s.z,d=Math.hypot(dx,dz),home=Math.hypot(s.x-s.homeX,s.z-s.homeZ);if(home>s.leashRange){s.status="retreat";s.targetId=null;const mag=Math.max(.001,home);s.x+=(s.homeX-s.x)/mag*4*step;s.z+=(s.homeZ-s.z)/mag*4*step;return s;}if(d<=s.attackRange){s.status="attack";s.targetId=text(player.id||"player");if(s.cooldown<=0){s.cooldown=s.boss?.9:1.2;s.telegraph=s.boss?"boss_swing":"melee";}return s;}if(d<=s.aggroRange){s.status="chase";s.targetId=text(player.id||"player");const mag=Math.max(.001,d),speed=s.boss?3:4.2;s.x+=dx/mag*speed*step;s.z+=dz/mag*speed*step;return s;}s.status="patrol";s.targetId=null;return s;}
export function damageEnemy(state,amount){if(!state||state.status==="downed")return state;const health=Math.max(0,state.health-Math.max(0,Number(amount)||0)),next={...state,health};if(next.boss){const ratio=health/next.maxHealth;next.phase=ratio<=.33?3:ratio<=.66?2:1;next.telegraph=next.phase>state.phase?`phase_${next.phase}`:next.telegraph;}if(health<=0){next.status="downed";next.targetId=null;next.telegraph=null;}return next;}

export function createBossEncounter({id="boss",maxHealth=3000,phases=[.7,.4]}={}){return{id:text(id),health:maxHealth,maxHealth,phase:1,phaseThresholds:[...phases].sort((a,b)=>b-a),mechanicIndex:0,status:"active",telegraph:null,recovery:0,enraged:false};}
export function stepBossEncounter(state,{damage=0,dt=.016}={}){if(state.status!=="active")return state;const s={...state,recovery:Math.max(0,state.recovery-clamp(dt,.001,.1)),health:Math.max(0,state.health-Math.max(0,Number(damage)||0))};const ratio=s.health/s.maxHealth;let phase=1;for(const threshold of s.phaseThresholds)if(ratio<=threshold)phase++;if(phase>s.phase){s.phase=phase;s.mechanicIndex++;s.telegraph=`phase_${phase}_telegraph`;s.recovery=.8;}if(ratio<=.15)s.enraged=true;if(s.health<=0){s.status="defeated";s.telegraph=null;}return s;}

const ANIMATION_TRANSITIONS=Object.freeze({idle:["move","jump","dodge","attack","hit","downed"],move:["idle","jump","dodge","attack","hit","downed"],jump:["idle","move","attack","hit","downed"],dodge:["idle","move","attack","downed"],attack:["idle","move","hit","downed"],hit:["idle","move","downed"],downed:[]});
export function createAnimationState(){return{state:"idle",previous:null,enteredAt:0,lockedUntil:0,speed:1};}
export function transitionAnimation(anim,next,{now=0,lockMs=0,speed=1}={}){if(!anim||now<anim.lockedUntil)return anim;if(!(ANIMATION_TRANSITIONS[anim.state]||[]).includes(next))return anim;return{state:next,previous:anim.state,enteredAt:Number(now)||0,lockedUntil:(Number(now)||0)+Math.max(0,Number(lockMs)||0),speed:clamp(speed,.1,3)};}

export function createSkillVfxDescriptor({id="skill",shape="cone",range=6,colorRole="accent",duration=.6,particles=24}={}){return{id:text(id),shape:["cone","line","circle","self","projectile"].includes(shape)?shape:"cone",range:clamp(range,.5,40),colorRole:text(colorRole)||"accent",duration:clamp(duration,.05,5),particles:clamp(particles,0,120),reducedMotionParticles:Math.min(12,clamp(particles,0,120)),gameplayHitLogicSeparate:true,telegraphRequired:true,flashFrequencyLimited:true};}

export function generateProceduralRegion({seed="world",regionX=0,regionZ=0,size=32,density=.18}={}){const rng=seeded(hashSeed(`${seed}:${regionX}:${regionZ}`)),count=Math.floor(clamp(size,8,128)*clamp(size,8,128)*clamp(density,.01,.6)),features=[];for(let i=0;i<count;i++){const roll=rng(),type=roll<.08?"landmark":roll<.22?"resource":roll<.38?"encounter":"scenery";features.push({id:`${regionX}:${regionZ}:${i}`,type,x:+(rng()*size).toFixed(3),z:+(rng()*size).toFixed(3),variant:Math.floor(rng()*8)});}return{seed:text(seed),regionX,regionZ,size,features,deterministic:true,checksum:hashSeed(JSON.stringify(features)).toString(16)};}

export function validateQuestGraph(quests=[]){const list=(quests||[]).slice(0,300).map(q=>({id:text(q.id),requires:(q.requires||[]).map(text).filter(Boolean),rewards:(q.rewards||[]).slice(0,20)})).filter(q=>q.id),ids=new Set(list.map(q=>q.id)),errors=[];for(const q of list)for(const dep of q.requires)if(!ids.has(dep))errors.push(`missing_dependency:${q.id}:${dep}`);const visiting=new Set(),visited=new Set();function dfs(id){if(visiting.has(id)){errors.push(`cycle:${id}`);return;}if(visited.has(id))return;visiting.add(id);const q=list.find(x=>x.id===id);for(const dep of q?.requires||[])dfs(dep);visiting.delete(id);visited.add(id);}for(const q of list)dfs(q.id);return{valid:errors.length===0,errors,quests:list};}
export function createQuestState(graph){return{completed:new Set(),failed:new Set(),active:new Set(),graph:graph?.quests||[]};}
export function availableQuests(state){return state.graph.filter(q=>!state.completed.has(q.id)&&!state.failed.has(q.id)&&q.requires.every(id=>state.completed.has(id)));}
export function completeQuest(state,id){if(!availableQuests(state).some(q=>q.id===id))return false;state.active.delete(id);state.completed.add(id);return true;}

export function createNpcRelationship({npcId="npc"}={}){return{npcId:text(npcId),affinity:0,reputation:0,flags:new Set(),lastChange:0};}
export function changeNpcRelationship(state,{affinity=0,reputation=0,flag=null,now=0}={}){state.affinity=clamp(state.affinity+Number(affinity||0),-100,100);state.reputation=clamp(state.reputation+Number(reputation||0),-100,100);if(flag)state.flags.add(text(flag));state.lastChange=Number(now)||0;return state;}

export function createInventory(items={}){return{items:Object.fromEntries(Object.entries(items||{}).map(([k,v])=>[text(k),Math.max(0,Math.floor(Number(v)||0))]))};}
export function craftRecipe(inventory,recipe={}){const inputs=recipe.inputs||{},outputs=recipe.outputs||{};for(const[id,qty]of Object.entries(inputs))if((inventory.items[id]||0)<Math.max(1,Math.floor(qty)))return{ok:false,reason:`missing:${id}`};const next={items:{...inventory.items}};for(const[id,qty]of Object.entries(inputs))next.items[id]-=Math.max(1,Math.floor(qty));for(const[id,qty]of Object.entries(outputs))next.items[id]=(next.items[id]||0)+Math.max(1,Math.floor(qty));return{ok:true,inventory:next};}

export function createMountState({id="mount",speedMultiplier=1.5}={}){return{id:text(id),summoned:false,stamina:100,speedMultiplier:clamp(speedMultiplier,1,3),cooldown:0};}
export function stepMount(state,{summon=false,sprint=false,dt=.016}={}){const s={...state,cooldown:Math.max(0,state.cooldown-clamp(dt,.001,.1))};if(summon&&s.cooldown<=0)s.summoned=!s.summoned;if(s.summoned&&sprint)s.stamina=Math.max(0,s.stamina-15*dt);else s.stamina=Math.min(100,s.stamina+8*dt);if(s.stamina<=0){s.summoned=false;s.cooldown=2;}return s;}
export function createPetState({id="pet",role="support"}={}){return{id:text(id),role:text(role),active:true,health:100,bond:0,command:"follow",cooldown:0};}
export function commandPet(state,command){const allowed=["follow","stay","assist","retreat"];if(!allowed.includes(command))return state;return{...state,command};}
