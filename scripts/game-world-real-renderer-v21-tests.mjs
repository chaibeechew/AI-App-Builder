import assert from 'node:assert/strict';
import {buildRenderSceneV21,buildFramePlanV21,auditRendererV21} from '../lib/game/game-world-real-renderer-v21.js';
const scene=buildRenderSceneV21({seed:'renderer-v21',city:{sizeMeters:720,blockMeters:120,maxBuildings:48},quality:'balanced'});
const frame=buildFramePlanV21(scene,{camera:[0,80,150],time:1.25});
assert.equal(auditRendererV21(scene).internal100,true);assert.equal(scene.truth.hardwareGpuMeasured,false);assert.ok(frame.drawCalls>=1);assert.ok(scene.materials.water.transmission>0);assert.equal(auditRendererV21(scene).production100,false);
console.log('Game World Real Renderer V21: PASS',JSON.stringify({drawCalls:frame.drawCalls,buildings:scene.geometry.buildings.length,vegetation:scene.geometry.vegetation.length,renderScale:frame.renderScale}));
