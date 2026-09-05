import assert from 'node:assert/strict';
import {createWorldPartitionV22,selectResidentCellsV22,buildMassiveRuntimeV22,stepAdaptiveBudgetV22} from '../lib/game/game-world-massive-runtime-v22.js';
const p=createWorldPartitionV22({sizeMeters:12000,cellMeters:256});const r=selectResidentCellsV22(p,{camera:[0,0],radiusCells:3,maxResident:28});assert.ok(p.cells.length>1000);assert.ok(r.length>0&&r.length<=28);
const world=buildMassiveRuntimeV22({seed:'massive-v22',worldSizeMeters:12000,deviceClass:'mobile-balanced',city:{sizeMeters:720,blockMeters:120,maxBuildings:48}});assert.equal(world.readiness.internal100,true);assert.equal(world.truth.hardwareSoakVerified,false);assert.equal(stepAdaptiveBudgetV22(world,{fps:20,memoryPressure:.9}).adaptive.action,'degrade');
console.log('Game World Massive Runtime V22: PASS',JSON.stringify({cells:p.cells.length,resident:r.length,targetFps:world.adaptive.targetFps,assetMB:world.streaming.assetBudgetMB}));
