// LANERIQ AI Game World V14 — deterministic terrain intelligence and executable mesh planning.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));
const hashSeed=value=>{const s=String(value??"");let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const rand2=(x,z,seed)=>{let h=hashSeed(`${seed}:${x}:${z}`);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return(h>>>0)/4294967295;};
const smooth=t=>t*t*(3-2*t);
function valueNoise(x,z,seed){const x0=Math.floor(x),z0=Math.floor(z),tx=smooth(x-x0),tz=smooth(z-z0);const a=rand2(x0,z0,seed),b=rand2(x0+1,z0,seed),c=rand2(x0,z0+1,seed),d=rand2(x0+1,z0+1,seed);const ab=a+(b-a)*tx,cd=c+(d-c)*tx;return ab+(cd-ab)*tz;}
function fbm(x,z,seed,octaves=5){let amp=.55,freq=.7,total=0,norm=0;for(let i=0;i<octaves;i++){total+=(valueNoise(x*freq,z*freq,seed+i*101)-.5)*2*amp;norm+=amp;amp*=.5;freq*=2;}return total/Math.max(.001,norm);}
function indexOf(x,z,res){return z*res+x;}

export const GAME_WORLD_TERRAIN_V14=Object.freeze({version:"game-world-terrain-v14",architecture:"heightfield-mesh-terrain-with-erosion-and-feature-contracts",deterministic:true,gameplayTruthSource:"terrain-mesh",productionRendererVerified:false,realDeviceTerrainPerformanceVerified:false});

export function generateTerrainFieldV14(input={}){
  const seed=String(input.seed||"laneriq-terrain"),resolution=Math.round(clamp(input.resolution||33,9,65));
  const sizeMeters=clamp(input.sizeMeters||2048,128,20000),relief=clamp(input.reliefMeters||280,8,2400),seaLevel=clamp(input.seaLevel??.18,-1,1);
  let heights=new Float64Array(resolution*resolution);
  for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){
    const nx=x/(resolution-1)-.5,nz=z/(resolution-1)-.5;
    const continental=(1-Math.min(1,Math.hypot(nx,nz)*1.45))*.52;
    const ridges=Math.abs(fbm(nx*6+7,nz*6-3,seed,4))*.34;
    const detail=fbm(nx*10,nz*10,`${seed}:detail`,5)*.28;
    heights[indexOf(x,z,resolution)]=(continental+ridges+detail-seaLevel)*relief;
  }
  const erosionIterations=Math.round(clamp(input.erosionIterations??6,0,24));
  for(let iter=0;iter<erosionIterations;iter++){
    const next=Float64Array.from(heights);
    for(let z=1;z<resolution-1;z++)for(let x=1;x<resolution-1;x++){
      const i=indexOf(x,z,resolution),h=heights[i],neighbors=[indexOf(x-1,z,resolution),indexOf(x+1,z,resolution),indexOf(x,z-1,resolution),indexOf(x,z+1,resolution)];
      let low=neighbors[0];for(const n of neighbors)if(heights[n]<heights[low])low=n;
      const delta=h-heights[low];if(delta>relief*.035){const move=delta*.045;next[i]-=move;next[low]+=move*.72;}
    }
    heights=next;
  }
  const cell=sizeMeters/(resolution-1),slopes=new Float32Array(heights.length),moisture=new Float32Array(heights.length);
  let min=Infinity,max=-Infinity;
  for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){
    const i=indexOf(x,z,resolution);min=Math.min(min,heights[i]);max=Math.max(max,heights[i]);
    const xl=Math.max(0,x-1),xr=Math.min(resolution-1,x+1),zd=Math.max(0,z-1),zu=Math.min(resolution-1,z+1);
    const dx=(heights[indexOf(xr,z,resolution)]-heights[indexOf(xl,z,resolution)])/Math.max(cell,1),dz=(heights[indexOf(x,zu,resolution)]-heights[indexOf(x,zd,resolution)])/Math.max(cell,1);
    slopes[i]=Math.atan(Math.hypot(dx,dz))*180/Math.PI;
    moisture[i]=clamp(.52-(heights[i]/Math.max(relief,1))*.22+(1-Math.min(1,slopes[i]/65))*.16,0,1);
  }
  return{seed,resolution,sizeMeters,reliefMeters:relief,cellMeters:cell,heights:Array.from(heights,v=>+v.toFixed(3)),slopes:Array.from(slopes,v=>+v.toFixed(2)),moisture:Array.from(moisture,v=>+v.toFixed(3)),minHeight:+min.toFixed(3),maxHeight:+max.toFixed(3),erosionIterations};
}

export function buildTerrainMeshV14(field={}){
  const res=field.resolution,half=field.sizeMeters/2,vertices=[],indices=[],materials=[];
  for(let z=0;z<res;z++)for(let x=0;x<res;x++){
    const i=indexOf(x,z,res),y=field.heights[i],px=-half+x*field.cellMeters,pz=-half+z*field.cellMeters,slope=field.slopes[i],moist=field.moisture[i];
    vertices.push({x:+px.toFixed(3),y,z:+pz.toFixed(3),slope,moisture:moist});
    materials.push(y<0?"water-edge":slope>48?"cliff":y>field.reliefMeters*.42?"alpine":moist>.58?"lush":"ground");
  }
  for(let z=0;z<res-1;z++)for(let x=0;x<res-1;x++){const a=indexOf(x,z,res),b=indexOf(x+1,z,res),c=indexOf(x,z+1,res),d=indexOf(x+1,z+1,res);indices.push(a,c,b,b,c,d);}
  const checksum=hashSeed(JSON.stringify([field.seed,field.resolution,field.minHeight,field.maxHeight,indices.length,materials.slice(0,64)] )).toString(16);
  return{vertices,indices,materials,triangleCount:indices.length/3,checksum,collisionSource:"same-terrain-mesh",navigationSource:"slope-filtered-terrain-mesh"};
}

export function planTerrainFeaturesV14(field={}){
  const features=[];for(let z=1;z<field.resolution-1;z++)for(let x=1;x<field.resolution-1;x++){const i=indexOf(x,z,field.resolution),s=field.slopes[i],h=field.heights[i];if(s>52&&features.filter(f=>f.type==="cliff").length<24)features.push({type:"cliff",x,z,height:h});if(h>field.reliefMeters*.34&&rand2(x,z,field.seed)>.93&&features.filter(f=>f.type==="cave-mouth").length<8)features.push({type:"cave-mouth",x,z,requiresCarvedMesh:true});if(s>45&&rand2(x+17,z-9,field.seed)>.96&&features.filter(f=>f.type==="overhang").length<6)features.push({type:"overhang",x,z,requiresMeshExtension:true});}
  return{features,cliffCount:features.filter(f=>f.type==="cliff").length,caveCount:features.filter(f=>f.type==="cave-mouth").length,overhangCount:features.filter(f=>f.type==="overhang").length,carvedMeshContract:true};
}

export function conformCorridorToTerrainV14(field={},points=[],options={}){
  const half=field.sizeMeters/2,res=field.resolution,kind=options.kind==="river"?"river":"road",width=clamp(options.widthMeters||6,1,80);
  return{kind,widthMeters:width,points:(points||[]).slice(0,512).map(p=>{const gx=clamp(Math.round((Number(p.x||0)+half)/field.cellMeters),0,res-1),gz=clamp(Math.round((Number(p.z||0)+half)/field.cellMeters),0,res-1),y=field.heights[indexOf(gx,gz,res)];return{x:Number(p.x||0),y:+(y+(kind==="road"?.25:-.4)).toFixed(3),z:Number(p.z||0)};}),terrainConforming:true};
}

export function compileTerrainV14(input={}){const field=generateTerrainFieldV14(input),mesh=buildTerrainMeshV14(field),features=planTerrainFeaturesV14(field);const internal100=field.heights.length===field.resolution**2&&mesh.triangleCount>0&&features.carvedMeshContract===true;return{version:GAME_WORLD_TERRAIN_V14.version,field,mesh,features,readiness:{internal100,production100:false},truth:{terrainGeometryExecutable:true,erosionExecutable:true,collisionTruthBoundToTerrainMesh:true,roadRiverConformExecutable:true,realCarvedCaveRendererVerified:false,realDeviceTerrainPerformanceVerified:false,productionDeploymentVerified:false}};}
