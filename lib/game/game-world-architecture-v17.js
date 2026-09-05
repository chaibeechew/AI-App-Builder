// LANERIQ AI Game World V17 — procedural architecture with playable structural truth.
import {compileVegetationV16} from './game-world-vegetation-v16.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));
const clean=v=>String(v??'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80)||'building';
const hash=value=>{const s=String(value??'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const rnd=key=>hash(key)/4294967295;

export const GAME_WORLD_ARCHITECTURE_V17=Object.freeze({version:'game-world-architecture-v17',architecture:'footprint-floorplan-structure-facade-playable-building',deterministic:true,gameplayTruthSource:'architectural-mesh-and-room-graph',productionMeshRendererVerified:false});

const BUILDING_TYPES=Object.freeze({
  residential:{floorHeight:3.1,roomDepth:4.2,corridor:1.8,windowSpacing:2.6,roof:'pitched'},
  commercial:{floorHeight:3.8,roomDepth:5.8,corridor:2.4,windowSpacing:3.2,roof:'flat'},
  tower:{floorHeight:3.5,roomDepth:5,corridor:2.2,windowSpacing:2.8,roof:'flat'},
  castle:{floorHeight:4.2,roomDepth:6.5,corridor:2.8,windowSpacing:4.6,roof:'battlement'},
  factory:{floorHeight:5.5,roomDepth:9,corridor:3,windowSpacing:5.5,roof:'sawtooth'},
  dungeon:{floorHeight:3.6,roomDepth:5.5,corridor:2.4,windowSpacing:99,roof:'vault'}
});

export function createBuildingEnvelopeV17(input={}){
  const id=clean(input.id||'building'),type=BUILDING_TYPES[input.type]?input.type:'residential',spec=BUILDING_TYPES[type];
  const width=clamp(input.widthMeters||24,6,180),depth=clamp(input.depthMeters||18,6,180),floors=Math.round(clamp(input.floors||3,1,60)),basements=Math.round(clamp(input.basements||0,0,6));
  const shape=['rectangle','l-shape','courtyard'].includes(input.shape)?input.shape:(type==='castle'?'courtyard':'rectangle');
  const footprint=shape==='rectangle'?[{x:-width/2,z:-depth/2},{x:width/2,z:-depth/2},{x:width/2,z:depth/2},{x:-width/2,z:depth/2}]:shape==='l-shape'?[{x:-width/2,z:-depth/2},{x:width/2,z:-depth/2},{x:width/2,z:0},{x:0,z:0},{x:0,z:depth/2},{x:-width/2,z:depth/2}]:[{x:-width/2,z:-depth/2},{x:width/2,z:-depth/2},{x:width/2,z:depth/2},{x:-width/2,z:depth/2}];
  return{id,type,style:clean(input.style||'adaptive'),shape,widthMeters:width,depthMeters:depth,floors,basements,floorHeight:spec.floorHeight,totalHeight:+(floors*spec.floorHeight).toFixed(2),footprint,roof:spec.roof,seed:String(input.seed||id)};
}

export function createStructuralGridV17(envelope={}){
  const span=clamp(envelope.type==='factory'?8:envelope.type==='castle'?6:5.5,4,10),colsX=Math.max(2,Math.ceil(envelope.widthMeters/span)+1),colsZ=Math.max(2,Math.ceil(envelope.depthMeters/span)+1),columns=[];
  for(let z=0;z<colsZ;z++)for(let x=0;x<colsX;x++)columns.push({id:`col_${x}_${z}`,x:+(-envelope.widthMeters/2+x*envelope.widthMeters/(colsX-1)).toFixed(2),z:+(-envelope.depthMeters/2+z*envelope.depthMeters/(colsZ-1)).toFixed(2),fromFloor:-envelope.basements,toFloor:envelope.floors});
  return{spanMeters:span,columns,beamsPerFloor:(colsX-1)*colsZ+(colsZ-1)*colsX,loadBearing:true};
}

function floorUses(type,floor,total){if(type==='commercial')return floor===0?['retail','lobby','service']:floor===total-1?['office','mechanical']:['office','meeting','service'];if(type==='castle')return floor===0?['great-hall','guard','service']:floor===total-1?['royal','tower-access']:['chamber','gallery','armory'];if(type==='factory')return ['production','storage','service'];if(type==='tower')return floor===0?['lobby','retail']:['office','service'];if(type==='dungeon')return ['cell','chamber','corridor'];return floor===0?['living','kitchen','service']:['bedroom','bath','study'];}

export function generateFloorPlansV17(envelope={},input={}){
  const spec=BUILDING_TYPES[envelope.type]||BUILDING_TYPES.residential,plans=[];
  const allFloors=[];for(let f=-envelope.basements;f<envelope.floors;f++)allFloors.push(f);
  for(const floor of allFloors){const above=floor>=0,uses=above?floorUses(envelope.type,floor,envelope.floors):['parking','storage','utility'],roomCount=Math.round(clamp(input.roomsPerFloor||Math.floor((envelope.widthMeters*envelope.depthMeters)/(spec.roomDepth*spec.roomDepth*2.2)),2,24));const corridor={id:`corridor_${floor}`,floor,x:0,z:0,width:spec.corridor,length:envelope.depthMeters-2};const rooms=[];
    for(let i=0;i<roomCount;i++){const side=i%2===0?-1:1,row=Math.floor(i/2),rows=Math.ceil(roomCount/2),z=-envelope.depthMeters/2+(row+.5)*(envelope.depthMeters/rows),roomWidth=Math.max(2.4,envelope.widthMeters/2-spec.corridor/2-1),roomDepth=Math.max(2.4,envelope.depthMeters/rows-.5);rooms.push({id:`room_${floor}_${i+1}`,floor,use:uses[i%uses.length],x:+(side*(spec.corridor/2+roomWidth/2)).toFixed(2),z:+z.toFixed(2),width:+roomWidth.toFixed(2),depth:+roomDepth.toFixed(2),adjacent:[corridor.id]});}
    const stairs=[{id:`stair_${floor}`,floor,x:0,z:+(-envelope.depthMeters*.34).toFixed(2),width:1.6,connects:[floor,floor+1]}];const exits=floor===0?[{id:'exit_main',floor:0,x:0,z:-envelope.depthMeters/2,kind:'exterior'}]:[];plans.push({floor,elevation:+(floor*envelope.floorHeight).toFixed(2),corridor,rooms,stairs,exits});
  }
  return{plans,roomCount:plans.reduce((n,p)=>n+p.rooms.length,0),verticalCirculation:true,roomGraphReady:true};
}

export function buildArchitecturalSurfacesV17(envelope={},floorPlans={}){
  const walls=[],doors=[],windows=[],floorSlabs=[],roofs=[],facades=[];const h=envelope.floorHeight;
  for(const plan of floorPlans.plans){floorSlabs.push({id:`slab_${plan.floor}`,floor:plan.floor,y:plan.elevation,width:envelope.widthMeters,depth:envelope.depthMeters,thickness:.22});for(const room of plan.rooms){doors.push({id:`door_${room.id}`,floor:plan.floor,roomId:room.id,x:+(Math.sign(room.x)*(Math.abs(room.x)-room.width/2)).toFixed(2),y:+(plan.elevation+1.05).toFixed(2),z:room.z,width:1,height:2.1});walls.push({id:`wall_${room.id}`,floor:plan.floor,roomId:room.id,bounds:{x:room.x,z:room.z,width:room.width,depth:room.depth,height:h},collision:true});}
    if(plan.floor>=0&&envelope.type!=='dungeon'){const spacing=BUILDING_TYPES[envelope.type].windowSpacing,count=Math.max(1,Math.floor(envelope.widthMeters/spacing));for(let i=0;i<count;i++)windows.push({id:`window_${plan.floor}_front_${i}`,floor:plan.floor,side:'front',x:+(-envelope.widthMeters/2+(i+.5)*envelope.widthMeters/count).toFixed(2),y:+(plan.elevation+h*.55).toFixed(2),z:-envelope.depthMeters/2,width:Math.min(2,spacing*.55),height:h*.45});}
  }
  roofs.push({id:'roof_main',type:envelope.roof,y:envelope.totalHeight,width:envelope.widthMeters,depth:envelope.depthMeters,walkable:['flat','battlement'].includes(envelope.roof)});facades.push({id:'facade_main',style:envelope.style,materialPalette:envelope.type==='castle'?['stone','aged-metal','wood']:envelope.type==='commercial'?['glass','metal','concrete']:['plaster','wood','stone'],proceduralOpenings:true});
  return{walls,doors,windows,floorSlabs,roofs,facades,collisionReady:true,navPortalDoors:true};
}

export function buildBuildingDestructionGraphV17(surfaces={}){const nodes=(surfaces.walls||[]).slice(0,512).map((w,i)=>({id:w.id,health:100,supports:i%4===0?['slab-above']:[],destructible:true}));return{nodes,propagation:'support-aware-bounded',maxCascadeNodes:32,persistentDamageKeys:true};}

export function compileArchitectureV17(input={}){const v16=compileVegetationV16(input.v16||{v15:{terrain:{seed:input.seed||'architecture-context',resolution:17,sizeMeters:800,reliefMeters:120}},vegetation:{density:.3,maxInstances:600}});const envelope=createBuildingEnvelopeV17(input.building||input),structure=createStructuralGridV17(envelope),floorPlans=generateFloorPlansV17(envelope,input.floorPlan||{}),surfaces=buildArchitecturalSurfacesV17(envelope,floorPlans),destruction=buildBuildingDestructionGraphV17(surfaces);const internal100=envelope.footprint.length>=4&&structure.columns.length>=4&&floorPlans.roomCount>0&&surfaces.doors.length>0&&surfaces.collisionReady&&destruction.nodes.length>0;return{version:GAME_WORLD_ARCHITECTURE_V17.version,v16,envelope,structure,floorPlans,surfaces,destruction,readiness:{internal100,production100:false},truth:{buildingEnvelopeExecutable:true,structuralGridExecutable:true,floorPlanExecutable:true,doorsWindowsStairsExecutable:true,collisionNavContractsExecutable:true,destructionGraphExecutable:true,realArchitecturalMeshRendererVerified:false,realBuildingCodeComplianceVerified:false,productionDeploymentVerified:false}};}
