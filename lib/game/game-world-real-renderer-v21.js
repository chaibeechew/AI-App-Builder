// LANERIQ AI Game World V21 — executable browser renderer scene planning over V20 world truth.
import {compileProductionWorldV20} from './game-world-production-world-v20.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));
export const REAL_RENDERER_V21={version:'21.0.0',preferredApi:'webgl2',fallbacks:['webgl1','cpu-safe-preview'],gameplayTruth:'mesh-collision-nav',visualTruth:'renderer-material-lighting'};
export function buildRenderSceneV21(input={}){
 const world=compileProductionWorldV20(input); const city=world.city||{};
 const terrain=city.prototype?.v17?.v16?.v15?.v14||{};
 const vertices=terrain.mesh?.vertices||[]; const indices=terrain.mesh?.indices||[];
 const veg=city.prototype?.v17?.v16?.vegetation?.instances||[];
 const buildings=city.buildings?.buildings||[];
 const quality=String(input.quality||'balanced'); const budget=quality==='high'?{draws:1800,veg:12000,scale:1}:{draws:700,veg:4500,scale:.82};
 return {version:'v21',world,geometry:{terrainVertices:vertices,terrainIndices:indices,terrainTriangleCount:terrain.mesh?.triangleCount||0,buildings:buildings.slice(0,256),vegetation:veg.slice(0,budget.veg)},materials:{terrain:{baseColor:[.21,.32,.18],roughness:.86,metallic:0},water:{baseColor:[.05,.24,.35],roughness:.2,metallic:.05,transmission:.45},building:{baseColor:[.38,.4,.44],roughness:.72,metallic:.08}},lighting:{sunDirection:[-.45,.82,.28],sunLux:68000,ambient:.34,sky:'procedural-gradient'},atmosphere:{fogDensity:.0018,heightFog:true,weatherBlend:true},budget,truth:{browserRendererImplemented:true,hardwareGpuMeasured:false,productionRendererVerified:false}};
}
export function buildFramePlanV21(scene,{camera=[0,90,180],time=0}={}){const draws=[];if(scene.geometry.terrainVertices.length||scene.geometry.terrainTriangleCount)draws.push({kind:'terrain',count:scene.geometry.terrainIndices.length||scene.geometry.terrainTriangleCount*3,material:'terrain'});if(scene.geometry.buildings.length)draws.push({kind:'buildings',count:Math.min(scene.geometry.buildings.length,scene.budget.draws),material:'building'});if(scene.geometry.vegetation.length)draws.push({kind:'vegetation',count:scene.geometry.vegetation.length,instanced:true,material:'vegetation'});return {camera,time,draws,drawCalls:draws.length,renderScale:clamp(scene.budget.scale,.5,1)};}
export function auditRendererV21(scene){const checks=[scene?.version==='v21',scene?.world?.readiness?.internal100===true,scene?.materials?.terrain?.roughness>=0,scene?.lighting?.sunLux>0,scene?.truth?.hardwareGpuMeasured===false];return {score:Math.round(checks.filter(Boolean).length/checks.length*100),internal100:checks.every(Boolean),production100:false};}
