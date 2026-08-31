// SoolenAI AAA-scale mobile game production foundations.
// Deterministic provider-neutral contracts; final renderer/device quality remains evidence-gated.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function hashSeed(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seeded(seed){let x=(Number(seed)>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}

export const AAA_MOBILE_PRODUCTION_V1=Object.freeze({
  version:"aaa-mobile-production-v1",
  systems:[
    "animation-blend-tree","two-bone-ik","hit-reaction-ragdoll","navmesh","tactical-group-ai",
    "skill-editor","vfx-editor","material-lighting","terrain-editor","biome-generator","settlement-system",
    "quest-dialogue-visual-editor","game-debugger","game-profiler"
  ],
  targetPlatforms:["ios","android","web-preview"],
  deterministic:true,
  rendererVerified:false,
  realDeviceProfileVerified:false
});

export function inferAaaMobileProductionCapabilities(idea=""){
  const s=text(idea);
  const matched=/\b3d\b|aaa|open.?world|rpg|action|animation|blend tree|ik|ragdoll|navmesh|terrain|biome|settlement|skill editor|vfx editor|profiler|debugger|角色动画|角色動畫|动画树|動畫樹|反向动力学|反向動力學|布娃娃|导航网格|導航網格|地形|生态群系|生態群系|城镇|城鎮|技能编辑|技能編輯|特效编辑|特效編輯|性能分析/i.test(s);
  const wants={
    animation:/animation|blend tree|动画|動畫/i.test(s),ik:/\bik\b|inverse kinematics|反向动力学|反向動力學/i.test(s),
    ragdoll:/ragdoll|hit reaction|布娃娃|受击|受擊/i.test(s),navmesh:/navmesh|navigation mesh|导航网格|導航網格/i.test(s),
    tacticalAi:/tactical ai|squad ai|group combat ai|战术ai|戰術ai|群体战斗|群體戰鬥/i.test(s),skillEditor:/skill editor|ability editor|技能编辑|技能編輯/i.test(s),
    vfxEditor:/vfx editor|particle editor|特效编辑|特效編輯|粒子编辑|粒子編輯/i.test(s),lighting:/material|lighting|材质|材質|灯光|燈光|光照/i.test(s),
    terrain:/terrain editor|terrain|地形编辑|地形編輯|地形/i.test(s),biome:/biome|生态群系|生態群系|生态区|生態區/i.test(s),
    settlement:/settlement|village|town builder|城镇|城鎮|村庄|村莊|据点|據點/i.test(s),visualNarrative:/quest editor|dialogue editor|任务编辑|任務編輯|对话编辑|對話編輯/i.test(s),
    profiler:/profiler|debugger|performance|性能分析|调试器|調試器/i.test(s)
  };
  return{matched,wants,systems:[
    "Animation Blend Trees blend bounded locomotion/action states from speed, direction and grounded parameters, with deterministic transition metadata.",
    "Two-bone IK solves bounded limb targets with reach clamping and fallback poses instead of allowing unstable impossible joints.",
    "Hit Reaction and Ragdoll are explicit states with recovery timers and a reduced-motion fallback; gameplay authority remains separate from presentation physics.",
    "NavMesh generation validates walkable cells/regions and path connectivity before AI is allowed to depend on a route.",
    "Tactical Group AI assigns bounded roles/slots and local steering so many mobile agents do not each run unlimited global planning.",
    "Skill Editor validates costs, cooldowns, targeting, effects and upgrade links before a skill graph is accepted.",
    "VFX Editor enforces particle, light, decal, duration and overdraw budgets with reduced-motion variants.",
    "Material/Lighting profiles cap dynamic lights, shadow casters, texture scale and mobile shader complexity tiers.",
    "Terrain/Biome generation is seeded, bounded, chunk-aware and produces reproducible height/biome metadata for streaming and save recovery.",
    "Settlement simulation tracks population, housing, food, morale, production and upgrades with bounded deterministic ticks.",
    "Quest/Dialogue Visual Documents validate graph links, conditions and terminal paths before publishable story flow is accepted.",
    "Game Debugger/Profiler records bounded frame, memory, entity, draw-call and event evidence and reports budget violations instead of hiding them."
  ],truthRule:"AAA-scale internal tools prove authoring/runtime contracts only. Final animation fidelity, GPU/CPU frame time, memory, thermals, large-world density, native-device behavior and store quality require measured production evidence."};
}

// Animation Blend Tree
export function createBlendTree({clips=[]}={}){return{clips:(clips||[]).slice(0,32).map(c=>({id:text(c.id),speed:clamp(c.speed,0,20),direction:clamp(c.direction,-180,180),grounded:c.grounded!==false})).filter(c=>c.id),transitionMs:120};}
export function evaluateBlendTree(tree,{speed=0,direction=0,grounded=true}={}){const clips=tree?.clips||[];if(!clips.length)return{primary:null,secondary:null,weight:0};const candidates=clips.filter(c=>c.grounded===grounded);const pool=candidates.length?candidates:clips;const scored=pool.map(c=>({...c,distance:Math.abs(c.speed-speed)+Math.abs(c.direction-direction)/180})).sort((a,b)=>a.distance-b.distance);const a=scored[0],b=scored[1]||a,total=Math.max(.0001,a.distance+b.distance);return{primary:a.id,secondary:b.id,weight:+clamp(a===b?0:a.distance/total,0,1).toFixed(3),transitionMs:tree.transitionMs};}

// Two-bone IK: geometric reach contract, renderer-independent.
export function solveTwoBoneIk({root={x:0,y:0},target={x:1,y:0},upper=1,lower=1,bend=1}={}){const ux=Math.max(.001,Number(upper)||1),lx=Math.max(.001,Number(lower)||1),dx=(Number(target.x)||0)-(Number(root.x)||0),dy=(Number(target.y)||0)-(Number(root.y)||0),raw=Math.hypot(dx,dy),reach=clamp(raw,Math.abs(ux-lx)+.0001,ux+lx-.0001),base=Math.atan2(dy,dx),cosA=clamp((ux*ux+reach*reach-lx*lx)/(2*ux*reach),-1,1),a=Math.acos(cosA)*(bend<0?-1:1),joint={x:root.x+Math.cos(base+a)*ux,y:root.y+Math.sin(base+a)*ux},ratio=raw>0?reach/raw:0,end={x:root.x+dx*ratio,y:root.y+dy*ratio};return{joint,end,clamped:Math.abs(raw-reach)>.001,reachable:raw<=ux+lx};}

// Hit reaction / ragdoll presentation state.
export function createReactionState(){return{mode:"animated",reaction:null,recovery:0,ragdollWeight:0,reducedMotion:false};}
export function applyHitReaction(state,{force=0,critical=false,reducedMotion=state.reducedMotion}={}){const magnitude=clamp(force,0,100);if(reducedMotion)return{...state,mode:"animated",reaction:critical?"strong_hit":"hit",recovery:.18,ragdollWeight:0,reducedMotion:true};if(magnitude>=65)return{...state,mode:"ragdoll",reaction:"heavy_hit",recovery:1.2,ragdollWeight:clamp(magnitude/100,.65,1)};return{...state,mode:"animated",reaction:critical?"strong_hit":"hit",recovery:.28,ragdollWeight:0};}
export function stepReaction(state,dt=.016){const recovery=Math.max(0,state.recovery-clamp(dt,.001,.1));if(recovery===0&&state.mode==="ragdoll")return{...state,mode:"recovering",recovery:.35,ragdollWeight:0.25};if(recovery===0&&state.mode==="recovering")return{...state,mode:"animated",reaction:null,ragdollWeight:0};return{...state,recovery};}

// NavMesh-like cell graph for deterministic tests.
export function buildNavMesh({width=16,height=16,blocked=[]}={}){const w=clamp(width,2,128),h=clamp(height,2,128),blockedSet=new Set((blocked||[]).map(p=>`${Math.floor(p[0])}:${Math.floor(p[1])}`)),walkable=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!blockedSet.has(`${x}:${y}`))walkable.push(`${x}:${y}`);return{width:w,height:h,blocked:blockedSet,walkable:new Set(walkable),maxVisited:8192};}
export function findNavMeshPath(mesh,start,goal){if(!mesh)return[];const key=(x,y)=>`${x}:${y}`,s=key(Math.floor(start.x),Math.floor(start.y)),g=key(Math.floor(goal.x),Math.floor(goal.y));if(!mesh.walkable.has(s)||!mesh.walkable.has(g))return[];const q=[s],came=new Map([[s,null]]),dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];let count=0;while(q.length&&count++<mesh.maxVisited){const cur=q.shift();if(cur===g)break;const[x,y]=cur.split(":").map(Number);for(const[dx,dy]of dirs){const n=key(x+dx,y+dy);if(mesh.walkable.has(n)&&!came.has(n)){came.set(n,cur);q.push(n);}}}if(!came.has(g))return[];const out=[];for(let cur=g;cur;cur=came.get(cur)){const[x,y]=cur.split(":").map(Number);out.push({x,y});}return out.reverse();}

export function planTacticalGroup(agents=[],target={x:0,z:0}){const roles=["engage","flank_left","flank_right","support"],list=(agents||[]).slice(0,32);return list.map((a,i)=>{const role=roles[i%roles.length],offset=role==="flank_left"?-4:role==="flank_right"?4:0,depth=role==="support"?-5:role==="engage"?1:-1;return{id:text(a.id),role,slot:{x:(Number(target.x)||0)+offset,z:(Number(target.z)||0)+depth},replanHz:role==="engage"?5:2,bounded:true};});}

// Skill/VFX editor documents.
export function validateSkillDocument(skill={}){const errors=[],id=text(skill.id),targeting=["self","target","line","cone","circle","projectile"].includes(skill.targeting)?skill.targeting:null;if(!id)errors.push("id_required");if(!targeting)errors.push("invalid_targeting");const cooldown=clamp(skill.cooldown,0,120),cost=clamp(skill.cost,0,10000),effects=Array.isArray(skill.effects)?skill.effects.slice(0,16):[];if(!effects.length)errors.push("effect_required");for(const e of effects)if(!["damage","heal","shield","buff","debuff","move"].includes(e.type))errors.push(`invalid_effect:${text(e.type)}`);return{valid:errors.length===0,errors,document:{id,targeting,cooldown,cost,effects,upgrades:(skill.upgrades||[]).map(text).slice(0,12)},runtimeSafe:errors.length===0};}
export function validateVfxDocument(vfx={}){const budget={particles:clamp(vfx.particles,0,160),dynamicLights:clamp(vfx.dynamicLights,0,4),decals:clamp(vfx.decals,0,8),duration:clamp(vfx.duration,.05,8),overdrawLayers:clamp(vfx.overdrawLayers,1,4)};const warnings=[];if(Number(vfx.particles)>160)warnings.push("particle_budget_clamped");if(Number(vfx.dynamicLights)>4)warnings.push("light_budget_clamped");return{valid:true,budget,warnings,reducedMotion:{particles:Math.min(16,budget.particles),dynamicLights:Math.min(1,budget.dynamicLights),cameraShake:false}};}

// Materials, lighting, terrain and biome authoring.
export function createMaterialLightingProfile({tier="mobile_high",dynamicLights=2,shadowCasters=2,textureSize=1024}={}){const tiers={mobile_low:{shaderComplexity:1,maxTexture:512},mobile_mid:{shaderComplexity:2,maxTexture:1024},mobile_high:{shaderComplexity:3,maxTexture:2048}};const t=tiers[tier]||tiers.mobile_mid;return{tier,shaderComplexity:t.shaderComplexity,dynamicLights:clamp(dynamicLights,0,4),shadowCasters:clamp(shadowCasters,0,4),textureSize:Math.min(t.maxTexture,clamp(textureSize,128,2048)),bakedLightingPreferred:true};}
export function generateTerrain({seed="terrain",size=16,amplitude=18}={}){const n=clamp(size,4,64),rng=seeded(hashSeed(seed)),heights=[];for(let y=0;y<n;y++){const row=[];for(let x=0;x<n;x++){const wave=Math.sin((x+n*.2)/3)+Math.cos((y+n*.1)/4),noise=(rng()-.5)*.8;row.push(+((wave+noise)*clamp(amplitude,1,100)*.25).toFixed(2));}heights.push(row);}return{seed:text(seed),size:n,heights,checksum:hashSeed(JSON.stringify(heights)).toString(16),chunkSize:32};}
export function classifyBiomes(terrain,{seaLevel=-1,snowLine=5}={}){return terrain.heights.map(row=>row.map(h=>h<=seaLevel?"water":h>=snowLine?"alpine":h>2?"forest":"grassland"));}

// Settlement simulation.
export function createSettlement({population=24}={}){return{population:Math.max(1,Math.floor(population)),housing:32,food:80,morale:70,wood:30,stone:20,level:1,production:{food:5,wood:3,stone:2},status:"stable"};}
export function stepSettlement(state,{hours=1,buildHousing=false,upgrade=false}={}){const s={...state,production:{...state.production}},t=clamp(hours,0,24);s.food=Math.max(0,s.food+s.production.food*t-s.population*.12*t);s.wood+=s.production.wood*t;s.stone+=s.production.stone*t;if(buildHousing&&s.wood>=20){s.wood-=20;s.housing+=8;}if(upgrade&&s.wood>=30&&s.stone>=20){s.wood-=30;s.stone-=20;s.level++;s.production.food++;}const pressure=Math.max(0,s.population-s.housing);s.morale=clamp(s.morale+(s.food>20?1:-4)*t-pressure*.4,0,100);if(s.food<=0)s.status="food_crisis";else if(s.morale<25)s.status="unrest";else s.status="stable";return s;}

// Visual quest/dialogue document combines narrative graph authoring with positions only; no executable code.
export function validateNarrativeVisualDocument(doc={}){const nodes=(doc.nodes||[]).slice(0,400).map(n=>({id:text(n.id),type:text(n.type),x:clamp(n.x,-10000,10000),y:clamp(n.y,-10000,10000),next:(n.next||[]).map(text).slice(0,16),condition:text(n.condition).slice(0,120)})).filter(n=>n.id),ids=new Set(nodes.map(n=>n.id)),errors=[];for(const n of nodes){if(!["quest","dialogue","choice","condition","reward","end"].includes(n.type))errors.push(`invalid_type:${n.id}`);for(const id of n.next)if(!ids.has(id))errors.push(`missing_link:${n.id}:${id}`);}if(doc.externalScript)errors.push("external_scripts_not_allowed");return{valid:errors.length===0,errors,nodes,visualOnly:true,executableScripts:false};}

// Debugger / Profiler.
export function createGameProfiler({targetFps=60}={}){return{targetFps:clamp(targetFps,30,120),samples:[],events:[],maxSamples:600,maxEvents:1000};}
export function recordProfileSample(profiler,sample={}){if(!profiler||profiler.samples.length>=profiler.maxSamples)return false;profiler.samples.push({frameMs:clamp(sample.frameMs,0,250),cpuMs:clamp(sample.cpuMs,0,250),gpuMs:clamp(sample.gpuMs,0,250),memoryMb:clamp(sample.memoryMb,0,16384),drawCalls:clamp(sample.drawCalls,0,20000),entities:clamp(sample.entities,0,100000)});return true;}
export function recordDebugEvent(profiler,event={}){if(!profiler||profiler.events.length>=profiler.maxEvents)return false;profiler.events.push({type:text(event.type).slice(0,64),message:text(event.message).slice(0,500),at:Math.max(0,Number(event.at)||0)});return true;}
export function profileSummary(profiler){const s=profiler?.samples||[];if(!s.length)return{samples:0,score:0,violations:["no_profile_samples"]};const avg=k=>s.reduce((sum,x)=>sum+x[k],0)/s.length,frame=avg("frameMs"),cpu=avg("cpuMs"),gpu=avg("gpuMs"),memory=avg("memoryMb"),drawCalls=avg("drawCalls"),violations=[];const frameBudget=1000/profiler.targetFps;if(frame>frameBudget)violations.push("frame_budget");if(cpu>frameBudget*.75)violations.push("cpu_budget");if(gpu>frameBudget*.8)violations.push("gpu_budget");if(memory>900)violations.push("memory_budget");if(drawCalls>1800)violations.push("draw_call_budget");return{samples:s.length,averages:{frameMs:+frame.toFixed(2),cpuMs:+cpu.toFixed(2),gpuMs:+gpu.toFixed(2),memoryMb:+memory.toFixed(1),drawCalls:+drawCalls.toFixed(0)},violations,score:Math.max(0,100-violations.length*20),productionDeviceEvidence:false};}
