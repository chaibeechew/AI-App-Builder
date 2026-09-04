// LANERIQ AI Game World Generator V1
// Technology-transfer bridge: reuses the existing deterministic game runtime, 3D gameplay
// and content-production contracts instead of creating a second incompatible engine.
// Renderer fidelity, real engine export and real-device performance remain evidence-gated.

import {compileGameRuntimeV1} from "./runtime-v1.js";
import {
  generateDungeon,
  createWorldTimeWeather,
  rollLootTable
} from "./advanced-3d-gameplay-systems-v1.js";
import {
  validateSceneDocument,
  planLargeWorldContent
} from "./content-production-pipeline-v1.js";

function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function text(value){return String(value??"").trim();}
function slug(value){return text(value).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"world";}
function hashSeed(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seeded(seed){let x=(Number(seed)>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function unique(values){return[...new Set(values.filter(Boolean))];}

export const GAME_WORLD_GENERATOR_V1=Object.freeze({
  version:"game-world-generator-v1",
  productName:"LANERIQ AI Game World Generator",
  architecture:"world-layer-over-existing-game-runtime",
  deterministic:true,
  technologyTransfer:[
    "game-runtime-v1",
    "advanced-3d-gameplay-v1",
    "content-production-pipeline-v1"
  ],
  stages:[
    "intent","world-blueprint","ai-map","scene-document","level-logic",
    "dungeon-castle-treasure","runtime-bridge","preview-export-contract"
  ],
  internalWorldContractVerified:true,
  productionRendererVerified:false,
  realEngineExporterVerified:false,
  realDeviceWorldPerformanceVerified:false
});

export const GAME_WORLD_TEMPLATES=Object.freeze([
  {id:"dark-fantasy-kingdom",name:"Dark Fantasy Kingdom",genre:"RPG",biomes:["dark-forest","highlands","snow-mountain","ancient-ruins"],landmarks:["grand-castle","three-villages","dragon-peak","deep-dungeon"],mood:"epic mysterious"},
  {id:"magic-forest",name:"Magic Forest Adventure",genre:"Adventure",biomes:["enchanted-forest","riverlands","crystal-caves","moon-grove"],landmarks:["tree-city","ancient-shrine","hidden-cave","guardian-arena"],mood:"wonder luminous"},
  {id:"pirate-islands",name:"Pirate Treasure Islands",genre:"Adventure",biomes:["tropical-island","coral-coast","jungle","volcanic-islet"],landmarks:["pirate-port","sunken-temple","treasure-cave","fortress"],mood:"bold adventurous"},
  {id:"cyber-city",name:"Cyber City",genre:"Action",biomes:["neon-core","industrial-ring","undercity","rooftops"],landmarks:["megacorp-tower","market","transit-hub","reactor-vault"],mood:"high-tech tense"},
  {id:"space-outpost",name:"Space Outpost",genre:"Sci-fi",biomes:["habitat","crater-field","ice-ridge","alien-zone"],landmarks:["command-base","hangar","research-lab","ancient-vault"],mood:"isolated cinematic"},
  {id:"survival-wasteland",name:"Survival Wasteland",genre:"Survival",biomes:["dead-city","dry-basin","toxic-zone","shelter-belt"],landmarks:["safe-hub","abandoned-hospital","radio-tower","underground-bunker"],mood:"harsh suspenseful"},
  {id:"cartoon-kingdom",name:"Cartoon Kingdom",genre:"Platformer",biomes:["green-hills","candy-valley","cloud-garden","toy-forest"],landmarks:["happy-castle","play-village","star-cave","boss-stage"],mood:"bright playful"},
  {id:"ice-realm",name:"Ice Realm",genre:"RPG",biomes:["snowfield","frozen-lake","ice-canyon","aurora-peak"],landmarks:["ice-castle","winter-village","frost-dungeon","dragon-lair"],mood:"majestic cold"}
]);

const KEYWORDS=Object.freeze({
  castle:/castle|fortress|palace|城堡|堡垒|堡壘|宫殿|宮殿/i,
  dungeon:/dungeon|maze|crypt|地牢|地下城|迷宫|迷宮/i,
  treasure:/treasure|loot|chest|宝物|寶物|宝箱|寶箱|掉落/i,
  boss:/boss|dragon|首领|首領|魔王|巨龙|巨龍/i,
  village:/village|town|city|村庄|村莊|城镇|城鎮|城市/i,
  quest:/quest|mission|story|任务|任務|剧情|劇情/i,
  weather:/weather|rain|snow|storm|fog|天气|天氣|雨|雪|雾|霧/i,
  openWorld:/open.?world|large world|开放世界|開放世界/i
});

export function inferGameWorldIntent(prompt="",options={}){
  const value=text(prompt);
  const requested=Object.fromEntries(Object.entries(KEYWORDS).map(([key,pattern])=>[key,pattern.test(value)]));
  const template=resolveWorldTemplate(value,options.templateId);
  const scale=options.scale||(/massive|huge|open.?world|大型|巨大|开放世界|開放世界/i.test(value)?"large":/small|tiny|小型|迷你/i.test(value)?"small":"medium");
  const levelMatch=value.match(/(\d{1,3})\s*(?:levels?|关|關)/i);
  const treasureMatch=value.match(/(\d{1,4})\s*(?:treasures?|chests?|宝箱|寶箱|宝物|寶物)/i);
  const bossMatch=value.match(/(\d{1,2})\s*(?:boss(?:es)?|首领|首領)/i);
  return{
    prompt:value,
    templateId:template.id,
    genre:options.genre||template.genre,
    scale,
    requested,
    levelCount:clamp(options.levelCount||levelMatch?.[1]||12,1,100),
    treasureCount:clamp(options.treasureCount||treasureMatch?.[1]||30,0,500),
    bossCount:clamp(options.bossCount||bossMatch?.[1]||4,0,32),
    mood:options.mood||template.mood,
    biomes:template.biomes,
    landmarks:template.landmarks
  };
}

export function resolveWorldTemplate(prompt="",templateId=""){
  const explicit=GAME_WORLD_TEMPLATES.find(item=>item.id===templateId);
  if(explicit)return explicit;
  const value=text(prompt).toLowerCase();
  if(/cyber|neon|赛博|賽博/.test(value))return GAME_WORLD_TEMPLATES.find(item=>item.id==="cyber-city");
  if(/space|planet|alien|太空|星球|外星/.test(value))return GAME_WORLD_TEMPLATES.find(item=>item.id==="space-outpost");
  if(/pirate|island|海盗|海盜|岛|島/.test(value))return GAME_WORLD_TEMPLATES.find(item=>item.id==="pirate-islands");
  if(/survival|wasteland|zombie|生存|废土|廢土|丧尸|喪屍/.test(value))return GAME_WORLD_TEMPLATES.find(item=>item.id==="survival-wasteland");
  if(/cartoon|kids|cute|卡通|儿童|兒童|可爱|可愛/.test(value))return GAME_WORLD_TEMPLATES.find(item=>item.id==="cartoon-kingdom");
  if(/ice|snow|frost|冰|雪/.test(value))return GAME_WORLD_TEMPLATES.find(item=>item.id==="ice-realm");
  if(/forest|magic|森林|魔法/.test(value))return GAME_WORLD_TEMPLATES.find(item=>item.id==="magic-forest");
  return GAME_WORLD_TEMPLATES[0];
}

export function buildWorldBlueprint({prompt="",seed="",templateId="",genre="",scale="",levelCount,treasureCount,bossCount}={}){
  const intent=inferGameWorldIntent(prompt,{templateId,genre,scale,levelCount,treasureCount,bossCount});
  const worldSeed=text(seed)||`${intent.templateId}:${hashSeed(prompt||intent.templateId)}`;
  const rng=seeded(hashSeed(worldSeed));
  const sizeByScale={small:900,medium:2200,large:5200};
  const worldSize=sizeByScale[intent.scale]||2200;
  const regionCount=intent.scale==="large"?8:intent.scale==="small"?4:6;
  const template=resolveWorldTemplate(prompt,intent.templateId);
  const regions=[];
  for(let index=0;index<regionCount;index++){
    const angle=(Math.PI*2*index/regionCount)+(rng()-.5)*.22;
    const radius=index===0?0:worldSize*(.22+rng()*.25);
    const biome=template.biomes[index%template.biomes.length];
    const landmark=template.landmarks[index%template.landmarks.length];
    regions.push({
      id:`region_${index+1}_${slug(biome)}`,
      name:index===0?"World Heart":titleCase(`${biome} ${index+1}`),
      biome,
      landmark,
      center:{x:Math.round(Math.cos(angle)*radius),z:Math.round(Math.sin(angle)*radius)},
      radius:Math.round(worldSize*(.11+rng()*.05)),
      danger:index===0?1:clamp(Math.round(2+(index/(regionCount-1))*8),1,10),
      levelBand:{min:Math.max(1,Math.floor(index*intent.levelCount/regionCount)+1),max:Math.max(1,Math.ceil((index+1)*intent.levelCount/regionCount))}
    });
  }
  const routes=[];
  for(let index=1;index<regions.length;index++)routes.push({id:`route_${index}`,from:regions[0].id,to:regions[index].id,type:index%3===0?"hidden":"main",traversable:true});
  for(let index=1;index<regions.length-1;index++)routes.push({id:`ring_${index}`,from:regions[index].id,to:regions[index+1].id,type:"secondary",traversable:true});
  const pointsOfInterest=buildPointsOfInterest(intent,regions,rng);
  return{
    id:`world_${slug(template.id)}_${hashSeed(worldSeed).toString(16)}`,
    version:1,
    seed:worldSeed,
    title:titleCase(optionsTitle(prompt,template.name)),
    prompt:text(prompt),
    genre:intent.genre,
    mood:intent.mood,
    scale:intent.scale,
    worldSizeMeters:worldSize,
    regions,
    routes,
    pointsOfInterest,
    progression:{levels:intent.levelCount,bosses:intent.bossCount,treasures:intent.treasureCount,criticalPath:regions.map(region=>region.id)},
    generation:{deterministic:true,templateId:template.id,technologyTransfer:GAME_WORLD_GENERATOR_V1.technologyTransfer}
  };
}

function optionsTitle(prompt,fallback){const cleaned=text(prompt).replace(/\s+/g," ").slice(0,54);return cleaned.length>=8?cleaned:fallback;}
function titleCase(value){return text(value).split(/[\s_-]+/).map(part=>part?part[0].toUpperCase()+part.slice(1):part).join(" ");}

function buildPointsOfInterest(intent,regions,rng){
  const poi=[];
  const add=(type,count)=>{for(let index=0;index<count;index++){const region=regions[index%regions.length],angle=rng()*Math.PI*2,distance=region.radius*(.25+rng()*.55);poi.push({id:`${type}_${index+1}`,type,regionId:region.id,position:{x:Math.round(region.center.x+Math.cos(angle)*distance),z:Math.round(region.center.z+Math.sin(angle)*distance)},hidden:type==="treasure"&&index%3===0});}};
  add("castle",intent.requested.castle?1:regions.some(r=>/castle|fortress|palace/i.test(r.landmark))?1:0);
  add("dungeon",intent.requested.dungeon?Math.min(5,Math.max(1,Math.ceil(intent.levelCount/12))):1);
  add("boss",intent.bossCount);
  add("treasure",intent.treasureCount);
  add("quest",intent.requested.quest?Math.min(24,Math.max(4,intent.levelCount)):Math.min(8,intent.levelCount));
  add("settlement",intent.requested.village?3:1);
  return poi;
}

export function buildWorldSceneDocument(blueprint){
  const entities=[];
  for(const region of blueprint.regions){
    entities.push({id:region.id,name:region.name,components:[
      {type:"transform",data:{x:region.center.x,y:0,z:region.center.z}},
      {type:"scriptless-behavior",data:{kind:"biome-zone",biome:region.biome,danger:region.danger}},
      {type:"navigation",data:{walkable:true,radius:region.radius}}
    ]});
  }
  for(const poi of blueprint.pointsOfInterest){
    entities.push({id:poi.id,name:titleCase(poi.type),components:[
      {type:"transform",data:{x:poi.position.x,y:0,z:poi.position.z}},
      {type:"collider",data:{shape:"bounds",trigger:["quest","treasure"].includes(poi.type)}},
      {type:"scriptless-behavior",data:{kind:poi.type,regionId:poi.regionId,hidden:poi.hidden===true}}
    ]});
  }
  return validateSceneDocument({id:`scene_${blueprint.id}`,entities});
}

export function buildWorldGameplayPackage(blueprint){
  const dungeonPois=blueprint.pointsOfInterest.filter(item=>item.type==="dungeon");
  const dungeons=dungeonPois.map((poi,index)=>({poiId:poi.id,layout:generateDungeon({seed:`${blueprint.seed}:dungeon:${index}`,width:11+(index%3)*2,height:11+(index%3)*2,rooms:10+index*3})}));
  const treasureEntries=[
    {id:"coins",weight:45,min:20,max:120},
    {id:"healing",weight:25,min:1,max:3},
    {id:"rare-material",weight:15,min:1,max:2},
    {id:"epic-item",weight:8,min:1,max:1},
    {id:"legendary-item",weight:2,min:1,max:1}
  ];
  const treasure=blueprint.pointsOfInterest.filter(item=>item.type==="treasure").map((poi,index)=>({poiId:poi.id,loot:rollLootTable(treasureEntries,{seed:`${blueprint.seed}:loot:${index}`,rolls:index%8===0?2:1})}));
  const bosses=blueprint.pointsOfInterest.filter(item=>item.type==="boss").map((poi,index)=>({poiId:poi.id,phaseCount:Math.min(4,2+Math.floor(index/2)),level:Math.max(1,Math.ceil((index+1)*blueprint.progression.levels/Math.max(1,blueprint.progression.bosses))),arenaRadius:24+index*4,rewardTier:index===blueprint.progression.bosses-1?"legendary":"epic"}));
  return{
    dungeons,
    treasure,
    bosses,
    weather:createWorldTimeWeather({hour:8,weather:/ice|snow/i.test(blueprint.prompt)?"snow":"clear"}),
    quests:blueprint.pointsOfInterest.filter(item=>item.type==="quest").map((poi,index)=>({id:`quest_${index+1}`,poiId:poi.id,type:index%3===0?"story":index%3===1?"explore":"combat",requiredLevel:Math.max(1,Math.ceil((index+1)*blueprint.progression.levels/Math.max(1,blueprint.pointsOfInterest.filter(item=>item.type==="quest").length))) }))
  };
}

export function buildWorldStreamingPlan(blueprint){
  const assets=blueprint.regions.map((region,index)=>({id:region.id,x:region.center.x,z:region.center.z,sizeMb:20+region.danger*2,dependencies:index===0?[]:[blueprint.regions[0].id]}));
  return planLargeWorldContent(assets,{chunkSize:blueprint.scale==="large"?192:128,chunkBudgetMb:64});
}

export function compileWorldToGameRuntime(blueprint){
  return compileGameRuntimeV1({
    name:blueprint.title,
    productType:"mobile_game",
    designSystem:{primaryColor:"#07110d",accentColor:"#e3c665"},
    game:{
      enabled:true,
      genre:blueprint.genre,
      maxHealth:100,
      enemyCount:Math.max(3,blueprint.progression.bosses*2),
      maxLevel:blueprint.progression.levels,
      coreLoop:unique(["explore","discover","combat",blueprint.progression.treasures?"collect":null,blueprint.progression.bosses?"boss":null,"progress"])
    }
  });
}

export function compileGameWorldProject(input={}){
  const blueprint=buildWorldBlueprint(input);
  const scene=buildWorldSceneDocument(blueprint);
  const gameplay=buildWorldGameplayPackage(blueprint);
  const streaming=buildWorldStreamingPlan(blueprint);
  const runtime=compileWorldToGameRuntime(blueprint);
  const errors=[];
  if(!scene.valid)errors.push(...scene.errors);
  if(!runtime?.playable)errors.push("runtime_not_playable");
  if(!blueprint.routes.every(route=>route.traversable))errors.push("untraversable_route");
  return{
    id:blueprint.id,
    version:GAME_WORLD_GENERATOR_V1.version,
    blueprint,
    scene:scene.scene,
    gameplay,
    streaming,
    runtime,
    validation:{valid:errors.length===0,errors,deterministic:true},
    evidence:{
      worldContract:"internal-verified",
      runtimeContract:"existing-runtime-bridge",
      sceneSafety:"validated-scriptless-scene-document",
      productionRenderer:false,
      realEngineExport:false,
      realDeviceWorldPerformance:false
    }
  };
}

export function summarizeWorldProject(project){
  return{
    id:project.id,
    title:project.blueprint.title,
    genre:project.blueprint.genre,
    regions:project.blueprint.regions.length,
    routes:project.blueprint.routes.length,
    pointsOfInterest:project.blueprint.pointsOfInterest.length,
    levels:project.blueprint.progression.levels,
    bosses:project.gameplay.bosses.length,
    dungeons:project.gameplay.dungeons.length,
    treasures:project.gameplay.treasure.length,
    sceneEntities:project.scene.entityCount,
    playableRuntime:project.runtime.playable===true,
    valid:project.validation.valid===true
  };
}
