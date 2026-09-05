// LANERIQ AI Game World V15 — terrain-derived hydrology, biome blending and bounded ecology.
import {compileTerrainV14} from './game-world-terrain-v14.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));
const idx=(x,z,r)=>z*r+x;
const neighbors=(x,z,r)=>{const out=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(nx>=0&&nz>=0&&nx<r&&nz<r)out.push([nx,nz]);}return out;};

export const GAME_WORLD_HYDROLOGY_ECOLOGY_V15=Object.freeze({version:'game-world-hydrology-ecology-v15',architecture:'terrain-derived-flow-accumulation-and-biome-ecology',deterministic:true,waterTruthSource:'terrain-flow-field',productionRendererVerified:false});

export function buildHydrologyV15(field={},input={}){
  const r=field.resolution,n=r*r,downstream=new Int32Array(n).fill(-1),accumulation=new Float64Array(n).fill(1),waterDepth=new Float32Array(n);
  const order=Array.from({length:n},(_,i)=>i).sort((a,b)=>field.heights[b]-field.heights[a]);
  for(let z=0;z<r;z++)for(let x=0;x<r;x++){
    const i=idx(x,z,r);let best=-1,bestH=field.heights[i];
    for(const[nx,nz]of neighbors(x,z,r)){const j=idx(nx,nz,r),h=field.heights[j];if(h<bestH-.001){bestH=h;best=j;}}
    downstream[i]=best;
  }
  for(const i of order){const d=downstream[i];if(d>=0)accumulation[d]+=accumulation[i];}
  const threshold=clamp(input.riverAccumulationThreshold||Math.max(12,Math.floor(n*.018)),4,n),rivers=[],lakes=[];
  const used=new Set();
  for(let i=0;i<n;i++){
    if(downstream[i]<0&&accumulation[i]>4){const x=i%r,z=Math.floor(i/r);lakes.push({id:`lake_${lakes.length+1}`,cell:i,x,z,elevation:field.heights[i],catchment:+accumulation[i].toFixed(2),radiusMeters:+clamp(Math.sqrt(accumulation[i])*field.cellMeters*.12,field.cellMeters*.3,field.cellMeters*3).toFixed(2)});waterDepth[i]=clamp(accumulation[i]/threshold,0,4);}
    if(accumulation[i]>=threshold&&downstream[i]>=0&&!used.has(i)){
      const path=[];let cur=i,guard=0;
      while(cur>=0&&guard++<r*3){used.add(cur);const x=cur%r,z=Math.floor(cur/r);path.push({cell:cur,x,z,elevation:field.heights[cur],flow:+accumulation[cur].toFixed(2)});waterDepth[cur]=clamp(accumulation[cur]/threshold*.35,.05,3);const next=downstream[cur];if(next<0||next===cur)break;cur=next;}
      if(path.length>=3)rivers.push({id:`river_${rivers.length+1}`,path,order:Math.max(1,Math.round(Math.log2(path.at(-1).flow/threshold+1))),widthMeters:+clamp(Math.sqrt(path.at(-1).flow/threshold)*field.cellMeters*.18,1.5,80).toFixed(2)});
    }
  }
  return{downstream:Array.from(downstream),accumulation:Array.from(accumulation,v=>+v.toFixed(2)),waterDepth:Array.from(waterDepth,v=>+v.toFixed(3)),rivers:rivers.slice(0,64),lakes:lakes.slice(0,32),riverThreshold:threshold,terrainDerived:true};
}

function nearestWaterDistanceCells(i,hydro,r){const x=i%r,z=Math.floor(i/r);let best=Infinity;for(const river of hydro.rivers.slice(0,24))for(const p of river.path.filter((_,k)=>k%Math.max(1,Math.floor(river.path.length/12))===0)){best=Math.min(best,Math.hypot(x-p.x,z-p.z));}for(const lake of hydro.lakes)best=Math.min(best,Math.hypot(x-lake.x,z-lake.z));return Number.isFinite(best)?best:r;}

export function buildBiomeEcologyV15(field={},hydro={},input={}){
  const r=field.resolution,cells=[];const snowLine=clamp(input.snowLineMeters??field.reliefMeters*.42,10,4000);
  for(let i=0;i<field.heights.length;i++){
    const h=field.heights[i],slope=field.slopes[i],baseMoist=field.moisture[i],waterDistance=nearestWaterDistanceCells(i,hydro,r),riparian=clamp(1-waterDistance/5,0,1),moisture=clamp(baseMoist+riparian*.35,0,1);
    let weights={grassland:0,forest:0,wetland:0,alpine:0,rock:0,shore:0};
    weights.rock=clamp((slope-32)/35,0,1);weights.alpine=clamp((h-snowLine)/Math.max(20,field.reliefMeters*.25),0,1);weights.wetland=clamp(riparian*.8+moisture*.25-(slope/90),0,1);weights.forest=clamp(moisture*.9*(1-weights.alpine)*(1-weights.rock),0,1);weights.shore=clamp(riparian*(1-weights.rock),0,1);weights.grassland=clamp(1-Math.max(weights.forest,weights.wetland,weights.alpine,weights.rock),0,1);
    const total=Object.values(weights).reduce((a,b)=>a+b,0)||1;weights=Object.fromEntries(Object.entries(weights).map(([k,v])=>[k,+((v/total)).toFixed(3)]));
    const dominant=Object.entries(weights).sort((a,b)=>b[1]-a[1])[0][0];cells.push({cell:i,height:h,slope,moisture:+moisture.toFixed(3),waterDistanceCells:+waterDistance.toFixed(2),dominant,weights});
  }
  return{cells,snowLineMeters:snowLine,biomeBlend:true,ecologyRules:{waterRaisesMoisture:true,slopeSuppressesVegetation:true,elevationDrivesAlpine:true,transitionWeightsNormalized:true}};
}

export function compileHydrologyEcologyV15(input={}){const v14=compileTerrainV14(input.terrain||input);const hydrology=buildHydrologyV15(v14.field,input.hydrology||{});const ecology=buildBiomeEcologyV15(v14.field,hydrology,input.ecology||{});const sumOk=ecology.cells.slice(0,64).every(c=>Math.abs(Object.values(c.weights).reduce((a,b)=>a+b,0)-1)<.01);const internal100=v14.readiness.internal100&&hydrology.terrainDerived&&ecology.biomeBlend&&sumOk;return{version:GAME_WORLD_HYDROLOGY_ECOLOGY_V15.version,v14,hydrology,ecology,readiness:{internal100,production100:false},truth:{flowAccumulationExecutable:true,riverNetworkExecutable:true,lakeCatchmentExecutable:true,biomeBlendExecutable:true,realWaterRendererVerified:false,realEcologyLongRunVerified:false,productionDeploymentVerified:false}};}
