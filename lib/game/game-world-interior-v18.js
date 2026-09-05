// LANERIQ AI Game World V18 — procedural interiors, furnishing, lighting and egress/nav truth.
import {compileArchitectureV17} from './game-world-architecture-v17.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));
const hash=value=>{const s=String(value??'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const rnd=k=>hash(k)/4294967295;
export const GAME_WORLD_INTERIOR_V18=Object.freeze({version:'game-world-interior-v18',architecture:'room-graph-furnishing-egress-lighting-nav',deterministic:true,productionInteriorRendererVerified:false});

const KITS=Object.freeze({living:['sofa','table','shelf','lamp'],kitchen:['counter','sink','stove','fridge'],bedroom:['bed','wardrobe','desk','lamp'],bath:['sink','toilet','shower'],office:['desk','chair','storage','display'],meeting:['table','chair','display'],retail:['shelf','counter','display','bench'],lobby:['desk','bench','plant'],service:['cabinet','utility-rack'],parking:['bollard','sign'],storage:['rack','crate'],utility:['panel','pipe-rack'],production:['machine','workbench','rack'],chamber:['bed','chest','torch'],armory:['weapon-rack','crate','torch'],'great-hall':['table','bench','banner','torch'],guard:['bench','rack','torch'],'royal':['bed','throne','chest','banner'],gallery:['display','bench','torch'],cell:['bed','bucket','torch'],corridor:['light']});

export function buildInteriorGraphV18(architecture={}){
  const nodes=[],edges=[];for(const plan of architecture.floorPlans.plans){nodes.push({id:plan.corridor.id,type:'corridor',floor:plan.floor});for(const room of plan.rooms){nodes.push({id:room.id,type:'room',floor:plan.floor,use:room.use});edges.push({from:room.id,to:plan.corridor.id,kind:'door'});}for(const stair of plan.stairs){nodes.push({id:stair.id,type:'stair',floor:plan.floor});edges.push({from:plan.corridor.id,to:stair.id,kind:'circulation'});const next=architecture.floorPlans.plans.find(p=>p.floor===plan.floor+1);if(next)edges.push({from:stair.id,to:next.corridor.id,kind:'vertical'});}for(const exit of plan.exits){nodes.push({id:exit.id,type:'exit',floor:plan.floor});edges.push({from:plan.corridor.id,to:exit.id,kind:'egress'});}}
  return{nodes,edges,roomGraph:true};
}

export function furnishInteriorV18(architecture={},input={}){
  const maxPerRoom=Math.round(clamp(input.maxPerRoom||6,1,16)),items=[];
  for(const plan of architecture.floorPlans.plans)for(const room of plan.rooms){const kit=KITS[room.use]||['table','chair','light'];const count=Math.min(maxPerRoom,kit.length+1);for(let i=0;i<count;i++){const kind=kit[i%kit.length],rx=(rnd(`${architecture.envelope.seed}:${room.id}:x:${i}`)-.5)*room.width*.72,rz=(rnd(`${architecture.envelope.seed}:${room.id}:z:${i}`)-.5)*room.depth*.72;items.push({id:`furn_${room.id}_${i}`,roomId:room.id,floor:plan.floor,kind,x:+(room.x+rx).toFixed(2),y:+(plan.elevation).toFixed(2),z:+(room.z+rz).toFixed(2),collision:!['lamp','banner','display'].includes(kind),interactive:['door','chest','cabinet','display'].includes(kind)});}}
  return{items,count:items.length,deterministicPlacement:true};
}

export function createInteriorLightingV18(architecture={},furnishing={}){
  const lights=[];for(const plan of architecture.floorPlans.plans){lights.push({id:`light_corridor_${plan.floor}`,floor:plan.floor,zone:plan.corridor.id,type:'area',intensity:650});for(const room of plan.rooms){const warm=['bedroom','living','great-hall','royal'].includes(room.use);lights.push({id:`light_${room.id}`,floor:plan.floor,zone:room.id,type:'point',intensity:warm?420:560,temperatureK:warm?3100:4200});}}
  return{lights,lightCount:lights.length,roomAware:true,reducedMobileShadowBudget:true};
}

function adjacency(graph){const m=new Map();for(const n of graph.nodes)m.set(n.id,[]);for(const e of graph.edges){m.get(e.from)?.push(e.to);m.get(e.to)?.push(e.from);}return m;}
export function validateInteriorEgressV18(graph={}){
  const adj=adjacency(graph),exits=new Set((graph.nodes||[]).filter(n=>n.type==='exit').map(n=>n.id)),unreachable=[];
  for(const room of (graph.nodes||[]).filter(n=>n.type==='room')){const q=[room.id],seen=new Set(q);let ok=false;while(q.length&&seen.size<512){const cur=q.shift();if(exits.has(cur)){ok=true;break;}for(const next of adj.get(cur)||[])if(!seen.has(next)){seen.add(next);q.push(next);}}if(!ok)unreachable.push(room.id);}
  return{valid:unreachable.length===0,unreachable,exitCount:exits.size,checkedRooms:(graph.nodes||[]).filter(n=>n.type==='room').length};
}

export function buildInteriorNavV18(architecture={},graph={}){const nodes=[];for(const plan of architecture.floorPlans.plans){nodes.push({id:`nav_${plan.corridor.id}`,floor:plan.floor,x:plan.corridor.x,y:plan.elevation,z:plan.corridor.z,radius:plan.corridor.width/2});for(const room of plan.rooms)nodes.push({id:`nav_${room.id}`,floor:plan.floor,x:room.x,y:plan.elevation,z:room.z,radius:Math.min(room.width,room.depth)*.25});for(const stair of plan.stairs)nodes.push({id:`nav_${stair.id}`,floor:plan.floor,x:stair.x,y:plan.elevation,z:stair.z,radius:stair.width/2});}return{nodes,portals:graph.edges.filter(e=>['door','vertical','egress'].includes(e.kind)),navGraphReady:true,doorClearanceMeters:.9};}

export function compileInteriorV18(input={}){const v17=compileArchitectureV17(input.v17||input);const graph=buildInteriorGraphV18(v17),furnishing=furnishInteriorV18(v17,input.furnishing||{}),lighting=createInteriorLightingV18(v17,furnishing),egress=validateInteriorEgressV18(graph),nav=buildInteriorNavV18(v17,graph);const internal100=v17.readiness.internal100&&graph.roomGraph&&furnishing.count>0&&lighting.lightCount>0&&egress.valid&&nav.navGraphReady;return{version:GAME_WORLD_INTERIOR_V18.version,v17,graph,furnishing,lighting,egress,nav,readiness:{internal100,production100:false},truth:{roomGraphExecutable:true,furnishingExecutable:true,lightingPlanExecutable:true,egressValidationExecutable:true,interiorNavExecutable:true,realInteriorRendererVerified:false,realAccessibilityComplianceVerified:false,productionDeploymentVerified:false}};}
