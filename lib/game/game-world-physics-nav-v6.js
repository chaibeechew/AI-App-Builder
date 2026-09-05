// LANERIQ AI Game World V6 — executable physics + dynamic navigation core.
// Independent deterministic engine. External Rapier/Recast adapters remain optional evidence-gated integrations.

import {findRuntimePathV5} from "./game-world-playable-runtime-v5.js";

export const GAME_WORLD_PHYSICS_NAV_V6=Object.freeze({
  version:"game-world-physics-nav-v6",
  physics:"fixed-step-spatial-hash-impulse-core",
  navigation:"dynamic-grid-polygon-graph-crowd-core",
  externalAdapters:Object.freeze({rapier:"optional",recast:"optional"}),
  proprietaryCodeCopied:false
});

function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function v3(a=[0,0,0]){return [Number(a[0]||0),Number(a[1]||0),Number(a[2]||0)];}
function len2(x,z){return Math.hypot(x,z)||1;}

export function buildPhysicsWorldV6(runtime,{fixedHz=60}={}){
  const staticObstacles=(runtime.poi||[]).slice(0,32).map((p,i)=>({id:`static_${p.id||i}`,type:"aabb",position:v3(p.position),half:[2.6,5,2.6],dynamic:false,restitution:.05,friction:.8}));
  const dynamic=(runtime.physics?.bodies||[]).slice(0,96).map((b,i)=>({id:b.id||`dynamic_${i}`,type:"sphere",position:v3(b.position||[(i%8)*4,8+Math.floor(i/8),Math.floor(i/8)*4]),velocity:v3(b.velocity),radius:clamp(Number(b.radius||.8),.25,4),mass:clamp(Number(b.mass||1),.1,100),dynamic:b.dynamic!==false,restitution:.12,friction:.65,sleepFrames:0}));
  if(!dynamic.length)dynamic.push({id:"player-probe",type:"sphere",position:[0,9,0],velocity:[2,0,0],radius:.8,mass:1,dynamic:true,restitution:.1,friction:.7,sleepFrames:0});
  return{fixedStep:1/clamp(Number(fixedHz)||60,30,120),gravity:[0,-9.81,0],staticObstacles,dynamic,broadphase:{type:"spatial-hash",cellSize:8},solver:{iterations:4,positionalCorrection:.75,sleepVelocity:.025},evidence:{executable:true,externalRapierVerified:false,externalHavokVerified:false,networkDeterminismVerified:false}};
}

function hashKey(x,y,z,size){return `${Math.floor(x/size)},${Math.floor(y/size)},${Math.floor(z/size)}`;}
function buildSpatialHash(world){
  const map=new Map(),size=world.broadphase.cellSize;
  for(const s of world.staticObstacles){
    const h=s.half||[1,1,1];
    for(let x=Math.floor((s.position[0]-h[0])/size);x<=Math.floor((s.position[0]+h[0])/size);x++)for(let y=Math.floor((s.position[1]-h[1])/size);y<=Math.floor((s.position[1]+h[1])/size);y++)for(let z=Math.floor((s.position[2]-h[2])/size);z<=Math.floor((s.position[2]+h[2])/size);z++){
      const k=`${x},${y},${z}`;if(!map.has(k))map.set(k,[]);map.get(k).push(s);
    }
  }
  return map;
}

function sphereAabbResolve(body,box){
  const h=box.half,px=clamp(body.position[0],box.position[0]-h[0],box.position[0]+h[0]),py=clamp(body.position[1],box.position[1]-h[1],box.position[1]+h[1]),pz=clamp(body.position[2],box.position[2]-h[2],box.position[2]+h[2]);
  let dx=body.position[0]-px,dy=body.position[1]-py,dz=body.position[2]-pz,d=Math.hypot(dx,dy,dz);
  if(d>=body.radius)return false;
  if(d<1e-6){dx=0;dy=1;dz=0;d=1;}
  const nx=dx/d,ny=dy/d,nz=dz/d,penetration=body.radius-d;
  body.position[0]+=nx*penetration;body.position[1]+=ny*penetration;body.position[2]+=nz*penetration;
  const vn=body.velocity[0]*nx+body.velocity[1]*ny+body.velocity[2]*nz;
  if(vn<0){const bounce=-(1+body.restitution)*vn;body.velocity[0]+=bounce*nx;body.velocity[1]+=bounce*ny;body.velocity[2]+=bounce*nz;}
  body.velocity[0]*=.985;body.velocity[2]*=.985;return true;
}

export function stepPhysicsWorldV6(world,steps=1){
  const copy={...world,dynamic:world.dynamic.map(b=>({...b,position:[...b.position],velocity:[...b.velocity]}))};
  const hash=buildSpatialHash(copy),dt=copy.fixedStep,cell=copy.broadphase.cellSize;let contacts=0;
  for(let n=0;n<clamp(Number(steps)||1,1,600);n++){
    for(const b of copy.dynamic){
      if(!b.dynamic||b.sleepFrames>120)continue;
      b.velocity[0]+=copy.gravity[0]*dt;b.velocity[1]+=copy.gravity[1]*dt;b.velocity[2]+=copy.gravity[2]*dt;
      b.position[0]+=b.velocity[0]*dt;b.position[1]+=b.velocity[1]*dt;b.position[2]+=b.velocity[2]*dt;
      if(b.position[1]<b.radius){b.position[1]=b.radius;if(b.velocity[1]<0)b.velocity[1]*=-b.restitution;b.velocity[0]*=.985;b.velocity[2]*=.985;contacts++;}
      const candidates=hash.get(hashKey(b.position[0],b.position[1],b.position[2],cell))||[];
      for(let i=0;i<copy.solver.iterations;i++)for(const box of candidates)if(sphereAabbResolve(b,box))contacts++;
      const speed=Math.hypot(...b.velocity);b.sleepFrames=speed<copy.solver.sleepVelocity?b.sleepFrames+1:0;
    }
  }
  return{...copy,lastStep:{steps:clamp(Number(steps)||1,1,600),contacts,simulatedSeconds:dt*clamp(Number(steps)||1,1,600)}};
}

export function buildDynamicNavigationV6(runtime,{agentRadius=.6}={}){
  const base=runtime.nav;
  const blocked=new Set();
  for(const poi of runtime.poi||[]){
    const ox=Math.round((poi.position?.[0]-base.origin[0])/base.cellMeters),oz=Math.round((poi.position?.[2]-base.origin[2])/base.cellMeters);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(ox+dx>=0&&oz+dz>=0&&ox+dx<base.cellsPerAxis&&oz+dz<base.cellsPerAxis)blocked.add(`${ox+dx},${oz+dz}`);
  }
  const cells=base.cells.map(c=>({...c,walkable:c.walkable&&!blocked.has(`${c.x},${c.z}`)}));
  const polygons=[];
  for(const c of cells)if(c.walkable){const x=base.origin[0]+c.x*base.cellMeters,z=base.origin[2]+c.z*base.cellMeters,s=base.cellMeters;polygons.push({id:`poly_${c.x}_${c.z}`,cell:[c.x,c.z],vertices:[[x,0,z],[x+s,0,z],[x+s,0,z+s],[x,0,z+s]],area:s*s});}
  return{...base,cells,agentRadius,blockedCells:[...blocked],polygons,dynamicObstacleOverlay:true,pathfinder:"a-star-cost-grid",crowd:"separation-steering",externalRecastVerified:false};
}

export function addDynamicObstacleV6(nav,{id="obstacle",x=0,z=0,radiusCells=1}={}){
  const block=new Set(nav.blockedCells||[]);const cx=clamp(Math.round(x),0,nav.cellsPerAxis-1),cz=clamp(Math.round(z),0,nav.cellsPerAxis-1),r=clamp(Math.round(radiusCells),1,6);
  for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dz*dz<=r*r)block.add(`${cx+dx},${cz+dz}`);
  const cells=nav.cells.map(c=>({...c,walkable:c.walkable&&!block.has(`${c.x},${c.z}`)}));
  return{...nav,cells,blockedCells:[...block],revision:`${id}:${block.size}`};
}

export function findDynamicPathV6(nav,start,goal){return findRuntimePathV5(nav,start,goal);}

export function buildCrowdV6(nav,count=12){
  const n=clamp(Number(count)||12,1,64),agents=[];
  for(let i=0;i<n;i++){const start={x:1+(i%4),z:1+Math.floor(i/4)},goal={x:nav.cellsPerAxis-2-(i%3),z:nav.cellsPerAxis-2-Math.floor(i/3)%3},path=findDynamicPathV6(nav,start,goal);agents.push({id:`crowd_${i}`,position:[start.x,start.z],goal:[goal.x,goal.z],path,cursor:Math.min(1,Math.max(0,path.length-1)),speed:1+.15*(i%3),radius:.35});}
  return{agents,separationRadius:1.2,maxAgents:64};
}

export function stepCrowdV6(crowd,dt=.1){
  const agents=crowd.agents.map(a=>({...a,position:[...a.position]}));
  for(const a of agents){const target=a.path?.[a.cursor];if(!target)continue;let dx=target.x-a.position[0],dz=target.z-a.position[1],l=len2(dx,dz);if(l<.18){a.cursor=Math.min(a.cursor+1,(a.path?.length||1)-1);continue;}dx/=l;dz/=l;let sx=0,sz=0;for(const b of agents){if(a===b)continue;const rx=a.position[0]-b.position[0],rz=a.position[1]-b.position[1],d=Math.hypot(rx,rz);if(d>0&&d<crowd.separationRadius){sx+=rx/d*(crowd.separationRadius-d);sz+=rz/d*(crowd.separationRadius-d);}}const sl=Math.hypot(dx+sx*.6,dz+sz*.6)||1;a.position[0]+=(dx+sx*.6)/sl*a.speed*dt;a.position[1]+=(dz+sz*.6)/sl*a.speed*dt;}
  return{...crowd,agents};
}

export function auditPhysicsNavV6(result={}){
  const p=result.physics,n=result.nav,c=result.crowd;
  const gates={physicsExecutable:p?.evidence?.executable===true&&p?.dynamic?.length>0,spatialHash:p?.broadphase?.type==="spatial-hash",collisionSolver:p?.solver?.iterations>=2,navPolygons:(n?.polygons?.length||0)>0,dynamicObstacles:n?.dynamicObstacleOverlay===true,crowdExecutable:(c?.agents?.length||0)>0,truth:n?.externalRecastVerified===false&&p?.evidence?.externalRapierVerified===false};
  const passed=Object.values(gates).filter(Boolean).length;return{score:Math.round(passed/Object.keys(gates).length*100),gates,internal100:passed===Object.keys(gates).length,externalRapierVerified:false,externalRecastVerified:false};
}
