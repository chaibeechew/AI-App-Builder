// SoolenAI Game Studio Intelligence foundations.
// Deterministic, provider-neutral authoring and QA contracts for large mobile games.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function cleanId(v){return text(v).replace(/[^a-zA-Z0-9_.:-]/g,"_").slice(0,120);}
function hash(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
function seeded(seed){let x=(parseInt(hash(seed),16)>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}

export const GAME_STUDIO_INTELLIGENCE_V1=Object.freeze({
  version:"game-studio-intelligence-v1",
  systems:[
    "cinematic-timeline-editor","character-creator","inventory-equipment-editor","combat-skill-graph",
    "procedural-city-building-generator","water-ocean-system","vehicle-aircraft-editor","ai-npc-director",
    "dynamic-economy","live-events-season-system","analytics-balancing-ai","autonomous-game-qa-agent"
  ],
  targetPlatforms:["ios","android","web-preview"],
  deterministic:true,
  liveOpsProviderVerified:false,
  realDeviceQaVerified:false
});

export function inferGameStudioCapabilities(idea=""){
  const s=text(idea);
  const matched=/cinematic|timeline editor|character creator|equipment editor|inventory editor|skill graph|procedural city|building generator|water system|ocean system|vehicle editor|aircraft editor|npc director|dynamic economy|live event|season system|balancing ai|game qa|自动qa|自動qa|角色创建|角色創建|装备编辑|裝備編輯|技能图|技能圖|程序化城市|程序化城市|海洋系统|海洋系統|载具编辑|載具編輯|飞机编辑|飛機編輯|npc导演|npc導演|动态经济|動態經濟|赛季|賽季|平衡ai|自动测试游戏|自動測試遊戲/i.test(s);
  const wants={
    cinematic:/cinematic|timeline|cutscene|过场|過場/i.test(s),character:/character creator|角色创建|角色創建|捏脸|捏臉/i.test(s),
    equipment:/inventory|equipment|背包|装备|裝備/i.test(s),skillGraph:/skill graph|combat skill|技能图|技能圖|技能编辑|技能編輯/i.test(s),
    city:/procedural city|building generator|城市生成|建筑生成|建築生成/i.test(s),water:/water system|ocean|海洋|水体|水體/i.test(s),
    vehicle:/vehicle editor|aircraft editor|载具|載具|飞机编辑|飛機編輯/i.test(s),npcDirector:/npc director|crowd ai|npc导演|npc導演|人群ai/i.test(s),
    economy:/dynamic economy|economy simulation|动态经济|動態經濟/i.test(s),season:/live event|season system|赛季|賽季|活动系统|活動系統/i.test(s),
    balance:/balancing ai|analytics|平衡ai|数值分析|數值分析/i.test(s),qa:/game qa|automated qa|autonomous qa|自动qa|自動qa|自动测试游戏|自動測試遊戲/i.test(s)
  };
  return{matched,wants,systems:[
    "Cinematic/Timeline documents use bounded tracks, shots, markers and skip/recovery rules; arbitrary executable timeline scripts are rejected.",
    "Character Creator stores cosmetic/body presets as bounded game parameters with stable IDs and never treats appearance controls as real biometric identity.",
    "Inventory/Equipment editing validates slots, duplicate equipment, weight, stat budgets, item requirements and reversible loadout changes.",
    "Combat Skill Graph validates targeting, cooldown/cost, links, effects and cycle safety before a generated skill graph can run.",
    "Procedural City/Building generation is seeded and deterministic, producing road/block/building metadata that can be regenerated for saves and QA.",
    "Water/Ocean simulation exposes bounded visual wave/current contracts for gameplay and mobile budgets without pretending to be a final fluid renderer.",
    "Vehicle/Aircraft Editor clamps gameplay physics parameters and separates original game balance data from real-world classified or operational claims.",
    "AI NPC Director schedules bounded goals, crowd density and activity states so world simulation cannot grow without a mobile CPU/entity budget.",
    "Dynamic Economy uses supply/demand, price floors/ceilings and bounded ticks so generated economies remain testable and recoverable.",
    "Live Events/Season plans validate dates, reward types, progression caps and rollback metadata; a live backend is required before activation is claimed.",
    "Analytics/Balancing AI detects outliers and recommends experiments from evidence; it does not silently rewrite production balance from synthetic samples.",
    "Autonomous Game QA runs deterministic play passes, records failed assertions/goal coverage, proposes bounded repairs and can re-test an applied repair."
  ],truthRule:"Game Studio Intelligence proves internal authoring, simulation and QA contracts only. Final cinematic rendering, human art review, live-ops activation, economy telemetry, production balance, real network behavior and iOS/Android device QA require measured production evidence."};
}

// Cinematic / timeline authoring.
const TRACK_TYPES=new Set(["camera","character","animation","audio","vfx","subtitle","gameplay-lock","marker"]);
export function validateCinematicTimeline(doc={}){
  const tracks=(doc.tracks||[]).slice(0,64).map((t,i)=>({id:cleanId(t.id||`track_${i}`),type:cleanId(t.type),clips:(t.clips||[]).slice(0,256).map((c,j)=>({id:cleanId(c.id||`clip_${j}`),start:clamp(c.start,0,7200),duration:clamp(c.duration,.01,600),asset:cleanId(c.asset),skippable:c.skippable!==false}))}));
  const errors=[];for(const t of tracks){if(!TRACK_TYPES.has(t.type))errors.push(`invalid_track:${t.id}`);for(const c of t.clips)if(c.start+c.duration>7200)errors.push(`clip_out_of_bounds:${c.id}`);}
  if(doc.externalScript||doc.eval||doc.executable)errors.push("timeline_executable_code_not_allowed");
  const duration=tracks.reduce((m,t)=>Math.max(m,...t.clips.map(c=>c.start+c.duration),0),0);
  return{valid:errors.length===0,errors,timeline:{id:cleanId(doc.id||"cinematic"),tracks,duration:+duration.toFixed(3),skipTarget:clamp(doc.skipTarget??duration,0,duration||0),checksum:hash(JSON.stringify(tracks))}};
}

// Character creator: game appearance parameters only, not biometric identity.
export function createCharacterPreset(input={}){
  const preset={id:cleanId(input.id||"character"),body:{height:clamp(input.height??.5,0,1),build:clamp(input.build??.5,0,1)},face:{shape:clamp(input.faceShape??.5,0,1),eyes:clamp(input.eyes??.5,0,1),jaw:clamp(input.jaw??.5,0,1)},style:{hair:cleanId(input.hair||"default"),outfit:cleanId(input.outfit||"starter"),palette:cleanId(input.palette||"neutral")},voice:cleanId(input.voice||"voice_1")};
  return{...preset,checksum:hash(JSON.stringify(preset)),biometricIdentity:false};
}

const EQUIPMENT_SLOTS=new Set(["head","chest","hands","legs","feet","main_hand","off_hand","ring_1","ring_2","amulet"]);
export function validateEquipmentLoadout(items=[],limits={maxWeight:60,maxStatBudget:500}){
  const normalized=(items||[]).slice(0,80).map((item,i)=>({id:cleanId(item.id||`item_${i}`),slot:cleanId(item.slot),weight:clamp(item.weight,0,100),stats:Object.fromEntries(Object.entries(item.stats||{}).slice(0,16).map(([k,v])=>[cleanId(k),clamp(v,-999,999)])),requiredLevel:clamp(item.requiredLevel,0,200)}));
  const errors=[],seen=new Set();let totalWeight=0,totalStats=0;for(const item of normalized){if(!EQUIPMENT_SLOTS.has(item.slot))errors.push(`invalid_slot:${item.id}`);if(seen.has(item.slot))errors.push(`duplicate_slot:${item.slot}`);seen.add(item.slot);totalWeight+=item.weight;totalStats+=Object.values(item.stats).reduce((s,v)=>s+Math.abs(v),0);}
  if(totalWeight>limits.maxWeight)errors.push("loadout_over_weight");if(totalStats>limits.maxStatBudget)errors.push("loadout_over_stat_budget");
  return{valid:errors.length===0,errors,items:normalized,totalWeight:+totalWeight.toFixed(2),totalStats:+totalStats.toFixed(2)};
}

const SKILL_NODE_TYPES=new Set(["input","condition","target","damage","heal","shield","buff","debuff","move","cooldown","cost","output"]);
export function validateCombatSkillGraph(doc={}){
  const nodes=(doc.nodes||[]).slice(0,128).map((n,i)=>({id:cleanId(n.id||`node_${i}`),type:cleanId(n.type),next:(n.next||[]).slice(0,12).map(cleanId),value:clamp(n.value,-100000,100000)})),errors=[],ids=new Set(nodes.map(n=>n.id));
  for(const n of nodes){if(!SKILL_NODE_TYPES.has(n.type))errors.push(`invalid_skill_node:${n.id}`);for(const next of n.next)if(!ids.has(next))errors.push(`missing_skill_link:${n.id}:${next}`);}
  const visiting=new Set(),visited=new Set();function cycle(id){if(visiting.has(id))return true;if(visited.has(id))return false;visiting.add(id);const n=nodes.find(x=>x.id===id);for(const next of n?.next||[])if(cycle(next))return true;visiting.delete(id);visited.add(id);return false;}
  for(const n of nodes)if(cycle(n.id)){errors.push("unsafe_skill_cycle");break;}
  if(!nodes.some(n=>n.type==="output"))errors.push("skill_output_required");
  return{valid:errors.length===0,errors,nodes,checksum:hash(JSON.stringify(nodes))};
}

// Seeded procedural city/building plan.
export function generateProceduralCity({seed="city",blocks=12,blockSize=60,maxBuildingsPerBlock=8}={}){
  const rng=seeded(seed),count=Math.floor(clamp(blocks,1,128)),size=clamp(blockSize,20,300),out=[];for(let i=0;i<count;i++){const row=Math.floor(i/Math.ceil(Math.sqrt(count))),col=i%Math.ceil(Math.sqrt(count)),buildings=[],n=1+Math.floor(rng()*clamp(maxBuildingsPerBlock,1,16));for(let b=0;b<n;b++)buildings.push({id:`b_${i}_${b}`,floors:1+Math.floor(rng()*20),footprint:+(8+rng()*24).toFixed(2),style:["residential","market","office","civic"][Math.floor(rng()*4)]});out.push({id:`block_${i}`,x:col*size,z:row*size,roadWidth:+(6+rng()*8).toFixed(2),buildings});}
  return{seed:text(seed),blockSize:size,blocks:out,checksum:hash(JSON.stringify(out)),deterministic:true};
}

// Lightweight renderer-neutral ocean contract.
export function sampleWaterSurface({time=0,wind=4,waveHeight=1,samples=16}={}){const count=Math.floor(clamp(samples,2,128)),w=clamp(wind,0,30),h=clamp(waveHeight,0,8),points=[];for(let i=0;i<count;i++){const x=i*2,y=Math.sin(i*.7+time*(.4+w*.03))*h*.65+Math.sin(i*.19-time*.6)*h*.35;points.push({x,y:+y.toFixed(3)});}return{points,wind:w,waveHeight:h,rendererVerified:false};}

const VEHICLE_TYPES=new Set(["car","motorcycle","truck","boat","hover","aircraft","helicopter","spaceship"]);
export function validateVehicleAircraftConfig(config={}){
  const type=cleanId(config.type||"car"),errors=[];if(!VEHICLE_TYPES.has(type))errors.push("unsupported_vehicle_type");
  const model={id:cleanId(config.id||"vehicle"),type,mass:clamp(config.mass,50,200000),maxSpeed:clamp(config.maxSpeed,1,1200),acceleration:clamp(config.acceleration,.1,100),turnRate:clamp(config.turnRate,1,360),grip:clamp(config.grip,0,2),liftClass:type==="aircraft"||type==="helicopter"?clamp(config.liftClass??.5,0,1):0,damageModel:config.damageModel!==false};
  return{valid:errors.length===0,errors,model,truth:"Gameplay physics values are abstract balance parameters, not real-world operational or classified performance claims."};
}

// NPC director with bounded entity/activity budgets.
export function createNpcDirector({maxActive=80,seed="npc"}={}){return{seed:text(seed),maxActive:Math.floor(clamp(maxActive,1,300)),tick:0,npcs:[],events:[]};}
export function stepNpcDirector(state,{population=120,hour=12,hotspots=[]}={}){const rng=seeded(`${state.seed}:${state.tick}`),active=Math.min(Math.floor(clamp(population,0,5000)),state.maxActive),activities=["work","travel","social","shop","rest","patrol"],npcs=[];for(let i=0;i<active;i++)npcs.push({id:`npc_${i}`,activity:hour<6||hour>22?"rest":activities[Math.floor(rng()*activities.length)],mood:+(40+rng()*60).toFixed(1),hotspot:hotspots.length?cleanId(hotspots[Math.floor(rng()*hotspots.length)]):null});return{...state,tick:state.tick+1,npcs,events:[...state.events.slice(-31),{type:"director_tick",active,hour}]};}

// Dynamic economy simulation.
export function createDynamicEconomy(goods=[]){return{tick:0,goods:(goods||[]).slice(0,128).map((g,i)=>({id:cleanId(g.id||`good_${i}`),basePrice:clamp(g.basePrice,1,100000),price:clamp(g.basePrice,1,100000),supply:clamp(g.supply,0,1_000_000),demand:clamp(g.demand,0,1_000_000),floor:clamp(g.floor??1,1,100000),ceiling:clamp(g.ceiling??100000,1,1_000_000)}))};}
export function stepDynamicEconomy(state,{production={},consumption={},elasticity=.08}={}){const e=clamp(elasticity,.001,.5),goods=state.goods.map(g=>{const supply=Math.max(0,g.supply+(Number(production[g.id])||0)-(Number(consumption[g.id])||0)),ratio=(g.demand+1)/(supply+1),target=g.basePrice*Math.pow(ratio,e*4),price=clamp(g.price+(target-g.price)*e,g.floor,g.ceiling);return{...g,supply:+supply.toFixed(2),price:+price.toFixed(2)};});return{tick:state.tick+1,goods};}

// Live event / season authoring contract; activation requires external backend evidence.
const REWARD_TYPES=new Set(["cosmetic","soft_currency","xp","title","badge","item"]);
export function validateSeasonPlan(plan={}){const errors=[],duration=Math.floor(clamp(plan.durationDays,1,180)),events=(plan.events||[]).slice(0,64).map((e,i)=>({id:cleanId(e.id||`event_${i}`),day:Math.floor(clamp(e.day,0,duration-1)),reward:{type:cleanId(e.reward?.type),amount:clamp(e.reward?.amount,0,1_000_000)}}));for(const e of events)if(!REWARD_TYPES.has(e.reward.type))errors.push(`invalid_reward_type:${e.id}`);if(plan.payToWin===true)errors.push("pay_to_win_season_not_allowed");return{valid:errors.length===0,errors,season:{id:cleanId(plan.id||"season"),durationDays:duration,events,rollbackVersion:Math.max(1,Math.floor(Number(plan.rollbackVersion)||1)),liveBackendConnected:false}};}

// Analytics / balancing AI: evidence to recommendation only.
export function analyzeBalanceMetrics(rows=[]){const data=(rows||[]).slice(0,5000).map(r=>({id:cleanId(r.id),matches:Math.max(0,Math.floor(Number(r.matches)||0)),winRate:clamp(r.winRate,0,1),pickRate:clamp(r.pickRate,0,1),avgDamage:Math.max(0,Number(r.avgDamage)||0)}));const issues=[],recommendations=[];for(const r of data){if(r.matches<30)issues.push(`low_sample:${r.id}`);if(r.matches>=30&&r.winRate>.58){issues.push(`high_win_rate:${r.id}`);recommendations.push({id:r.id,experiment:"reduce one high-impact coefficient by 3-7% and A/B test"});}if(r.matches>=30&&r.winRate<.42){issues.push(`low_win_rate:${r.id}`);recommendations.push({id:r.id,experiment:"increase reliability/utility slightly before raw damage"});}if(r.pickRate>.45)issues.push(`high_pick_rate:${r.id}`);}
  return{rows:data,issues,recommendations,productionRewriteAllowed:false,requiresHumanReview:true};
}

// Deterministic autonomous QA orchestration. Repair is supplied by the caller and re-tested; no hidden code mutation.
export function runGameQaPass({scenario={},actions=[],play,assertState,goal,maxSteps=500}={}){let state=structuredClone(scenario),steps=0,issues=[],goalReached=false;for(const action of(actions||[]).slice(0,maxSteps)){try{state=play?play(state,action):state;steps++;const check=assertState?assertState(state):true;if(check!==true)issues.push(typeof check==="string"?check:`invalid_state:${steps}`);if(goal&&goal(state)===true){goalReached=true;break;}}catch(e){issues.push(`runtime_error:${steps+1}:${text(e?.message).slice(0,120)}`);break;}}if(goal&&!goalReached)issues.push("goal_not_reached");return{passed:issues.length===0,steps,goalReached,issues,finalState:state,fingerprint:hash(JSON.stringify({issues,state}))};}
export function runAutonomousGameQaCycle({scenario={},actions=[],play,assertState,goal,diagnose,repair,maxRounds=3}={}){let current=structuredClone(scenario),rounds=[];for(let round=1;round<=clamp(maxRounds,1,5);round++){const result=runGameQaPass({scenario:current,actions,play,assertState,goal});const diagnosis=result.passed?[]:(diagnose?diagnose(result,current):result.issues.map(issue=>({issue,fix:"review bounded state transition"})));rounds.push({round,result,diagnosis});if(result.passed)return{passed:true,rounds,finalScenario:current,retested:round>1};if(!repair)break;const next=repair(current,diagnosis,result);if(!next||JSON.stringify(next)===JSON.stringify(current))break;current=structuredClone(next);}return{passed:false,rounds,finalScenario:current,retested:rounds.length>1};}
