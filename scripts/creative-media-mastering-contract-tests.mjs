import assert from 'node:assert/strict';
import { getCreativeDeliveryPreset, resolveCreativeDeliveryPreset, listCreativeDeliveryPresets } from '../lib/ai/creative-media-delivery-presets.js';
import { buildCreativeMediaMasteringPlan } from '../lib/ai/creative-media-mastering-engine.js';
import { buildCaptionTrack, buildMediaAccessibilityPlan } from '../lib/ai/creative-caption-accessibility.js';
import { assessCreativeMediaDelivery } from '../lib/ai/creative-media-delivery-qc.js';

assert.ok(listCreativeDeliveryPresets().length>=10);
const social=getCreativeDeliveryPreset('social.vertical');
assert.equal(social.aspectRatio,'9:16');
assert.equal(social.externalRequirementVerified,false);
const resolved=resolveCreativeDeliveryPreset({id:'social.vertical',overrides:{maxDurationSeconds:45}});
assert.equal(resolved.ok,true);assert.equal(resolved.preset.maxDurationSeconds,45);assert.equal(resolved.truth.platformCertification,false);

const rawUrl=buildCreativeMediaMasteringPlan({sourceAsset:'https://example.com/private.mp4',modality:'video'});
assert.equal(rawUrl.ok,false);assert.equal(rawUrl.code,'CREATIVE_MASTER_SOURCE_REQUIRED');

const hdrBad=buildCreativeMediaMasteringPlan({sourceAsset:'video.asset.1',modality:'video',output:{hdrMode:'hdr10',videoCodec:'h264',bitDepth:10}});
assert.equal(hdrBad.ok,false);assert.equal(hdrBad.code,'CREATIVE_MASTER_HDR_CODEC_UNSUPPORTED');
const alphaBad=buildCreativeMediaMasteringPlan({sourceAsset:'video.asset.1',modality:'video',output:{alpha:true,container:'mp4',videoCodec:'h264'}});
assert.equal(alphaBad.ok,false);assert.equal(alphaBad.code,'CREATIVE_MASTER_ALPHA_COMBINATION_UNSUPPORTED');

const master=buildCreativeMediaMasteringPlan({sourceAsset:'video.asset.1',modality:'video',presetId:'game.cinematic',output:{container:'mp4',videoCodec:'hevc',audioCodec:'aac',resolution:'2160p',fps:60,hdrMode:'hdr10',bitDepth:10,colorSpace:'rec2020',transfer:'pq',videoBitrateMbps:45}});
assert.equal(master.ok,true);assert.equal(master.output.hdrMode,'hdr10');assert.equal(master.output.bitDepth,10);assert.equal(master.truth.productionVerified,false);assert.equal(master.provenancePreservationRequired,true);

const image=buildCreativeMediaMasteringPlan({sourceAsset:'image.asset.1',modality:'image',presetId:'web.hero-image',output:{format:'avif',width:1920,height:1080,quality:88}});
assert.equal(image.ok,true);assert.equal(image.output.stripPrivateMetadata,true);
const audio=buildCreativeMediaMasteringPlan({sourceAsset:'audio.asset.1',modality:'audio',output:{format:'wav',codec:'pcm',sampleRate:48000,channels:2,targetLufs:-14}});
assert.equal(audio.ok,true);assert.equal(audio.output.normalizeLoudness,true);

const track=buildCaptionTrack({language:'en-US',format:'vtt',sdh:true,cues:[{startMs:0,endMs:1800,text:'Welcome to LANERIQ AI.'},{startMs:1900,endMs:3600,text:'Build, create, and publish.'}]});
assert.equal(track.ok,true);assert.equal(track.quality.overlapValidated,true);
const overlap=buildCaptionTrack({cues:[{startMs:0,endMs:1000,text:'A'},{startMs:900,endMs:1500,text:'B'}]});
assert.equal(overlap.ok,false);assert.equal(overlap.code,'CREATIVE_CAPTION_OVERLAP_INVALID');
const access=buildMediaAccessibilityPlan({mediaAssetId:'video.asset.1',captionTracks:[track],audioDescriptionTrack:'audio.desc.1',transcriptAssetId:'text.transcript.1'});
assert.equal(access.ok,true);assert.equal(access.accessibility.captions,true);assert.equal(access.accessibility.audioDescription,true);assert.equal(access.truth.accessibilityComplianceCertified,false);

const sha='a'.repeat(64);
const qc=assessCreativeMediaDelivery({artifact:{valid:true,modality:'video',bytes:50000000,sha256:sha,durationSeconds:60,width:1080,height:1920,fps:30,container:'mp4',videoCodec:'h264',audioDriftMs:20,truePeakDbfs:-1},masteringPlan:buildCreativeMediaMasteringPlan({sourceAsset:'video.asset.2',modality:'video',presetId:'social.vertical'}),presetId:'social.vertical',evidence:{safetyPassed:true,provenanceVerified:true,outputValidated:true,ownerValidated:true,productionShaVerified:false,runtimeVerified:false}});
assert.equal(qc.pass,true);assert.equal(qc.productionEligible,false);assert.ok(qc.warnings.includes('platform-requirement-reverification-required'));
const failed=assessCreativeMediaDelivery({artifact:{valid:true,modality:'video',bytes:150000000,sha256:sha,durationSeconds:90,width:1080,height:1920,fps:30,container:'mp4',videoCodec:'h264'},masteringPlan:buildCreativeMediaMasteringPlan({sourceAsset:'video.asset.3',modality:'video',presetId:'social.vertical'}),presetId:'social.vertical',evidence:{safetyPassed:true,provenanceVerified:true,outputValidated:true,ownerValidated:true}});
assert.equal(failed.pass,false);assert.ok(failed.violations.includes('preset-duration-exceeded'));assert.ok(failed.violations.includes('preset-file-size-exceeded'));

console.log('Creative Media Delivery & Mastering 100 contracts passed.');
