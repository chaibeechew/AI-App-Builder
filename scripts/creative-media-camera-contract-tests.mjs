import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CINEMA_CAMERA_MOVES,
  buildCinemaCameraContract,
  normalizeCinemaCameraInput,
  buildCinemaCameraCapabilityRequirement,
  assessCinemaCameraEvidence,
} from '../lib/video/cinema-camera-engine.js';
import { buildVideoGenerationPayload, VideoGenerationGatewayError } from '../lib/video/generation-gateway.js';

assert.ok(CINEMA_CAMERA_MOVES.length>=50);
for(const move of ['dolly-in','crash-zoom-in','orbit-360','bullet-time','snorricam','fpv-orbit','drone-flyover','tracking-side','macro-slide'])assert.ok(CINEMA_CAMERA_MOVES.includes(move));

const camera=buildCinemaCameraContract({
  move:'orbit-left',shotSize:'close-up',angle:'low',lensMm:85,apertureF:1.4,depthOfField:'shallow',
  speed:'custom',speedPercent:42,stabilization:'gimbal',arcDegrees:180,subjectTracking:true,target:'hero subject',
  keyframes:[{at:0,lensMm:50,target:'hero subject'},{at:1,lensMm:85,rollDegrees:5,target:'hero subject'}],
});
assert.equal(camera.move,'orbit-left');assert.equal(camera.lensMm,85);assert.equal(camera.keyframes.length,2);assert.equal(camera.providerLiveVerified,false);assert.match(camera.cameraDigest,/^[0-9a-f]{64}$/);

const clamped=buildCinemaCameraContract({move:'dolly-in',lensMm:900,apertureF:0.1,panDegrees:999,tiltDegrees:-999,handheldIntensity:120});
assert.equal(clamped.lensMm,300);assert.equal(clamped.apertureF,0.7);assert.equal(clamped.panDegrees,360);assert.equal(clamped.tiltDegrees,-180);assert.equal(clamped.handheldIntensity,100);
assert.throws(()=>buildCinemaCameraContract({move:'teleport-camera'}),/CINEMA_CAMERA_MOVE_INVALID/);
assert.throws(()=>buildCinemaCameraContract({instruction:'https://private.example/shot'}),/CINEMA_CAMERA_PRIVATE_OR_URL_TEXT_NOT_ALLOWED/);
assert.throws(()=>buildCinemaCameraContract({keyframes:Array.from({length:13},(_,i)=>({at:i/12}))}),/CINEMA_CAMERA_KEYFRAME_LIMIT_EXCEEDED/);
assert.throws(()=>buildCinemaCameraContract({keyframes:[{at:0.8},{at:0.2}]}),/CINEMA_CAMERA_KEYFRAME_ORDER_INVALID/);

const legacy=normalizeCinemaCameraInput('dolly-in');assert.equal(legacy.move,'dolly-in');assert.equal(legacy.providerNeutral,true);
const instruction=normalizeCinemaCameraInput('Slow cinematic rise behind the subject');assert.equal(instruction.move,'static');assert.match(instruction.instruction,/Slow cinematic rise/);

const req=buildCinemaCameraCapabilityRequirement({
  move:'fpv-orbit',lensMm:24,apertureF:2.8,subjectTracking:true,keyframes:[{at:0},{at:1}],
});
for(const cap of ['camera-control','lens-control','focus-control','camera-keyframes','subject-tracking','advanced-camera-motion'])assert.ok(req.capabilities.includes(cap));
const providerReady=assessCinemaCameraEvidence({contract:camera,providerAdvertisedControls:req.capabilities,productionOutputVerified:false,cameraQualityPassed:false});
assert.equal(providerReady.providerReady,true);assert.equal(providerReady.liveVerified,false);
const live=assessCinemaCameraEvidence({contract:camera,providerAdvertisedControls:buildCinemaCameraCapabilityRequirement(camera).capabilities,productionOutputVerified:true,cameraQualityPassed:true});
assert.equal(live.liveVerified,true);assert.equal(live.realOutputQualityVerified,true);

const payload=buildVideoGenerationPayload({
  task:'video.generate',requestId:'camera:req:1',input:{prompt:'A cinematic city reveal',camera:{move:'dolly-in',lensMm:35,shotSize:'wide',stabilization:'gimbal',subjectTracking:true,target:'main tower'},durationSeconds:6}
});
assert.equal(typeof payload.input.camera,'object');assert.equal(payload.input.camera.move,'dolly-in');assert.equal(payload.input.camera.lensMm,35);
const cameraJson=JSON.stringify(payload.input.camera);assert.match(cameraJson,/"move":"dolly-in"/);assert.match(cameraJson,/"lensMm":35/);assert.doesNotMatch(cameraJson,/\[object Object\]/);
const legacyPayload=buildVideoGenerationPayload({task:'video.generate',requestId:'camera:req:2',input:{prompt:'Legacy camera string',camera:'pan-left'}});
assert.equal(legacyPayload.input.camera.move,'pan-left');
assert.throws(()=>buildVideoGenerationPayload({task:'video.generate',requestId:'camera:req:3',input:{prompt:'Invalid camera',camera:{move:'teleport'}}}),error=>error instanceof VideoGenerationGatewayError&&error.status===400&&error.code==='CINEMA_CAMERA_MOVE_INVALID');

const engine=fs.readFileSync('lib/video/cinema-camera-engine.js','utf8');
for(const forbidden of [/providerLiveVerified:true/,/realOutputCameraQualityVerified:true/,/https?:\/\/private/,/VIDEO_GENERATION_TOKEN/])assert.doesNotMatch(engine,forbidden);
const gateway=fs.readFileSync('lib/video/generation-gateway.js','utf8');
assert.match(gateway,/normalizeCinemaCameraInput/);assert.match(gateway,/camera:safeCamera\(input\.camera\)/);assert.doesNotMatch(gateway,/camera:clean\(input\.camera/);
console.log('Creative Media cinema camera contract tests passed.');
