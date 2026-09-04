import assert from 'node:assert/strict';
import {buildCreativeMotionMap} from '../lib/ai/creative-motion-map.js';
import {buildCreativeTemporalKeyframes} from '../lib/video/creative-temporal-keyframes.js';
import {buildCreativeMotionChoreography} from '../lib/video/creative-motion-choreography.js';
import {scoreCreativeMotionConsistency} from '../lib/ai/creative-motion-consistency-score.js';

const map=buildCreativeMotionMap({
  durationSeconds:8,
  regions:[
    {subjectId:'hero',mode:'follow-path',maskAssetId:'asset.mask.hero',trackingAssetId:'asset.track.hero',path:[{x:0.2,y:0.7},{x:0.5,y:0.5},{x:0.8,y:0.3}],speed:1.2,strength:0.9,preserveIdentity:true},
    {subjectId:'product',mode:'translate',box:{x:0.6,y:0.45,width:0.25,height:0.3},direction:{x:-0.2,y:0},speed:0.5,preserveGeometry:true}
  ]
});
assert.equal(map.ok,true);
assert.equal(map.regionCount,2);
assert.equal(map.totalPathPoints,3);
assert.equal(map.cameraMotionIncluded,false);
assert.equal(map.providerNativeSupportVerified,false);
assert.equal(buildCreativeMotionMap({durationSeconds:4,regions:[{subjectId:'x',mode:'follow-path',path:[{x:0.2,y:0.2}]}]}).ok,false);
assert.equal(buildCreativeMotionMap({durationSeconds:4,regions:[{subjectId:'x',mode:'translate',maskAssetId:'https://bad.example/mask.png'}]}).ok,false);
assert.equal(buildCreativeMotionMap({durationSeconds:4,regions:[{subjectId:'x',mode:'translate',box:{x:0.9,y:0.9,width:0.2,height:0.2}}]}).ok,false);

const keyframes=buildCreativeTemporalKeyframes({
  durationSeconds:6,
  keyframes:[
    {subjectId:'hero',timeSeconds:0,easing:'ease-in-out',properties:{x:0.2,y:0.6,scale:1}},
    {subjectId:'hero',timeSeconds:3,easing:'ease-out',properties:{x:0.5,y:0.4,scale:1.1,motionStrength:0.8}},
    {subjectId:'hero',timeSeconds:6,easing:'hold',properties:{x:0.8,y:0.35,scale:1.05}},
    {subjectId:'product',timeSeconds:0,easing:'linear',properties:{rotationDegrees:0}},
    {subjectId:'product',timeSeconds:6,easing:'ease-in-out',properties:{rotationDegrees:180}}
  ]
});
assert.equal(keyframes.ok,true);
assert.equal(keyframes.subjectIds.length,2);
assert.equal(keyframes.cameraPropertiesAllowed,false);
assert.equal(buildCreativeTemporalKeyframes({durationSeconds:3,keyframes:[{subjectId:'x',timeSeconds:1,properties:{x:0.5}}]}).ok,false);
assert.equal(buildCreativeTemporalKeyframes({durationSeconds:3,keyframes:[{subjectId:'x',timeSeconds:1,properties:{x:0.5}},{subjectId:'x',timeSeconds:1,properties:{x:0.6}}]}).code,'CREATIVE_TEMPORAL_DUPLICATE_KEYFRAME');

const choreography=buildCreativeMotionChoreography({
  durationSeconds:10,
  loopMode:'seamless',
  minimumSubjectSeparation:0.05,
  subjects:[
    {subjectId:'hero',referenceAssetId:'asset.identity.hero',trackingAssetId:'asset.track.hero',priority:90,windows:[
      {startSeconds:0,endSeconds:4,action:'walk toward product'},
      {startSeconds:4,endSeconds:7,action:'hold product',targetSubjectId:'product',preserveIdentity:true}
    ]},
    {subjectId:'product',referenceAssetId:'asset.product.phone',priority:100,windows:[
      {startSeconds:0,endSeconds:4,action:'remain stable',freeze:true},
      {startSeconds:4,endSeconds:10,action:'follow hero hand',targetSubjectId:'hero'}
    ]}
  ]
});
assert.equal(choreography.ok,true);
assert.equal(choreography.subjectCount,2);
assert.equal(choreography.constraints.loopBoundaryContinuityRequired,true);
assert.equal(choreography.cameraMotionIncluded,false);
assert.equal(buildCreativeMotionChoreography({durationSeconds:4,subjects:[{subjectId:'hero',referenceAssetId:'https://bad.example/ref.png'}]}).ok,false);
assert.equal(buildCreativeMotionChoreography({durationSeconds:4,subjects:[{subjectId:'hero',windows:[{startSeconds:0,endSeconds:2,targetSubjectId:'missing'}]}]}).ok,false);

const scored=scoreCreativeMotionConsistency({
  metrics:{trajectoryAdherence:0.94,temporalSmoothness:0.92,motionIntentAdherence:0.95,subjectIdentityStability:0.93,backgroundStability:0.9,loopBoundaryContinuity:0.91},
  threshold:88
});
assert.equal(scored.ok,true);
assert.equal(scored.pass,true);
assert.equal(scored.liveQualityVerified,false);
assert.equal(scored.providerNativeControlVerified,false);
assert.equal(scoreCreativeMotionConsistency({metrics:{trajectoryAdherence:0.9},requiredMetrics:['trajectoryAdherence','temporalSmoothness']}).ok,false);

console.log('Creative Media Motion & Temporal Control 100 contract: PASS');
