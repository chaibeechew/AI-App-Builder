import assert from 'node:assert/strict';
import {compileVegetationV16} from '../lib/game/game-world-vegetation-v16.js';
const a=compileVegetationV16({v15:{terrain:{seed:'veg-evidence',resolution:25,sizeMeters:1400,reliefMeters:220}},vegetation:{density:.7,maxInstances:2500}});
const b=compileVegetationV16({v15:{terrain:{seed:'veg-evidence',resolution:25,sizeMeters:1400,reliefMeters:220}},vegetation:{density:.7,maxInstances:2500}});
assert.equal(a.readiness.internal100,true);assert.equal(a.readiness.production100,false);assert.ok(a.vegetation.instances.length>0);assert.ok(a.batches.batches.length>0);assert.equal(a.batches.gpuInstancingReady,true);
assert.deepEqual(a.vegetation.instances.slice(0,40),b.vegetation.instances.slice(0,40),'vegetation placement must replay deterministically');
assert.ok(new Set(a.vegetation.instances.map(v=>v.species)).size>=2);assert.equal(a.truth.realVegetationRendererVerified,false);assert.equal(a.truth.realDeviceForestPerformanceVerified,false);
console.log('Game World Vegetation V16: PASS',JSON.stringify({instances:a.vegetation.instances.length,batches:a.batches.batches.length,species:new Set(a.vegetation.instances.map(v=>v.species)).size}));
