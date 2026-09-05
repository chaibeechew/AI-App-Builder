import assert from 'node:assert/strict';
import {compileArchitectureV17} from '../lib/game/game-world-architecture-v17.js';
const a=compileArchitectureV17({seed:'architecture-evidence',building:{id:'cyber-mall',type:'commercial',widthMeters:42,depthMeters:30,floors:5,basements:2,style:'neo-cyber'}});
const b=compileArchitectureV17({seed:'architecture-evidence',building:{id:'cyber-mall',type:'commercial',widthMeters:42,depthMeters:30,floors:5,basements:2,style:'neo-cyber'}});
assert.equal(a.readiness.internal100,true);assert.equal(a.readiness.production100,false);assert.equal(a.envelope.floors,5);assert.equal(a.envelope.basements,2);assert.ok(a.structure.columns.length>10);assert.ok(a.floorPlans.roomCount>10);assert.ok(a.surfaces.doors.length>0);assert.ok(a.surfaces.windows.length>0);assert.ok(a.surfaces.roofs.length===1);assert.ok(a.destruction.nodes.length>0);
assert.deepEqual(a.floorPlans,b.floorPlans,'floorplan must replay deterministically');assert.equal(a.truth.realArchitecturalMeshRendererVerified,false);assert.equal(a.truth.realBuildingCodeComplianceVerified,false);
console.log('Game World Architecture V17: PASS',JSON.stringify({rooms:a.floorPlans.roomCount,columns:a.structure.columns.length,doors:a.surfaces.doors.length,windows:a.surfaces.windows.length}));
