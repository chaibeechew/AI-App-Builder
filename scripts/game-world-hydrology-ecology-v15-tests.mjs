import assert from 'node:assert/strict';
import {compileHydrologyEcologyV15} from '../lib/game/game-world-hydrology-ecology-v15.js';
const a=compileHydrologyEcologyV15({terrain:{seed:'hydro-evidence',resolution:25,sizeMeters:1800,reliefMeters:260},hydrology:{riverAccumulationThreshold:10}});
const b=compileHydrologyEcologyV15({terrain:{seed:'hydro-evidence',resolution:25,sizeMeters:1800,reliefMeters:260},hydrology:{riverAccumulationThreshold:10}});
assert.equal(a.readiness.internal100,true);assert.equal(a.readiness.production100,false);
assert.deepEqual(a.hydrology.rivers,b.hydrology.rivers,'hydrology replay must be deterministic');
assert.equal(a.hydrology.terrainDerived,true);assert.ok(a.hydrology.accumulation.some(v=>v>1));assert.ok(a.hydrology.rivers.length+a.hydrology.lakes.length>0);
for(const cell of a.ecology.cells.slice(0,120)){const sum=Object.values(cell.weights).reduce((x,y)=>x+y,0);assert.ok(Math.abs(sum-1)<.01);}
assert.equal(a.truth.realWaterRendererVerified,false);assert.equal(a.truth.realEcologyLongRunVerified,false);
console.log('Game World Hydrology Ecology V15: PASS',JSON.stringify({rivers:a.hydrology.rivers.length,lakes:a.hydrology.lakes.length,biomes:new Set(a.ecology.cells.map(c=>c.dominant)).size}));
