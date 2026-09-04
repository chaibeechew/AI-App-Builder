import assert from 'node:assert/strict';
import {buildCreativeReferenceGraph,isCreativeReferenceOpaqueAssetId} from '../lib/ai/creative-reference-graph.js';
import {buildCreativeSpatialControls} from '../lib/ai/creative-spatial-control.js';
import {resolveCreativeReferenceConflicts} from '../lib/ai/creative-reference-conflict-resolver.js';
import {scoreCreativeReferenceConsistency} from '../lib/ai/creative-reference-consistency-score.js';

const graph=buildCreativeReferenceGraph({references:[
  {assetId:'asset.identity.hero',role:'identity',subjectKind:'human',likenessConsent:true,priority:100,weight:1.4,lock:true,target:'subject'},
  {assetId:'asset.style.editorial',role:'style',subjectKind:'general',priority:60,weight:1,target:'global'},
  {assetId:'asset.pose.001',role:'pose',subjectKind:'human',priority:80,target:'subject'},
]});
assert.equal(graph.ok,true);
assert.equal(graph.referenceCount,3);
assert.equal(graph.opaqueAssetIdsOnly,true);
assert.equal(graph.roleIndex.identity.length,1);
assert.equal(isCreativeReferenceOpaqueAssetId('asset.good.001'),true);
assert.equal(isCreativeReferenceOpaqueAssetId('https://bad.example/ref.png'),false);
assert.equal(buildCreativeReferenceGraph({references:[{assetId:'asset.person.1',role:'identity',subjectKind:'human'}]}).code,'CREATIVE_REFERENCE_LIKENESS_CONSENT_REQUIRED');
assert.equal(buildCreativeReferenceGraph({references:[{assetId:'https://bad.example/a',role:'style'}]}).ok,false);

const spatial=buildCreativeSpatialControls({
  poseAssetId:'asset.pose.master',
  depthAssetId:'asset.depth.master',
  regions:[
    {regionId:'subject-face',label:'face',box:{x:0.2,y:0.1,width:0.3,height:0.35},maskAssetId:'asset.mask.face',preserve:true,strength:0.9,keypoints:[{name:'left-eye',x:0.3,y:0.2,confidence:0.99},{name:'right-eye',x:0.4,y:0.2,confidence:0.98}]},
    {regionId:'product',label:'phone',box:{x:0.55,y:0.35,width:0.3,height:0.45},segmentationAssetId:'asset.segment.product',prompt:'keep product geometry exact'}
  ]
});
assert.equal(spatial.ok,true);
assert.equal(spatial.coordinateSpace,'normalized-0-1');
assert.equal(spatial.keypointCount,2);
assert.equal(buildCreativeSpatialControls({regions:[{box:{x:0.8,y:0.8,width:0.4,height:0.4}}]}).ok,false);
assert.equal(buildCreativeSpatialControls({poseAssetId:'https://bad.example/pose'}).ok,false);

const poseRefs=buildCreativeReferenceGraph({references:[
  {assetId:'asset.pose.a',role:'pose',priority:90,weight:1,target:'subject'},
  {assetId:'asset.pose.b',role:'pose',priority:50,weight:1,target:'subject'},
]}).references;
assert.equal(resolveCreativeReferenceConflicts({references:poseRefs,policy:'fail-closed'}).ok,false);
const resolved=resolveCreativeReferenceConflicts({references:poseRefs,policy:'priority-first',dominanceMargin:20});
assert.equal(resolved.ok,true);
assert.equal(resolved.resolutions[0].references[0],'ref-001');

const styleRefs=buildCreativeReferenceGraph({references:[
  {assetId:'asset.style.a',role:'style',weight:3,target:'global'},
  {assetId:'asset.style.b',role:'style',weight:1,target:'global'},
]}).references;
const blended=resolveCreativeReferenceConflicts({references:styleRefs,policy:'weighted-blend'});
assert.equal(blended.ok,true);
assert.equal(blended.resolutions[0].mode,'weighted-blend');
assert.equal(blended.resolutions[0].references[0].normalizedWeight,0.666667);

const score=scoreCreativeReferenceConsistency({modality:'video',metrics:{styleSimilarity:0.94,compositionSimilarity:0.91,temporalConsistency:0.93,identitySimilarity:0.95,spatialIoU:0.9},requiredMetrics:['styleSimilarity','compositionSimilarity','temporalConsistency','identitySimilarity'],threshold:88});
assert.equal(score.ok,true);
assert.equal(score.pass,true);
assert.equal(score.liveQualityVerified,false);
assert.equal(score.measurementSourceRequired,true);
assert.equal(scoreCreativeReferenceConsistency({modality:'video',metrics:{styleSimilarity:0.95},requiredMetrics:['styleSimilarity','temporalConsistency']}).ok,false);

console.log('Creative Media Reference Intelligence 100 contract: PASS');
