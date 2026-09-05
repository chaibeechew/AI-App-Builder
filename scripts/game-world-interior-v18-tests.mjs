import assert from 'node:assert/strict';
import {compileInteriorV18} from '../lib/game/game-world-interior-v18.js';
const a=compileInteriorV18({seed:'interior-evidence',building:{id:'hospital',type:'commercial',widthMeters:38,depthMeters:28,floors:4,basements:1,style:'modern'}});
const b=compileInteriorV18({seed:'interior-evidence',building:{id:'hospital',type:'commercial',widthMeters:38,depthMeters:28,floors:4,basements:1,style:'modern'}});
assert.equal(a.readiness.internal100,true);assert.equal(a.readiness.production100,false);assert.equal(a.egress.valid,true);assert.ok(a.graph.nodes.length>10);assert.ok(a.graph.edges.length>10);assert.ok(a.furnishing.count>20);assert.ok(a.lighting.lightCount>10);assert.equal(a.nav.navGraphReady,true);assert.deepEqual(a.furnishing.items.slice(0,50),b.furnishing.items.slice(0,50),'furnishing must replay deterministically');assert.equal(a.truth.realInteriorRendererVerified,false);assert.equal(a.truth.realAccessibilityComplianceVerified,false);
console.log('Game World Interior V18: PASS',JSON.stringify({rooms:a.egress.checkedRooms,furniture:a.furnishing.count,lights:a.lighting.lightCount,navNodes:a.nav.nodes.length}));
