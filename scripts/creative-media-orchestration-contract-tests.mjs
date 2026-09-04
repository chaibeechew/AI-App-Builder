import assert from 'node:assert/strict';
import {compileCreativeMediaPrompt,isCreativeMediaOpaqueAssetId} from '../lib/ai/creative-media-prompt-compiler.js';
import {buildCreativeShotPlan,validateCreativeShotPlan} from '../lib/ai/creative-shot-director.js';
import {buildCreativeVariantMatrix} from '../lib/ai/creative-variant-matrix.js';
import {buildCreativeLongformAssembly} from '../lib/video/creative-longform-assembly.js';

const compiled=compileCreativeMediaPrompt({
  modality:'video',prompt:'Launch a premium property app',negativePrompt:'watermarks',goal:'30 second launch film',camera:'slow dolly in',motion:'controlled parallax',references:[{assetId:'asset.hero.001',role:'brand',weight:1.2}],durationSeconds:30,aspectRatio:'16:9'
});
assert.equal(compiled.ok,true);
assert.equal(compiled.providerNeutral,true);
assert.equal(compiled.references[0].assetId,'asset.hero.001');
assert.match(compiled.compiledPrompt,/camera: slow dolly in/);
assert.equal(compileCreativeMediaPrompt({prompt:'x',references:['https://example.com/a.png']}).ok,false);
assert.equal(isCreativeMediaOpaqueAssetId('asset-123'),true);
assert.equal(isCreativeMediaOpaqueAssetId('https://example.com/a'),false);

const plan=buildCreativeShotPlan({goal:'Show the product journey',durationSeconds:18,shotCount:6,identityLocks:['identity.hero.001'],productLocks:['product.app.001'],styleLock:'cinematic glass',continuityStrength:0.9});
assert.equal(plan.ok,true);
assert.equal(plan.shotCount,6);
assert.equal(plan.durationSeconds,18);
assert.equal(plan.shots.every(s=>s.durableAssetRequired&&s.qualityGateRequired),true);
assert.deepEqual(validateCreativeShotPlan(plan),{ok:true,durationSeconds:18,shotCount:6});
assert.equal(buildCreativeShotPlan({goal:'x',shotCount:61,durationSeconds:100}).ok,false);
assert.equal(buildCreativeShotPlan({goal:'x',identityLocks:['https://bad.example/id']}).ok,false);

const matrix=buildCreativeVariantMatrix({basePrompt:'Luxury launch hero',seeds:[1,2],styles:['cinematic','editorial'],aspectRatios:['16:9','9:16'],locales:['en','zh'],channels:['web','social'],maxVariants:10,costMode:'zero',premiumAllowed:true});
assert.equal(matrix.ok,true);
assert.equal(matrix.variantCount,10);
assert.equal(matrix.truncated,true);
assert.equal(matrix.variants.every(v=>v.premiumAllowed===false),true);
assert.equal(new Set(matrix.variants.map(v=>v.variantId)).size,matrix.variantCount);

const assembly=buildCreativeLongformAssembly({shots:[
  {shotId:'shot-001',assetId:'asset.video.001',durationSeconds:4,transition:'cut'},
  {shotId:'shot-002',assetId:'asset.video.002',durationSeconds:5,transition:'dissolve',transitionSeconds:0.5},
  {shotId:'shot-003',assetId:'asset.video.003',durationSeconds:3,transition:'fade',transitionSeconds:0.25},
],audioTrackId:'asset.audio.master',captionTrackId:'asset.caption.en',resolution:'2160p',fps:60});
assert.equal(assembly.ok,true);
assert.equal(assembly.renderTask,'video.timeline-render');
assert.equal(assembly.shotCount,3);
assert.equal(assembly.durationSeconds,11.25);
assert.equal(assembly.masteringRequired,true);
assert.equal(assembly.reopenVerificationRequired,true);
assert.equal(buildCreativeLongformAssembly({shots:[{assetId:'https://bad.example/video.mp4',durationSeconds:3}]}).ok,false);

console.log('Creative Media Orchestration 100 contract: PASS');
