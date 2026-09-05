// LANERIQ AI Game World V16 — ecology-grounded procedural vegetation and GPU instance planning.
import {compileHydrologyEcologyV15} from './game-world-hydrology-ecology-v15.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));
const hash=value=>{const s=String(value??'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const random=(key)=>hash(key)/4294967295;

export const GAME_WORLD_VEGETATION_V16=Object.freeze({version:'game-world-vegetation-v16',architecture:'ecology-suitability-poisson-lite-instancing',deterministic:true,productionRendererVerified:false});

export const VEGETATION_SPECIES_V16=Object.freeze([
  {id:'pine',biomes:['forest','alpine'],moisture:[.35,.8],maxSlope:46,spacing:7,height:[7,23]},
  {id:'oak',biomes:['forest','grassland'],moisture:[.45,.85],maxSlope:34,spacing:9,height:[6,18]},
  {id:'willow',biomes:['wetland','shore'],moisture:[.7,1],maxSlope:20,spacing:8,height:[5,16]},
  {id:'shrub',biomes:['grassland','forest','shore'],moisture:[.2,.95],maxSlope:55,spacing:3,height:[.7,3]},
  {id:'grass',biomes:['grassland','wetland','shore','forest'],moisture:[.15,1],maxSlope:42,spacing:1.2,height:[.15,.8]},
  {id:'rock-lichen',biomes:['rock','alpine'],moisture:[0,.8],maxSlope:80,spacing:4,height:[.1,.5]}
]);

function suitability(species,cell){if(!species.biomes.includes(cell.dominant))return 0;if(cell.moisture<species.moisture[0]||cell.moisture>species.moisture[1]||cell.slope>species.maxSlope)return 0;const moistureMid=(species.moisture[0]+species.moisture[1])/2,moist=1-Math.min(1,Math.abs(cell.moisture-moistureMid)/.5),slope=1-Math.min(1,cell.slope/species.maxSlope);return clamp(.3+moist*.45+slope*.25,0,1);}

export function generateVegetationV16(ecology={},field={},input={}){
  const density=clamp(input.density??.65,.05,1),maxInstances=Math.round(clamp(input.maxInstances||6000,64,30000)),instances=[];
  const res=field.resolution,half=field.sizeMeters/2,cell=field.cellMeters;
  for(const eco of ecology.cells){if(instances.length>=maxInstances)break;const x=eco.cell%res,z=Math.floor(eco.cell/res);for(const species of VEGETATION_SPECIES_V16){const score=suitability(species,eco);if(score<=0)continue;const attempts=Math.max(1,Math.floor((cell/species.spacing)*density*.42));for(let a=0;a<attempts&&instances.length<maxInstances;a++){
      const chance=random(`${field.seed}:${eco.cell}:${species.id}:${a}`);if(chance>score*density)continue;
      const ox=(random(`${field.seed}:x:${eco.cell}:${species.id}:${a}`)-.5)*cell,oz=(random(`${field.seed}:z:${eco.cell}:${species.id}:${a}`)-.5)*cell;
      const wx=-half+x*cell+ox,wz=-half+z*cell+oz,height=species.height[0]+random(`${field.seed}:h:${eco.cell}:${species.id}:${a}`)*(species.height[1]-species.height[0]);
      const age=random(`${field.seed}:age:${eco.cell}:${species.id}:${a}`),stage=age>.82?'mature':age>.45?'young':'sapling';
      instances.push({id:`veg_${instances.length+1}`,species:species.id,x:+wx.toFixed(2),y:+eco.height.toFixed(2),z:+wz.toFixed(2),height:+height.toFixed(2),stage,biome:eco.dominant,moisture:eco.moisture,lodGroup:height>8?'canopy':'ground'});
    }} }
  return{instances,density,maxInstances,count:instances.length,ecologyGrounded:true};
}

export function applyVegetationCompetitionV16(vegetation={},input={}){
  const minSpacing=clamp(input.minSpacingMeters||1.5,.5,12),accepted=[],grid=new Map(),cellSize=minSpacing;
  for(const item of vegetation.instances||[]){const gx=Math.floor(item.x/cellSize),gz=Math.floor(item.z/cellSize);let blocked=false;for(let dz=-1;dz<=1&&!blocked;dz++)for(let dx=-1;dx<=1&&!blocked;dx++){for(const other of grid.get(`${gx+dx}:${gz+dz}`)||[]){if(Math.hypot(item.x-other.x,item.z-other.z)<minSpacing){blocked=true;break;}}}if(blocked)continue;accepted.push(item);const key=`${gx}:${gz}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(item);}return{instances:accepted,rejected:(vegetation.instances||[]).length-accepted.length,minSpacingMeters:minSpacing,competitionApplied:true};
}

export function buildVegetationInstanceBatchesV16(vegetation={},input={}){
  const maxPerBatch=Math.round(clamp(input.maxPerBatch||1023,64,2048)),groups=new Map();for(const item of vegetation.instances||[]){const key=`${item.species}|${item.lodGroup}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  const batches=[];for(const[key,list]of groups)for(let i=0;i<list.length;i+=maxPerBatch){const[species,lodGroup]=key.split('|');batches.push({species,lodGroup,count:Math.min(maxPerBatch,list.length-i),instances:list.slice(i,i+maxPerBatch).map(v=>({id:v.id,x:v.x,y:v.y,z:v.z,height:v.height,stage:v.stage}))});}
  return{batches,totalInstances:(vegetation.instances||[]).length,gpuInstancingReady:true,windFieldReady:true,lodReady:true};
}

export function compileVegetationV16(input={}){const v15=compileHydrologyEcologyV15(input.v15||input);const raw=generateVegetationV16(v15.ecology,v15.v14.field,input.vegetation||{});const vegetation=applyVegetationCompetitionV16(raw,input.competition||{});const batches=buildVegetationInstanceBatchesV16(vegetation,input.batching||{});const internal100=v15.readiness.internal100&&raw.ecologyGrounded&&vegetation.competitionApplied&&batches.gpuInstancingReady&&vegetation.instances.length>0;return{version:GAME_WORLD_VEGETATION_V16.version,v15,vegetation,batches,readiness:{internal100,production100:false},truth:{ecologyGroundedPlacementExecutable:true,competitionExecutable:true,gpuInstancePlanExecutable:true,realVegetationRendererVerified:false,realWindSimulationVerified:false,realDeviceForestPerformanceVerified:false,productionDeploymentVerified:false}};}
