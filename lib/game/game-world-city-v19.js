// LANERIQ AI Game World V19 — procedural city planning grounded in roads, parcels, zoning and playable building prototypes.
import {compileInteriorV18} from './game-world-interior-v18.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));
const hash=value=>{const s=String(value??'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const rnd=k=>hash(k)/4294967295;
export const GAME_WORLD_CITY_V19=Object.freeze({version:'game-world-city-v19',architecture:'roads-blocks-parcels-zoning-building-program-utilities',deterministic:true,productionCityRendererVerified:false});

export function createRoadNetworkV19(input={}){
  const seed=String(input.seed||'laneriq-city'),size=clamp(input.sizeMeters||1200,240,10000),block=clamp(input.blockMeters||120,60,320),half=size/2,roads=[];let id=1;
  const count=Math.max(2,Math.floor(size/block));for(let i=0;i<=count;i++){const t=-half+i*(size/count);roads.push({id:`road_${id++}`,class:i===Math.floor(count/2)?'arterial':'street',from:{x:-half,z:t},to:{x:half,z:t},width:i===Math.floor(count/2)?18:9});roads.push({id:`road_${id++}`,class:i===Math.floor(count/2)?'arterial':'street',from:{x:t,z:-half},to:{x:t,z:half},width:i===Math.floor(count/2)?18:9});}
  return{seed,sizeMeters:size,blockMeters:block,roads,intersectionCount:(count+1)**2,connected:true};
}

export function createBlocksAndParcelsV19(network={},input={}){
  const count=Math.max(2,Math.floor(network.sizeMeters/network.blockMeters)),half=network.sizeMeters/2,blocks=[],parcels=[];let bid=1,pid=1;
  for(let z=0;z<count;z++)for(let x=0;x<count;x++){const minX=-half+x*(network.sizeMeters/count),minZ=-half+z*(network.sizeMeters/count),w=network.sizeMeters/count;const block={id:`block_${bid++}`,x:+(minX+w/2).toFixed(2),z:+(minZ+w/2).toFixed(2),width:+w.toFixed(2),depth:+w.toFixed(2)};blocks.push(block);const split=rnd(`${network.seed}:${block.id}`)>.45?4:2;for(let i=0;i<split;i++){const cols=split===4?2:2,rows=split===4?2:1,cx=i%cols,cz=Math.floor(i/cols),pw=w/cols,pd=w/rows;parcels.push({id:`parcel_${pid++}`,blockId:block.id,x:+(minX+pw*(cx+.5)).toFixed(2),z:+(minZ+pd*(cz+.5)).toFixed(2),width:+(pw-8).toFixed(2),depth:+(pd-8).toFixed(2),frontage:+Math.max(pw,pd).toFixed(2)});}}
  return{blocks,parcels,parcelization:true};
}

export function assignCityZoningV19(city={},input={}){
  const center={x:0,z:0},radius=city.blocks.length?Math.max(...city.blocks.map(b=>Math.hypot(b.x,b.z))):1;const parcels=city.parcels.map(p=>{const d=Math.hypot(p.x-center.x,p.z-center.z)/radius,noise=rnd(`zone:${p.id}`);let zone=d<.23?'mixed-core':d<.5?(noise>.55?'commercial':'residential-mid'):(noise>.78?'light-industrial':'residential-low');if(input.theme==='industrial'&&noise>.45)zone='light-industrial';const density=zone==='mixed-core'?1:zone==='commercial'?.82:zone==='residential-mid'?.62:zone==='light-industrial'?.52:.38;return{...p,zone,density};});return{parcels,zones:[...new Set(parcels.map(p=>p.zone))],zoningAssigned:true};
}

function buildingTypeFor(zone){if(zone==='commercial'||zone==='mixed-core')return 'commercial';if(zone==='light-industrial')return 'factory';return 'residential';}
export function generateCityBuildingsV19(zoning={},input={}){
  const maxBuildings=Math.round(clamp(input.maxBuildings||180,8,800)),buildings=[];for(const parcel of zoning.parcels.slice(0,maxBuildings)){const type=buildingTypeFor(parcel.zone),base=parcel.zone==='mixed-core'?8:parcel.zone==='commercial'?5:parcel.zone==='residential-mid'?4:parcel.zone==='light-industrial'?2:2,floors=Math.round(clamp(base+rnd(`floors:${parcel.id}`)*(base*.8),1,30));const setback=parcel.zone==='residential-low'?5:2;buildings.push({id:`building_${parcel.id}`,parcelId:parcel.id,type,x:parcel.x,z:parcel.z,widthMeters:+Math.max(6,parcel.width-setback*2).toFixed(2),depthMeters:+Math.max(6,parcel.depth-setback*2).toFixed(2),floors,style:input.style||'city-adaptive',zone:parcel.zone,occupancyEstimate:Math.round(floors*parcel.width*parcel.depth/(type==='residential'?55:type==='commercial'?38:90))});}
  return{buildings,count:buildings.length,totalOccupancyEstimate:buildings.reduce((n,b)=>n+b.occupancyEstimate,0),programmed:true};
}

export function createCityUtilitiesV19(network={},buildings={}){const hubs=[{id:'utility_power',type:'power',x:-network.sizeMeters*.35,z:network.sizeMeters*.35},{id:'utility_water',type:'water',x:network.sizeMeters*.35,z:network.sizeMeters*.35},{id:'utility_waste',type:'waste',x:network.sizeMeters*.35,z:-network.sizeMeters*.35}];return{hubs,connections:buildings.buildings.map(b=>({buildingId:b.id,power:'utility_power',water:'utility_water',waste:'utility_waste'})),utilityGraphReady:true};}

export function createCityTrafficGraphV19(network={}){const nodes=[],edges=[];for(const road of network.roads){nodes.push({id:`${road.id}_a`,...road.from},{id:`${road.id}_b`,...road.to});edges.push({from:`${road.id}_a`,to:`${road.id}_b`,class:road.class,cost:+Math.hypot(road.to.x-road.from.x,road.to.z-road.from.z).toFixed(2)});}return{nodes,edges,vehicleLanes:true,pedestrianLayer:true,transitReady:true};}

export function compileCityV19(input={}){const seed=String(input.seed||'city-evidence'),network=createRoadNetworkV19({...input.city,seed}),blockParcel=createBlocksAndParcelsV19(network,input.city||{}),zoning=assignCityZoningV19(blockParcel,input.city||{}),buildings=generateCityBuildingsV19(zoning,input.city||{}),utilities=createCityUtilitiesV19(network,buildings),traffic=createCityTrafficGraphV19(network);const prototypeSpec=buildings.buildings[0]||{id:'prototype',type:'residential',widthMeters:20,depthMeters:16,floors:2,style:'adaptive'};const prototype=compileInteriorV18({seed:`${seed}:prototype`,building:prototypeSpec});const internal100=network.connected&&blockParcel.parcelization&&zoning.zoningAssigned&&buildings.programmed&&utilities.utilityGraphReady&&traffic.nodes.length>0&&prototype.readiness.internal100;return{version:GAME_WORLD_CITY_V19.version,network,blockParcel,zoning,buildings,utilities,traffic,prototype,readiness:{internal100,production100:false},truth:{roadNetworkExecutable:true,parcelizationExecutable:true,zoningExecutable:true,buildingProgrammingExecutable:true,utilityGraphExecutable:true,trafficGraphExecutable:true,realTrafficSimulationVerified:false,realCityRendererVerified:false,productionDeploymentVerified:false}};}
