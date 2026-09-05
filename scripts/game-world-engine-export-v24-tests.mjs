import assert from 'node:assert/strict';
import {buildEngineExportV24,evaluateExportEvidenceV24} from '../lib/game/game-world-engine-export-v24.js';
const x=buildEngineExportV24({seed:'export-v24',worldId:'export-evidence',worldSizeMeters:8000,city:{sizeMeters:720,blockMeters:120,maxBuildings:40}});assert.equal(x.readiness.internal100,true);assert.equal(x.artifacts.gltf.asset.version,'2.0');assert.match(x.artifacts.openusd,/^#usda 1\.0/);assert.match(x.artifacts.godot,/\[gd_scene format=3\]/);assert.equal(x.truth.realUnityImportVerified,false);assert.equal(evaluateExportEvidenceV24(x,{}).live100,false);
const all=Object.fromEntries(evaluateExportEvidenceV24(x,{}).required.map(k=>[k,true]));assert.equal(evaluateExportEvidenceV24(x,all).live100,true);
console.log('Game World Engine Export V24: PASS',JSON.stringify({gltfNodes:x.artifacts.gltf.nodes.length,usd:x.artifacts.openusd.length,godot:x.artifacts.godot.length,liveDefault:false}));
