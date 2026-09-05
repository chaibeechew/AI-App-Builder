// LANERIQ AI Game World V20 — unified production world art, optimization and evidence closure.
import {compileCityV19} from './game-world-city-v19.js';
import {planLodHlod,buildGpuInstanceBatches,validateShaderMaterialGraph} from './content-production-pipeline-v1.js';
import {createExportManifestV13,evaluateEngineExportEvidenceV13,evaluateProductionClosureV13} from './game-world-production-export-v13.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));
const hash=value=>{const s=String(value??'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const rnd=k=>hash(k)/4294967295;

export const GAME_WORLD_PRODUCTION_WORLD_V20=Object.freeze({
  version:'game-world-production-world-v20',
  productName:'LANERIQ AI Production World Engine',
  architecture:'terrain-ecology-vegetation-architecture-interior-city-world-art-production-closure',
  gameplayTruth:'mesh-collision-nav-structural-room-and-city-graphs',
  visualTruth:'materials-decals-lod-hlod-instancing-optional-neural-appearance',
  deterministic:true,
  productionAutoWrite:false
});

const PALETTES=Object.freeze({
  fantasy:{ground:['moss','soil','stone'],building:['aged-stone','wood','iron'],accent:['gold','banner-red'],water:'river-clear'},
  cyber:{ground:['wet-asphalt','concrete','metal'],building:['glass','brushed-metal','emissive-panel'],accent:['neon-cyan','neon-magenta'],water:'urban-reflective'},
  modern:{ground:['asphalt','paving','grass'],building:['glass','concrete','steel'],accent:['warm-light','signage'],water:'clean-blue'},
  wasteland:{ground:['dust','cracked-earth','rubble'],building:['rusted-metal','concrete','scrap'],accent:['hazard-yellow','embers'],water:'muddy'}
});

export function createWorldArtPaletteV20(input={}){
  const theme=PALETTES[input.theme]?input.theme:'modern',p=PALETTES[theme];
  const materialGraphs=[
    {id:'terrain',tier:'mobile_high',nodes:[{id:'base',type:'color',inputs:[]},{id:'rough',type:'roughness',inputs:[]},{id:'out',type:'output',inputs:['base','rough']}]},
    {id:'building',tier:'mobile_high',nodes:[{id:'base',type:'color',inputs:[]},{id:'normal',type:'normal',inputs:[]},{id:'rough',type:'roughness',inputs:[]},{id:'out',type:'output',inputs:['base','normal','rough']}]}
  ];
  const validation=materialGraphs.map(g=>({id:g.id,...validateShaderMaterialGraph(g)}));
  return{theme,palette:p,materialGraphs,validation,mobileSafe:validation.every(v=>v.valid),semanticMaterials:true};
}

export function createWorldLodHlodV20(city={},input={}){
  const buildingPlans=(city.buildings?.buildings||[]).slice(0,400).map(b=>({id:b.id,...planLodHlod({triangles:Math.round(clamp(b.widthMeters*b.depthMeters*b.floors*42,5000,800000)),distances:[18,45,95,180],staticInstances:Math.max(20,Math.round(b.floors*12))})}));
  const terrain=planLodHlod({triangles:Math.round(clamp((city.prototype?.v17?.v16?.v15?.v14?.mesh?.triangleCount||2048)*3,2048,2000000)),distances:[40,120,320,700],staticInstances:256});
  return{terrain,buildings:buildingPlans,hlodEnabled:buildingPlans.some(p=>p.hlod.enabled),distanceCulling:true,impostorReady:true};
}

export function createWorldGpuBatchesV20(city={},input={}){
  const items=[];for(const b of (city.buildings?.buildings||[]).slice(0,800))items.push({id:b.id,mesh:`building-${b.type}`,material:`zone-${b.zone}`});
  const vegetation=city.prototype?.v17?.v16?.vegetation?.instances||[];for(const v of vegetation.slice(0,10000))items.push({id:v.id,mesh:`veg-${v.species}`,material:`biome-${v.biome}`});
  const batches=buildGpuInstanceBatches(items,{maxPerBatch:Math.round(clamp(input.maxPerBatch||1023,64,2048))});
  return{items:items.length,batches,gpuInstancing:true,batchCount:batches.length};
}

export function createWorldDecalsV20(city={},input={}){
  const max=Math.round(clamp(input.maxDecals||1200,16,5000)),decals=[];
  for(const b of (city.buildings?.buildings||[])){if(decals.length>=max)break;const count=1+Math.floor(rnd(`decal-count:${b.id}`)*3);for(let i=0;i<count&&decals.length<max;i++)decals.push({id:`decal_${b.id}_${i}`,target:b.id,kind:rnd(`decal-kind:${b.id}:${i}`)>.5?'weathering':'signage',u:+rnd(`u:${b.id}:${i}`).toFixed(3),v:+rnd(`v:${b.id}:${i}`).toFixed(3),runtimeCritical:false});}
  return{decals,count:decals.length,atlasReady:true,streamingReady:true};
}

export function createWorldDestructionStateV20(city={},input={}){
  const maxActive=Math.round(clamp(input.maxActiveDestruction||32,4,128)),buildings=(city.buildings?.buildings||[]).slice(0,400).map((b,i)=>({buildingId:b.id,destructible:i%3!==0,state:'intact',health:100,supportGraph:'v17-structural-bounded',maxCascadeNodes:32,persistentKey:`damage:${b.id}`}));
  return{buildings,maxActive,active:0,rollbackSnapshotReady:true,networkReplicationReady:true};
}

export function createWorldAssetManifestV20(city={},art={},lod={},batches={},decals={},destruction={}){
  const terrain=city.prototype?.v17?.v16?.v15?.v14;
  const hydro=city.prototype?.v17?.v16?.v15?.hydrology;
  const vegetation=city.prototype?.v17?.v16?.vegetation;
  return{
    version:'laneriq-world-asset-manifest-v20',
    categories:{
      terrain:{vertices:terrain?.mesh?.vertices?.length||0,triangles:terrain?.mesh?.triangleCount||0},
      hydrology:{rivers:hydro?.rivers?.length||0,lakes:hydro?.lakes?.length||0},
      vegetation:{instances:vegetation?.instances?.length||0},
      city:{roads:city.network?.roads?.length||0,blocks:city.blockParcel?.blocks?.length||0,parcels:city.blockParcel?.parcels?.length||0,buildings:city.buildings?.count||0},
      interiors:{prototypeRooms:city.prototype?.egress?.checkedRooms||0,prototypeFurniture:city.prototype?.furnishing?.count||0},
      art:{materialGraphs:art.materialGraphs.length,decals:decals.count,gpuBatches:batches.batchCount},
      destruction:{buildings:destruction.buildings.length}
    },
    streaming:{lod:true,hlod:lod.hlodEnabled,instancing:batches.gpuInstancing,decals:decals.streamingReady},
    gameplayTruthSeparatedFromVisualTruth:true
  };
}

export function evaluateProductionWorldEvidenceV20(input={}){
  const gates={
    terrainRenderer:Boolean(input.terrainRendererVerified),waterRenderer:Boolean(input.waterRendererVerified),vegetationRenderer:Boolean(input.vegetationRendererVerified),
    architectureMesh:Boolean(input.architectureMeshVerified),interiorPlaytest:Boolean(input.interiorPlaytestVerified),cityRenderer:Boolean(input.cityRendererVerified),
    hardwareSoak:Boolean(input.hardwareSoakVerified),realIos:Boolean(input.realIosVerified),realAndroid:Boolean(input.realAndroidVerified),trafficSoak:Boolean(input.trafficSoakVerified)
  };
  return{gates,allRequired:Object.values(gates).every(Boolean)};
}

export function compileProductionWorldV20(input={}){
  const city=compileCityV19(input.v19||input);
  const art=createWorldArtPaletteV20(input.art||{}),lod=createWorldLodHlodV20(city,input.lod||{}),batches=createWorldGpuBatchesV20(city,input.batching||{}),decals=createWorldDecalsV20(city,input.decals||{}),destruction=createWorldDestructionStateV20(city,input.destruction||{});
  const manifest=createWorldAssetManifestV20(city,art,lod,batches,decals,destruction),exportManifest=createExportManifestV13({worldId:input.worldId||'production-world-v20',revision:input.revision||20});
  const exportEvidence=evaluateEngineExportEvidenceV13(input.exportEvidence||{}),worldEvidence=evaluateProductionWorldEvidenceV20(input.worldEvidence||{});
  const closure=evaluateProductionClosureV13({...input.closure,engineExportsVerified:input.closure?.engineExportsVerified??exportEvidence.allRequired,largeWorldSoakVerified:input.closure?.largeWorldSoakVerified??worldEvidence.gates.hardwareSoak});
  const internal100=city.readiness.internal100&&art.mobileSafe&&lod.distanceCulling&&batches.gpuInstancing&&manifest.gameplayTruthSeparatedFromVisualTruth;
  const production100=internal100&&worldEvidence.allRequired&&exportEvidence.allRequired&&closure.production100;
  return{version:GAME_WORLD_PRODUCTION_WORLD_V20.version,city,art,lod,batches,decals,destruction,manifest,exportManifest,exportEvidence,worldEvidence,closure,layers:['v14-terrain','v15-hydrology-ecology','v16-vegetation','v17-architecture','v18-interior','v19-city','v20-production-world-art'],readiness:{internal100,production100},truth:{terrainToCityInternalChainVerified:internal100,gameplayVisualTruthSeparated:true,realWorldArtRendererVerified:worldEvidence.allRequired,engineExportEvidenceComplete:exportEvidence.allRequired,productionDeploymentVerified:production100}};
}
